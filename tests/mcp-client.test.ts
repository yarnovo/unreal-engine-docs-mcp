#!/usr/bin/env node

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let client: Client;
let transport: StdioClientTransport;

describe('MCP 服务端测试', () => {
  beforeAll(async () => {
    console.log("🚀 开始测试 MCP 服务端...");

    // 创建客户端传输，连接到编译后的服务端
    const serverPath = join(__dirname, "..", "dist", "src", "index.js");
    console.log(`📁 服务端路径: ${serverPath}`);

    transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });

    // 创建客户端
    client = new Client({
      name: "unreal-engine-docs-test-client",
      version: "1.0.0",
    });

    // 连接到服务端
    console.log("🔗 连接到服务端...");
    await client.connect(transport);
    console.log("✅ 成功连接到服务端");
  });

  afterAll(async () => {
    // 关闭客户端连接
    if (client) {
      await client.close();
      console.log("🔌 客户端连接已关闭");
    }
  });

  it('应该能列出可用工具', async () => {
    console.log("\n📋 列出可用工具...");
    const tools = await client.listTools();
    
    expect(tools.tools).toBeDefined();
    expect(tools.tools.length).toBeGreaterThan(0);
    
    console.log("可用工具:");
    tools.tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // 检查是否有预期的工具
    const toolNames = tools.tools.map(t => t.name);
    expect(toolNames).toContain('search_docs_list');
  });

  it('应该能调用工具 (不搜索，限制5个结果)', async () => {
    console.log("\n🔧 测试1: 调用工具 (不搜索，限制5个结果)");
    const result = await client.callTool({
      name: "search_docs_list",
      arguments: {
        search: "",
        limit: 5,
      },
    });

    expect(result).toBeDefined();
    const content = result as any;
    expect(content.content).toBeDefined();
    expect(content.content.length).toBeGreaterThan(0);
    expect(content.content[0].type).toBe("text");

    const data = JSON.parse(content.content[0].text);
    expect(data.total).toBeDefined();
    expect(data.searchMethod).toBeDefined();
    expect(data.vectorSearchAvailable).toBeDefined();
    expect(data.links).toBeDefined();
    expect(Array.isArray(data.links)).toBe(true);
    expect(data.links.length).toBeLessThanOrEqual(5);

    console.log("结果统计:");
    console.log(`  - 总数: ${data.total}`);
    console.log(`  - 搜索方法: ${data.searchMethod}`);
    console.log(`  - 向量搜索可用: ${data.vectorSearchAvailable}`);
    console.log(`  - 返回链接数: ${data.links.length}`);
    console.log("前3个链接:");
    data.links.slice(0, 3).forEach((link: any, index: number) => {
      console.log(`  ${index + 1}. ${link.navTitle}`);
      console.log(`     页面标题: ${link.pageTitle || "无"}`);
      console.log(`     链接: ${link.link}`);
    });
  });

  it('应该能搜索 blueprint', async () => {
    console.log("\n🔧 测试2: 调用工具 (搜索 'blueprint')");
    const result = await client.callTool({
      name: "search_docs_list",
      arguments: {
        search: "blueprint",
        limit: 5,
      },
    });

    expect(result).toBeDefined();
    const content = result as any;
    expect(content.content).toBeDefined();
    expect(content.content.length).toBeGreaterThan(0);
    expect(content.content[0].type).toBe("text");

    const data = JSON.parse(content.content[0].text);
    expect(data.search).toBe("blueprint");
    expect(data.searchMethod).toBeDefined();
    expect(data.vectorSearchAvailable).toBeDefined();
    expect(data.links).toBeDefined();
    expect(Array.isArray(data.links)).toBe(true);
    expect(data.links.length).toBeLessThanOrEqual(5);

    console.log("搜索结果统计:");
    console.log(`  - 搜索关键字: ${data.search}`);
    console.log(`  - 搜索方法: ${data.searchMethod}`);
    console.log(`  - 向量搜索可用: ${data.vectorSearchAvailable}`);
    console.log(`  - 返回链接数: ${data.links.length}`);
    console.log("搜索结果:");
    data.links.forEach((link: any, index: number) => {
      console.log(`  ${index + 1}. ${link.navTitle}`);
      console.log(`     页面标题: ${link.pageTitle || "无"}`);
      console.log(`     页面描述: ${link.pageDescription || "无"}`);
      console.log(`     链接: ${link.link}`);
    });
  });

  it('应该能搜索中文 "蓝图"', async () => {
    console.log("\n🔧 测试3: 调用工具 (搜索 '蓝图')");
    const result = await client.callTool({
      name: "search_docs_list",
      arguments: {
        search: "蓝图",
        limit: 3,
      },
    });

    expect(result).toBeDefined();
    const content = result as any;
    expect(content.content).toBeDefined();
    expect(content.content.length).toBeGreaterThan(0);
    expect(content.content[0].type).toBe("text");

    const data = JSON.parse(content.content[0].text);
    expect(data.search).toBe("蓝图");
    expect(data.searchMethod).toBeDefined();
    expect(data.links).toBeDefined();
    expect(Array.isArray(data.links)).toBe(true);
    expect(data.links.length).toBeLessThanOrEqual(3);

    console.log("中文搜索结果统计:");
    console.log(`  - 搜索关键字: ${data.search}`);
    console.log(`  - 搜索方法: ${data.searchMethod}`);
    console.log(`  - 返回链接数: ${data.links.length}`);
    if (data.links.length > 0) {
      console.log("中文搜索结果:");
      data.links.forEach((link: any, index: number) => {
        console.log(`  ${index + 1}. ${link.navTitle}`);
        console.log(`     页面标题: ${link.pageTitle || "无"}`);
        console.log(`     链接: ${link.link}`);
      });
    } else {
      console.log("  - 无搜索结果");
    }
  });

  it('应该能搜索多个关键词', async () => {
    const searchTerms = ["animation", "physics", "material", "lighting"];
    
    for (const term of searchTerms) {
      console.log(`\n🔧 测试: 搜索 '${term}'`);
      const result = await client.callTool({
        name: "search_docs_list",
        arguments: {
          search: term,
          limit: 2,
        },
      });

      expect(result).toBeDefined();
      const content = result as any;
      expect(content.content).toBeDefined();
      expect(content.content.length).toBeGreaterThan(0);
      expect(content.content[0].type).toBe("text");

      const data = JSON.parse(content.content[0].text);
      expect(data.search).toBe(term);
      expect(data.searchMethod).toBeDefined();
      expect(data.links).toBeDefined();
      expect(Array.isArray(data.links)).toBe(true);
      expect(data.links.length).toBeLessThanOrEqual(2);

      console.log(
        `  - 找到 ${data.links.length} 个结果 (搜索方法: ${data.searchMethod})`
      );
      if (data.links.length > 0) {
        console.log(`  - 首个结果: ${data.links[0].navTitle}`);
      }
    }
  });
});
