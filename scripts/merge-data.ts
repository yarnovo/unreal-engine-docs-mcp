#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LinkData {
  title: string;
  link: string;
}

interface ListData {
  links: LinkData[];
}

interface PageInfo {
  title?: string;
  description?: string;
}

interface DescriptionsData {
  pages: Record<string, PageInfo>;
}

interface EnhancedLink {
  navTitle: string;
  link: string;
  pageTitle: string;
  pageDescription: string;
}

interface OutputData {
  total: number;
  generated: string;
  stats: {
    totalLinks: number;
    withPageTitle: number;
    withPageDescription: number;
    completionRate: {
      pageTitle: string;
      pageDescription: string;
    };
  };
  links: EnhancedLink[];
}

/**
 * 合并导航列表和页面描述数据
 * 生成最终的增强链接列表
 */
async function mergeData(): Promise<void> {
  console.log("🔗 开始合并导航列表和页面描述数据...");

  try {
    // 读取 list.json
    console.log("📋 读取导航列表数据...");
    const listPath = join(__dirname, "..", "sources", "list.json");
    const listData: ListData = JSON.parse(readFileSync(listPath, "utf-8"));
    const baseLinks = listData.links || [];
    console.log(`  ✅ 读取了 ${baseLinks.length} 个导航链接`);

    // 读取 descriptions.json
    console.log("📄 读取页面描述数据...");
    const descriptionsPath = join(
      __dirname,
      "..",
      "sources",
      "descriptions.json"
    );
    let pageData: Record<string, PageInfo> = {};

    try {
      const descriptionsData: DescriptionsData = JSON.parse(
        readFileSync(descriptionsPath, "utf-8")
      );
      pageData = descriptionsData.pages || {};
      console.log(`  ✅ 读取了 ${Object.keys(pageData).length} 个页面描述`);
    } catch (descError) {
      console.warn("  ⚠️ 无法读取页面描述数据，将使用基础链接数据");
      console.warn("  ", (descError as Error).message);
    }

    // 合并数据：创建增强链接列表
    console.log("🔗 合并数据生成增强链接列表...");
    const enhancedLinks: EnhancedLink[] = baseLinks.map((link) => {
      const pageInfo = pageData[link.link];
      return {
        navTitle: link.title, // 导航标题 (navTitle)
        link: link.link,
        pageTitle: pageInfo?.title || "", // 页面标题
        pageDescription: pageInfo?.description || "", // 页面描述
      };
    });

    // 统计信息
    const withPageTitle = enhancedLinks.filter((link) => link.pageTitle).length;
    const withPageDescription = enhancedLinks.filter(
      (link) => link.pageDescription
    ).length;

    // 创建输出数据结构
    const outputData: OutputData = {
      total: enhancedLinks.length,
      generated: new Date().toISOString(),
      stats: {
        totalLinks: enhancedLinks.length,
        withPageTitle: withPageTitle,
        withPageDescription: withPageDescription,
        completionRate: {
          pageTitle: `${((withPageTitle / enhancedLinks.length) * 100).toFixed(
            1
          )}%`,
          pageDescription: `${(
            (withPageDescription / enhancedLinks.length) *
            100
          ).toFixed(1)}%`,
        },
      },
      links: enhancedLinks,
    };

    // 写入合并后的数据
    const outputPath = join(__dirname, "..", "sources", "enhanced-list.json");
    writeFileSync(outputPath, JSON.stringify(outputData, null, 2), "utf-8");

    console.log("✅ 数据合并完成！");
    console.log(`📊 统计信息:`);
    console.log(`   • 总链接数: ${enhancedLinks.length}`);
    console.log(
      `   • 有页面标题: ${withPageTitle} (${outputData.stats.completionRate.pageTitle})`
    );
    console.log(
      `   • 有页面描述: ${withPageDescription} (${outputData.stats.completionRate.pageDescription})`
    );
    console.log(`💾 输出文件: ${outputPath}`);
  } catch (error) {
    console.error("❌ 合并数据失败:", (error as Error).message);
    process.exit(1);
  }
}

// 执行合并
mergeData().catch(console.error); 