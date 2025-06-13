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

  it('应该能调用混合搜索工具 (对象参数结构)', async () => {
    console.log("\n🔧 测试1: 调用混合搜索工具 (对象参数结构)");
    const result = await client.callTool({
      name: "search_docs_list",
      arguments: {
        search: {
          en: "animation",
          cn: "角色动画"
        },
        keyword: {
          en: "blueprint",
          cn: "蓝图"
        },
        semanticLimit: 3,
        keywordLimit: 2,
      },
    });

    expect(result).toBeDefined();
    const content = result as any;
    expect(content.content).toBeDefined();
    expect(content.content.length).toBeGreaterThan(0);
    expect(content.content[0].type).toBe("text");

    const data = JSON.parse(content.content[0].text);
    expect(data.total).toBeDefined();
    expect(data.search).toEqual({ en: "animation", cn: "角色动画" });
    expect(data.keyword).toEqual({ en: "blueprint", cn: "蓝图" });
    expect(data.combinedSearchTerm).toBe("animation 角色动画");
    expect(data.searchMethod).toBeDefined();
    expect(data.semanticLimit).toBe(3);
    expect(data.keywordLimit).toBe(2);
    expect(data.keywordResultCount).toBeDefined();
    expect(data.semanticResultCount).toBeDefined();
    expect(data.vectorSearchAvailable).toBeDefined();
    expect(data.links).toBeDefined();
    expect(Array.isArray(data.links)).toBe(true);

    console.log("对象参数结构混合搜索结果统计:");
    console.log(`  - 总数: ${data.total}`);
    console.log(`  - 语义搜索对象: ${JSON.stringify(data.search)}`);
    console.log(`  - 关键词对象: ${JSON.stringify(data.keyword)}`);
    console.log(`  - 合并搜索词: ${data.combinedSearchTerm}`);
    console.log(`  - 搜索方法: ${data.searchMethod}`);
    console.log(`  - 关键词匹配数: ${data.keywordResultCount}`);
    console.log(`  - 语义搜索数: ${data.semanticResultCount}`);
    console.log(`  - 向量搜索可用: ${data.vectorSearchAvailable}`);
    console.log(`  - 返回链接数: ${data.links.length}`);
    console.log("搜索结果:");
    data.links.slice(0, 5).forEach((link: any, index: number) => {
      console.log(`  ${index + 1}. ${link.navTitle}`);
      console.log(`     页面标题: ${link.pageTitle || "无"}`);
      console.log(`     链接: ${link.link}`);
    });
  });

  it('应该能执行对象结构的关键词精确匹配优先混合搜索', async () => {
    console.log("\n🔧 测试2: 对象结构的关键词精确匹配优先混合搜索");
    const result = await client.callTool({
      name: "search_docs_list",
      arguments: {
        search: {
          en: "animation",
          cn: "动画制作"
        },
        keyword: {
          en: "blueprint",
          cn: "材质"
        },
        semanticLimit: 4,
        keywordLimit: 3,
      },
    });

    expect(result).toBeDefined();
    const content = result as any;
    expect(content.content).toBeDefined();
    expect(content.content.length).toBeGreaterThan(0);
    expect(content.content[0].type).toBe("text");

    const data = JSON.parse(content.content[0].text);
    expect(data.search).toEqual({ en: "animation", cn: "动画制作" });
    expect(data.keyword).toEqual({ en: "blueprint", cn: "材质" });
    expect(data.combinedSearchTerm).toBe("animation 动画制作");
    expect(data.searchMethod).toBeDefined();
    expect(data.vectorSearchAvailable).toBeDefined();
    expect(data.links).toBeDefined();
    expect(Array.isArray(data.links)).toBe(true);

    console.log("对象结构混合搜索结果统计:");
    console.log(`  - 语义搜索对象: ${JSON.stringify(data.search)}`);
    console.log(`  - 关键词对象: ${JSON.stringify(data.keyword)}`);
    console.log(`  - 合并搜索词: ${data.combinedSearchTerm}`);
    console.log(`  - 搜索方法: ${data.searchMethod}`);
    console.log(`  - 关键词匹配数: ${data.keywordResultCount}`);
    console.log(`  - 语义搜索数: ${data.semanticResultCount}`);
    console.log(`  - 向量搜索可用: ${data.vectorSearchAvailable}`);
    console.log(`  - 返回链接数: ${data.links.length}`);
    console.log("搜索结果 (关键词匹配优先):");
    data.links.forEach((link: any, index: number) => {
      console.log(`  ${index + 1}. ${link.navTitle}`);
      console.log(`     页面标题: ${link.pageTitle || "无"}`);
      console.log(`     页面描述: ${link.pageDescription || "无"}`);
      console.log(`     链接: ${link.link}`);
    });
  });

  it('应该能搜索对象结构的完整混合查询', async () => {
    console.log("\n🔧 测试3: 对象结构的完整混合搜索");
    const result = await client.callTool({
      name: "search_docs_list",
      arguments: {
        search: {
          en: "blueprint",
          cn: "蓝图"
        },
        keyword: {
          en: "material",
          cn: "材质"
        },
        semanticLimit: 2,
        keywordLimit: 2,
      },
    });

    expect(result).toBeDefined();
    const content = result as any;
    expect(content.content).toBeDefined();
    expect(content.content.length).toBeGreaterThan(0);
    expect(content.content[0].type).toBe("text");

    const data = JSON.parse(content.content[0].text);
    expect(data.search).toEqual({ en: "blueprint", cn: "蓝图" });
    expect(data.keyword).toEqual({ en: "material", cn: "材质" });
    expect(data.combinedSearchTerm).toBe("blueprint 蓝图");
    expect(data.searchMethod).toBeDefined();
    expect(data.links).toBeDefined();
    expect(Array.isArray(data.links)).toBe(true);

    console.log("对象结构的完整混合搜索结果统计:");
    console.log(`  - 语义搜索对象: ${JSON.stringify(data.search)}`);
    console.log(`  - 关键词对象: ${JSON.stringify(data.keyword)}`);
    console.log(`  - 合并搜索词: ${data.combinedSearchTerm}`);
    console.log(`  - 搜索方法: ${data.searchMethod}`);
    console.log(`  - 关键词匹配数: ${data.keywordResultCount}`);
    console.log(`  - 语义搜索数: ${data.semanticResultCount}`);
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

  it('应该能执行多种对象结构的混合搜索组合', async () => {
    const searchCombinations = [
      { search: { en: "animation", cn: "动画" }, keyword: { en: "character", cn: "角色" }, name: "动画+角色" },
      { search: { en: "physics", cn: "物理" }, keyword: { en: "collision", cn: "碰撞" }, name: "物理+碰撞" },
      { search: { en: "material", cn: "材质" }, keyword: { en: "shader", cn: "着色器" }, name: "材质+着色器" },
      { search: { en: "lighting", cn: "光照" }, keyword: { en: "shadow", cn: "阴影" }, name: "光照+阴影" },
    ];
    
    for (const combo of searchCombinations) {
      console.log(`\n🔧 测试对象结构混合搜索: ${combo.name}`);
      const result = await client.callTool({
        name: "search_docs_list",
        arguments: {
          search: combo.search,
          keyword: combo.keyword,
          semanticLimit: 2,
          keywordLimit: 1,
        },
      });

      expect(result).toBeDefined();
      const content = result as any;
      expect(content.content).toBeDefined();
      expect(content.content.length).toBeGreaterThan(0);
      expect(content.content[0].type).toBe("text");

      const data = JSON.parse(content.content[0].text);
      expect(data.search).toEqual(combo.search);
      expect(data.keyword).toEqual(combo.keyword);
      expect(data.combinedSearchTerm).toBe(`${combo.search.en} ${combo.search.cn}`);
      expect(data.searchMethod).toBeDefined();
      expect(data.links).toBeDefined();
      expect(Array.isArray(data.links)).toBe(true);

      console.log(
        `  - 关键词匹配: ${data.keywordResultCount} 个，语义搜索: ${data.semanticResultCount} 个`
      );
      console.log(
        `  - 总结果: ${data.links.length} 个 (搜索方法: ${data.searchMethod})`
      );
      if (data.links.length > 0) {
        console.log(`  - 首个结果: ${data.links[0].navTitle}`);
      }
    }
  });
});
