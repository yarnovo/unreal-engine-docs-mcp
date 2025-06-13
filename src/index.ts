#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getVectorSearchEngine } from "./vector-search.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 定义增强后的链接数据结构
interface EnhancedLink {
  navTitle: string; // 原始导航标题
  link: string;
  pageTitle?: string; // 页面标题
  pageDescription?: string; // 页面描述
}

// Load package.json to get version
let packageVersion = "1.0.0"; // fallback version
try {
  const packagePath = join(__dirname, "..", "..", "package.json");
  const packageData = JSON.parse(readFileSync(packagePath, "utf-8"));
  packageVersion = packageData.version;
} catch (error) {
  console.warn(
    "Could not load package version:",
    error instanceof Error ? error.message : String(error)
  );
}

// Load enhanced documentation data
let enhancedDocLinks: EnhancedLink[] = [];

console.log(`当前版本号：${packageVersion}`);

try {
  // 直接读取已合并的增强链接数据
  console.log("📋 加载增强文档链接数据...");
  const enhancedListPath = join(
    __dirname,
    "..",
    "..",
    "sources",
    "enhanced-list.json"
  );
  const enhancedData = JSON.parse(readFileSync(enhancedListPath, "utf-8"));
  enhancedDocLinks = enhancedData.links || [];

  console.log(`✅ 成功加载 ${enhancedDocLinks.length} 个文档链接`);
  console.log(
    `📊 其中 ${
      enhancedDocLinks.filter((link) => link.pageTitle).length
    } 个有页面标题`
  );
  console.log(
    `📊 其中 ${
      enhancedDocLinks.filter((link) => link.pageDescription).length
    } 个有页面描述`
  );
} catch (error) {
  console.error(
    "加载增强文档数据失败:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
}

const server = new McpServer({
  name: "unreal-engine-docs-mcp",
  version: packageVersion,
});

// 初始化向量搜索引擎
const vectorSearch = getVectorSearchEngine();

console.log(
  "process.env.SEMANTIC_SEARCH_LIMIT_DEFAULT",
  process.env.SEMANTIC_SEARCH_LIMIT_DEFAULT
);
console.log(
  "process.env.KEYWORD_SEARCH_LIMIT_DEFAULT", 
  process.env.KEYWORD_SEARCH_LIMIT_DEFAULT
);

const semanticSearchLimitDefault = parseInt(process.env.SEMANTIC_SEARCH_LIMIT_DEFAULT || "5");
const keywordSearchLimitDefault = parseInt(process.env.KEYWORD_SEARCH_LIMIT_DEFAULT || "5");

console.log("semanticSearchLimitDefault", semanticSearchLimitDefault);
console.log("keywordSearchLimitDefault", keywordSearchLimitDefault);

// Get all Unreal Engine documentation links with optional search
server.tool(
  "search_docs_list",
  "查询并返回虚幻引擎官方文档链接列表，支持语义搜索和关键词精确匹配的混合搜索",
  {
    search: z
      .object({
        en: z.string().describe("英文语义搜索关键字"),
        cn: z.string().describe("中文语义搜索关键字"),
      })
      .describe("语义搜索关键字对象，包含英文和中文，将使用向量语义搜索技术返回最相关的结果"),
    keyword: z
      .object({
        en: z.string().describe("英文精确匹配关键词"),
        cn: z.string().describe("中文精确匹配关键词"),
      })
      .describe("精确匹配关键词对象，包含英文和中文，将通过文本小写比对进行精确匹配，返回结果排序优先级高于语义搜索"),
    semanticLimit: z
      .number()
      .optional()
      .default(semanticSearchLimitDefault)
      .describe("语义搜索返回结果的最大数量"),
    keywordLimit: z
      .number()
      .optional()
      .default(keywordSearchLimitDefault)
      .describe("关键词精确匹配返回结果的最大数量"),
  },
  {
    readOnlyHint: true,
    openWorldHint: false,
  },
  async (args) => {
    try {
      let keywordResults: EnhancedLink[] = [];
      let semanticResults: EnhancedLink[] = [];
      let searchMethod = "no_search"; // 默认无搜索
      let errorMessage = null;

      // 关键词精确匹配 (英文+中文)
      const keywordTerm = args.keyword.en.toLowerCase();
      const keywordCnTerm = args.keyword.cn.toLowerCase();
      console.log(`🔍 执行关键词精确匹配: "${keywordTerm}" + "${keywordCnTerm}"`);
      
      keywordResults = enhancedDocLinks.filter((link) => {
        const searchFields = [
          link.navTitle?.toLowerCase() || "",
          link.pageTitle?.toLowerCase() || "",
          link.pageDescription?.toLowerCase() || "",
        ];
        // 同时匹配英文关键词和中文关键词
        return searchFields.some(field => 
          field.includes(keywordTerm) || field.includes(keywordCnTerm)
        );
      }).slice(0, args.keywordLimit);
      
      console.log(`✅ 关键词匹配找到 ${keywordResults.length} 个结果`);

      // 语义搜索 (英文+中文合并)
      const combinedSearchTerm = `${args.search.cn} ${args.search.en}`;
      console.log(`🔍 执行语义搜索: "${args.search.cn}" + "${args.search.en}" -> "${combinedSearchTerm}"`);

      // 检查向量搜索是否可用
      try {
        const isVectorAvailable = await vectorSearch.isAvailable();

        if (isVectorAvailable) {
          console.log(`🤖 执行向量语义搜索...`);
          const vectorSearchResults = await vectorSearch.search(
            combinedSearchTerm,
            args.semanticLimit
          );

          semanticResults = vectorSearchResults.map((result) => ({
            navTitle: result.navTitle,
            link: result.link,
            pageTitle: result.pageTitle,
            pageDescription: result.pageDescription,
          }));

          console.log(`✅ 向量搜索找到 ${semanticResults.length} 个结果`);
          searchMethod = "hybrid_search";
        } else {
          console.log("⚠️ 向量搜索不可用");
          searchMethod = "hybrid_search_partial";
          errorMessage = "向量搜索服务不可用，请检查 Ollama 服务是否运行或向量数据库是否存在";
        }
      } catch (searchError) {
        console.log("⚠️ 向量搜索失败:", searchError);
        searchMethod = "hybrid_search_partial";
        errorMessage = `向量搜索失败: ${searchError instanceof Error ? searchError.message : String(searchError)}`;
      }

      // 合并结果并去重（以link为准）
      const linkSet = new Set<string>();
      let filteredLinks: EnhancedLink[] = [];
      
      // 先添加关键词匹配结果（优先级更高）
      keywordResults.forEach(link => {
        if (!linkSet.has(link.link)) {
          linkSet.add(link.link);
          filteredLinks.push(link);
        }
      });
      
      // 再添加语义搜索结果
      semanticResults.forEach(link => {
        if (!linkSet.has(link.link)) {
          linkSet.add(link.link);
          filteredLinks.push(link);
        }
      });

      // 构建返回结果，包含所有字段
      let vectorSearchAvailable = false;
      try {
        vectorSearchAvailable = await vectorSearch.isAvailable();
      } catch (availabilityError) {
        console.log("⚠️ 检查向量搜索可用性失败:", availabilityError);
      }

      const result = {
        total: enhancedDocLinks.length,
        search: args.search,
        keyword: args.keyword,
        combinedSearchTerm: combinedSearchTerm,
        searchMethod,
        semanticLimit: args.semanticLimit,
        keywordLimit: args.keywordLimit,
        keywordResultCount: keywordResults.length,
        semanticResultCount: semanticResults.length,
        vectorSearchAvailable,
        error: errorMessage,
        links: filteredLinks.map((link) => ({
          navTitle: link.navTitle, // 导航标题
          pageTitle: link.pageTitle || "", // 页面标题
          pageDescription: link.pageDescription || "", // 页面描述
          link: link.link,
        })),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      // 全局错误处理，确保返回一致的数据结构
      console.error("❌ 搜索工具执行失败:", error);
      
      const errorResult = {
        total: enhancedDocLinks.length,
        search: args.search,
        keyword: args.keyword,
        combinedSearchTerm: `${args.search.cn} ${args.search.en}`,
        searchMethod: "error",
        semanticLimit: args.semanticLimit,
        keywordLimit: args.keywordLimit,
        keywordResultCount: 0,
        semanticResultCount: 0,
        vectorSearchAvailable: false,
        error: `搜索执行失败: ${error instanceof Error ? error.message : String(error)}`,
        links: [],
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(errorResult, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

// Create stdio transport
const transport = new StdioServerTransport();

// Connect server to stdio transport
server.connect(transport);
