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
  searchSource: 'keyword' | 'semantic'; // 搜索来源类型
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
  "process.env.MAX_KEYWORD_RESULTS",
  process.env.MAX_KEYWORD_RESULTS
);
console.log(
  "process.env.MAX_SEMANTIC_RESULTS",
  process.env.MAX_SEMANTIC_RESULTS
);

const maxKeywordResults = parseInt(
  process.env.MAX_KEYWORD_RESULTS || "10"
);
const maxSemanticResults = parseInt(
  process.env.MAX_SEMANTIC_RESULTS || "10"
);

console.log("maxKeywordResults", maxKeywordResults);
console.log("maxSemanticResults", maxSemanticResults);

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
      .describe(
        "语义搜索关键字对象，包含英文和中文，将使用向量语义搜索技术返回最相关的结果"
      ),
    keyword: z
      .array(
        z.object({
          en: z.string().describe("英文精确匹配关键词"),
          cn: z.string().describe("中文精确匹配关键词"),
        })
      )
      .describe(
        "精确匹配关键词数组，每个元素包含英文和中文关键词，将通过文本小写比对进行精确匹配，只要匹配上其中一个关键词即返回结果，前面的关键词匹配结果排在最前面，返回结果排序优先级高于语义搜索"
      ),
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

      // 关键词精确匹配 (支持多个关键词，按优先级排序)
      console.log(
        `🔍 执行关键词精确匹配: ${args.keyword.length} 个关键词组`
      );
      args.keyword.forEach((kw, index) => {
        console.log(`  ${index + 1}. "${kw.en}" + "${kw.cn}"`);
      });

      // 为每个关键词组分别查找匹配结果，并记录优先级
      const keywordResultsWithPriority: Array<EnhancedLink & { priority: number }> = [];
      
      args.keyword.forEach((keywordGroup, keywordIndex) => {
        const keywordTerm = keywordGroup.en.toLowerCase();
        const keywordCnTerm = keywordGroup.cn.toLowerCase();
        
        const matchedLinks = enhancedDocLinks.filter((link) => {
          const searchFields = [
            link.navTitle?.toLowerCase() || "",
            link.pageTitle?.toLowerCase() || "",
            link.pageDescription?.toLowerCase() || "",
          ];
          
          return searchFields.some(
            (field) =>
              field.includes(keywordTerm) || field.includes(keywordCnTerm)
          );
        });
        
        // 将匹配结果添加到总结果中，并标记优先级
        matchedLinks.forEach((link) => {
          keywordResultsWithPriority.push({
            ...link,
            searchSource: 'keyword' as const,
            priority: keywordIndex, // 关键词在数组中的索引作为优先级
          });
        });
        
        console.log(`  关键词组 ${keywordIndex + 1} ("${keywordGroup.en}" + "${keywordGroup.cn}") 匹配到 ${matchedLinks.length} 个结果`);
      });
      
      // 去重（按 link 去重，保留优先级最高的）
      const linkMap = new Map<string, EnhancedLink & { priority: number }>();
      keywordResultsWithPriority.forEach((result) => {
        const existingResult = linkMap.get(result.link);
        if (!existingResult || result.priority < existingResult.priority) {
          linkMap.set(result.link, result);
        }
      });
      
      // 按优先级排序，然后应用最大结果数限制
      keywordResults = Array.from(linkMap.values())
        .sort((a, b) => a.priority - b.priority) // 优先级低的数字排在前面
        .map(({ priority, ...link }) => link) // 移除临时的 priority 字段
        .slice(0, maxKeywordResults);

      console.log(`✅ 关键词匹配找到 ${keywordResults.length} 个结果`);

      // 语义搜索 (英文+中文合并)
      const combinedSearchTerm = `${args.search.cn} ${args.search.en}`;
      console.log(
        `🔍 执行语义搜索: "${args.search.cn}" + "${args.search.en}" -> "${combinedSearchTerm}"`
      );

      // 检查向量搜索是否可用
      try {
        const isVectorAvailable = await vectorSearch.isAvailable();

        if (isVectorAvailable) {
          console.log(`🤖 执行向量语义搜索...`);
          const vectorSearchResults = await vectorSearch.search(
            combinedSearchTerm,
            maxSemanticResults
          );

          semanticResults = vectorSearchResults.map((result) => ({
            navTitle: result.navTitle,
            link: result.link,
            pageTitle: result.pageTitle,
            pageDescription: result.pageDescription,
            searchSource: 'semantic' as const,
          }));

          console.log(`✅ 向量搜索找到 ${semanticResults.length} 个结果`);
          searchMethod = "hybrid_search";
        } else {
          console.log("⚠️ 向量搜索不可用");
          searchMethod = "hybrid_search_partial";
          errorMessage =
            "向量搜索服务不可用，请检查 Ollama 服务是否运行或向量数据库是否存在";
        }
      } catch (searchError) {
        console.log("⚠️ 向量搜索失败:", searchError);
        searchMethod = "hybrid_search_partial";
        errorMessage = `向量搜索失败: ${
          searchError instanceof Error
            ? searchError.message
            : String(searchError)
        }`;
      }

      // 合并结果并去重（以link为准）
      const linkSet = new Set<string>();
      let filteredLinks: EnhancedLink[] = [];

      // 先添加关键词匹配结果（优先级更高）
      keywordResults.forEach((link) => {
        if (!linkSet.has(link.link)) {
          linkSet.add(link.link);
          filteredLinks.push(link);
        }
      });

      // 再添加语义搜索结果
      semanticResults.forEach((link) => {
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
        maxKeywordResults: maxKeywordResults,
        maxSemanticResults: maxSemanticResults,
        keywordResultCount: keywordResults.length,
        semanticResultCount: semanticResults.length,
        vectorSearchAvailable,
        error: errorMessage,
        links: filteredLinks.map((link) => ({
          navTitle: link.navTitle, // 导航标题
          pageTitle: link.pageTitle || "", // 页面标题
          pageDescription: link.pageDescription || "", // 页面描述
          link: link.link,
          searchSource: link.searchSource, // 搜索来源类型
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
        maxKeywordResults: maxKeywordResults,
        maxSemanticResults: maxSemanticResults,
        keywordResultCount: 0,
        semanticResultCount: 0,
        vectorSearchAvailable: false,
        error: `搜索执行失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
