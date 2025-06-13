#!/usr/bin/env tsx

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { JSDOM } from "jsdom";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LinkData {
  title: string;
  link: string;
}

interface OutputData {
  total: number;
  generated: string;
  links: LinkData[];
}

function parseNavigation(): void {
  try {
    // 读取 HTML 文件（从动态生成的文件读取）
    const htmlPath = path.join(__dirname, "..", "..", "nav-dist.html");
    const htmlContent = readFileSync(htmlPath, "utf-8");

    // 解析 HTML
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // 提取所有链接
    const links: LinkData[] = [];
    const anchors = document.querySelectorAll("a.contents-table-link");

    anchors.forEach((anchor) => {
      const href = anchor.getAttribute("href");
      const title = anchor.textContent?.trim();

      if (href && title) {
        // 构建完整URL（如果是相对链接）
        const fullUrl = href.startsWith("http")
          ? href
          : `https://dev.epicgames.com${href}`;

        links.push({
          title: title,
          link: fullUrl,
        });
      }
    });

    // 创建 sources 目录
    const sourcesPath = path.join(__dirname, "..", "..", "sources");
    try {
      mkdirSync(sourcesPath, { recursive: true });
    } catch (err) {
      // 目录已存在
    }

    // 写入 JSON 文件
    const outputPath = path.join(sourcesPath, "list.json");
    const jsonData: OutputData = {
      total: links.length,
      generated: new Date().toISOString(),
      links: links,
    };

    writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), "utf-8");

    console.log(`✅ 成功解析 ${links.length} 个链接`);
    console.log(`📁 输出文件: ${outputPath}`);
    console.log(`🕒 生成时间: ${jsonData.generated}`);

    // 显示前5个链接作为示例
    console.log("\n📋 前5个链接示例:");
    links.slice(0, 5).forEach((link, index) => {
      console.log(`${index + 1}. ${link.title}`);
      console.log(`   ${link.link}\n`);
    });
  } catch (error) {
    console.error("❌ 解析失败:", (error as Error).message);
    process.exit(1);
  }
}

parseNavigation();
