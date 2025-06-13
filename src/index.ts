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
  "process.env.SEARCH_LIMIT_DEFAULT",
  process.env.SEARCH_LIMIT_DEFAULT
);

const searchLimitDefault = parseInt(process.env.SEARCH_LIMIT_DEFAULT || "10");

console.log("searchLimitDefault", searchLimitDefault);

// Get all Unreal Engine documentation links with optional search
server.tool(
  "search_docs_list",
  "查询并返回虚幻引擎官方文档链接列表，使用语义搜索技术",
  {
    search: z
      .string()
      .describe("搜索关键字，将使用向量语义搜索技术返回最相关的结果"),
    limit: z
      .number()
      .optional()
      .default(searchLimitDefault)
      .describe("返回结果的最大数量"),
  },
  {
    readOnlyHint: true,
    openWorldHint: false,
  },
  async (args) => {
    try {
      let filteredLinks = enhancedDocLinks;
      let searchMethod = "no_search"; // 默认无搜索
      let errorMessage = null;

      // 如果提供了搜索关键字
      if (args.search) {
        const searchTerm = args.search;
        console.log(`🔍 执行语义搜索: "${searchTerm}"`);

        // 检查向量搜索是否可用
        try {
          const isVectorAvailable = await vectorSearch.isAvailable();

          if (isVectorAvailable) {
            console.log(`🤖 执行向量语义搜索...`);
            const vectorSearchResults = await vectorSearch.search(
              searchTerm,
              args.limit
            );

            filteredLinks = vectorSearchResults.map((result) => ({
              navTitle: result.navTitle,
              link: result.link,
              pageTitle: result.pageTitle,
              pageDescription: result.pageDescription,
            }));

            console.log(`✅ 向量搜索找到 ${filteredLinks.length} 个结果`);
            searchMethod = "semantic_search";
          } else {
            console.log("⚠️ 向量搜索不可用，返回空结果");
            filteredLinks = [];
            searchMethod = "semantic_search_unavailable";
            errorMessage = "向量搜索服务不可用，请检查 Ollama 服务是否运行或向量数据库是否存在";
          }
        } catch (searchError) {
          console.log("⚠️ 向量搜索失败:", searchError);
          filteredLinks = [];
          searchMethod = "semantic_search_failed";
          errorMessage = `向量搜索失败: ${searchError instanceof Error ? searchError.message : String(searchError)}`;
        }
      } else {
        // 如果没有搜索关键字，返回所有结果（应用限制）
        if (args.limit) {
          filteredLinks = enhancedDocLinks.slice(0, args.limit);
        }
        searchMethod = "no_search";
      }

      // 构建返回结果，包含所有字段
      let vectorSearchAvailable = false;
      try {
        vectorSearchAvailable = await vectorSearch.isAvailable();
      } catch (availabilityError) {
        console.log("⚠️ 检查向量搜索可用性失败:", availabilityError);
      }

      const result = {
        total: enhancedDocLinks.length,
        search: args.search || null,
        searchMethod,
        limit: args.limit,
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
        search: args.search || null,
        searchMethod: "error",
        limit: args.limit,
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
