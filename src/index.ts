#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 定义增强后的链接数据结构
interface EnhancedLink {
  title: string; // 原始导航标题 (navTitle)
  link: string;
  pageTitle?: string; // 页面标题
  pageDescription?: string; // 页面描述
}

// Load package.json to get version
let packageVersion = "1.0.0"; // fallback version
try {
  const packagePath = join(__dirname, "..", "package.json");
  const packageData = JSON.parse(readFileSync(packagePath, "utf-8"));
  packageVersion = packageData.version;
} catch (error) {
  console.warn(
    "Could not load package version:",
    error instanceof Error ? error.message : String(error)
  );
}

// Load and merge documentation data
let enhancedDocLinks: EnhancedLink[] = [];

console.log(`当前版本号：${packageVersion}`);

try {
  // 首先读取 list.json 到内存
  console.log("📋 加载文档链接列表...");
  const sourcesPath = join(__dirname, "..", "sources", "list.json");
  const listData = JSON.parse(readFileSync(sourcesPath, "utf-8"));
  const baseLinks = listData.links || [];

  // 读取 descriptions.json
  console.log("📄 加载页面描述数据...");
  const descriptionsPath = join(
    __dirname,
    "..",
    "sources",
    "descriptions.json"
  );
  let pageData: Record<string, { title: string; description: string }> = {};

  try {
    const descriptionsData = JSON.parse(
      readFileSync(descriptionsPath, "utf-8")
    );
    pageData = descriptionsData.pages || {};
  } catch (descError) {
    console.warn(
      "无法加载页面描述数据，将使用基础链接数据:",
      descError instanceof Error ? descError.message : String(descError)
    );
  }

  // 合并数据：将 pageData 中的数据根据 URL 合并到 baseLinks 中
  console.log("🔗 合并链接和页面数据...");
  enhancedDocLinks = baseLinks.map((link: { title: string; link: string }) => {
    const pageInfo = pageData[link.link];
    const enhancedLink: EnhancedLink = {
      title: link.title, // navTitle
      link: link.link,
      pageTitle: pageInfo?.title || "", // 页面标题
      pageDescription: pageInfo?.description || "", // 页面描述
    };
    return enhancedLink;
  });

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
    "加载文档数据失败:",
    error instanceof Error ? error.message : String(error)
  );
}

const server = new McpServer({
  name: "unreal-engine-docs-mcp",
  version: packageVersion,
});

// Get all Unreal Engine documentation links with optional search
server.tool(
  "search_docs_list",
  "查询并返回虚幻引擎官方文档链接列表",
  {
    search: z
      .string()
      .describe("可选的搜索关键字，用于模糊匹配导航标题、页面标题和页面描述"),
  },
  async (args) => {
    let filteredLinks = enhancedDocLinks;

    // 如果提供了搜索关键字，进行三字段模糊匹配
    if (args.search && args.search.trim()) {
      const searchTerm = args.search.toLowerCase().trim();

      filteredLinks = enhancedDocLinks.filter((link) => {
        // 在 navTitle (title)、pageTitle、pageDescription 三个字段中搜索
        const navTitle = link.title.toLowerCase();
        const pageTitle = (link.pageTitle || "").toLowerCase();
        const pageDescription = (link.pageDescription || "").toLowerCase();

        return (
          navTitle.includes(searchTerm) ||
          pageTitle.includes(searchTerm) ||
          pageDescription.includes(searchTerm)
        );
      });
    }

    // 构建返回结果，包含所有字段
    const result = {
      total: filteredLinks.length,
      search: args.search || null,
      links: filteredLinks.map((link) => ({
        navTitle: link.title, // 导航标题
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
  }
);

// Create stdio transport
const transport = new StdioServerTransport();

// Connect server to stdio transport
server.connect(transport);
