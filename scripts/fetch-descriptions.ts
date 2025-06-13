#!/usr/bin/env tsx

import { chromium, Browser, BrowserContext, Page } from "playwright";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LinkInfo {
  title: string;
  link: string;
}

interface ListData {
  links: LinkInfo[];
}

interface PageInfo {
  title: string;
  description: string;
}

interface PageResult {
  url: string;
  success: boolean;
  data: PageInfo;
}

interface BrowserFingerprint {
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
  timezoneId: string;
}

interface OutputData {
  total: number;
  generated: string;
  success_count: number;
  failed_count: number;
  browser_info: {
    engine: string;
    batch_size: number;
    parallel_processing: boolean;
    sequential_tab_opening: boolean;
    random_fingerprints: boolean;
    human_simulation: boolean;
  };
  pages: Record<string, PageInfo>;
}

// 随机延迟函数
function randomDelay(min: number = 1000, max: number = 3000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 生成随机浏览器标识
function generateRandomBrowserFingerprint(): BrowserFingerprint {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];

  const viewports = [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1280, height: 720 },
  ];

  const locales = ["zh-CN", "en-US", "zh-TW"];
  const timezones = ["Asia/Shanghai", "Asia/Taipei", "Asia/Hong_Kong"];

  return {
    userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
    viewport: viewports[Math.floor(Math.random() * viewports.length)],
    locale: locales[Math.floor(Math.random() * locales.length)],
    timezoneId: timezones[Math.floor(Math.random() * timezones.length)],
  };
}

// 模拟人类鼠标移动
async function simulateHumanBehavior(page: Page): Promise<void> {
  try {
    // 随机移动鼠标
    const viewport = page.viewportSize();
    if (viewport) {
      const x = Math.floor(Math.random() * viewport.width);
      const y = Math.floor(Math.random() * viewport.height);

      await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });

      // 随机滚动
      if (Math.random() > 0.5) {
        await page.mouse.wheel(0, Math.floor(Math.random() * 500) + 100);
        await new Promise((resolve) =>
          setTimeout(resolve, randomDelay(500, 1500))
        );
      }
    }

    // 随机短暂停留
    await new Promise((resolve) => setTimeout(resolve, randomDelay(500, 2000)));
  } catch (error) {
    console.log(`   🤖 模拟人类行为时出错: ${(error as Error).message}`);
  }
}

// 处理单个页面的函数
async function processSinglePage(page: Page, linkInfo: LinkInfo, index: number, total: number): Promise<PageResult> {
  const url = linkInfo.link;
  
  try {
    console.log(`   [${index}/${total}] 🔗 处理: ${linkInfo.title}`);
    console.log(`   链接: ${url}`);

    // 随机延迟模拟用户思考时间
    const thinkingDelay = randomDelay(800, 2000);
    console.log(`   [${index}] 🤔 模拟用户思考 ${thinkingDelay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, thinkingDelay));

    // 访问页面
    console.log(`   [${index}] 📄 正在加载页面...`);
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    console.log(`   [${index}] 📊 响应状态: ${response?.status()}`);

    if (!response || !response.ok()) {
      throw new Error(
        `HTTP ${response?.status()}: ${response?.statusText()}`
      );
    }

    // 等待页面加载并模拟人类行为
    console.log(`   [${index}] ⏳ 等待页面渲染并模拟用户行为...`);
    await new Promise((resolve) =>
      setTimeout(resolve, randomDelay(1000, 2000))
    );

    // 模拟人类浏览行为
    await simulateHumanBehavior(page);

    // 获取页面标题和描述信息
    console.log(`   [${index}] 🔍 提取页面标题和描述信息...`);
    const pageInfo = await page.evaluate(() => {
      // 获取页面标题
      const pageTitle = document.title || "";

      // 尝试获取 meta description
      const metaDescription = document.querySelector(
        'meta[name="description"]'
      );
      if (metaDescription) {
        const content = metaDescription.getAttribute("content");
        if (content) {
          return {
            title: pageTitle.trim(),
            description: content.trim(),
          };
        }
      }

      // 如果没有 meta description，尝试获取其他描述
      const ogDescription = document.querySelector(
        'meta[property="og:description"]'
      );
      if (ogDescription) {
        const content = ogDescription.getAttribute("content");
        if (content) {
          return {
            title: pageTitle.trim(),
            description: content.trim(),
          };
        }
      }

      // 尝试 twitter description
      const twitterDescription = document.querySelector(
        'meta[name="twitter:description"]'
      );
      if (twitterDescription) {
        const content = twitterDescription.getAttribute("content");
        if (content) {
          return {
            title: pageTitle.trim(),
            description: content.trim(),
          };
        }
      }

      return {
        title: pageTitle.trim(),
        description: "",
      };
    });

    // 模拟用户阅读时间
    const readingDelay = randomDelay(1000, 3000);
    console.log(`   [${index}] 📖 模拟用户阅读 ${readingDelay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, readingDelay));

    console.log(`   [${index}] ✅ 成功提取页面信息:`);
    console.log(`      📑 标题: ${pageInfo.title || "无"}`);
    console.log(
      `      📝 描述: ${
        pageInfo.description
          ? `${pageInfo.description.substring(0, 50)}...`
          : "无"
      }`
    );

    return {
      url,
      success: true,
      data: {
        title: pageInfo.title || "",
        description: pageInfo.description || "",
      }
    };

  } catch (error) {
    console.log(`   [${index}] ❌ 处理失败: ${(error as Error).message}`);

    return {
      url,
      success: false,
      data: {
        title: "",
        description: "",
      }
    };
  }
}

async function fetchDescriptions(): Promise<void> {
  let browser: Browser | null = null;
  const BATCH_SIZE = 5; // 每批处理的页面数量

  try {
    // 读取 list.json 文件
    console.log("📋 读取链接列表...");
    const sourcesPath = path.join(__dirname, "..", "sources", "list.json");
    const listData: ListData = JSON.parse(readFileSync(sourcesPath, "utf-8"));
    const links = listData.links || [];

    console.log(`📊 找到 ${links.length} 个链接需要处理`);
    console.log(`🔄 批量处理模式: 每批逐个打开 ${BATCH_SIZE} 个页面`);

    // 启动本地浏览器
    console.log("🚀 启动本地浏览器 (Chrome)...");
    browser = await chromium.launch({
      headless: false, // 使用有界面模式，更像真实用户
      channel: "chrome", // 使用本地安装的 Chrome
      slowMo: 50, // 添加操作间延迟
      devtools: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-background-timer-throttling",
        "--disable-background-networking",
        "--disable-client-side-phishing-detection",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--mute-audio",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    const pageData: Record<string, PageInfo> = {}; // 存储页面数据（标题和描述）
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    // 按批次处理链接
    const totalBatches = Math.ceil(links.length / BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, links.length);
      const batch = links.slice(startIndex, endIndex);
      const currentBatch = batchIndex + 1;

      console.log(`\n🚀 开始处理第 ${currentBatch}/${totalBatches} 批 (${batch.length} 个页面)`);
      console.log(`📍 处理范围: ${startIndex + 1}-${endIndex} / ${links.length}`);

      // 批量间的随机延迟，模拟用户行为
      if (batchIndex > 0) {
        const batchDelay = randomDelay(5000, 12000);
        console.log(`⏰ 批次间等待 ${batchDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, batchDelay));
      }

      // 为当前批次生成随机浏览器标识
      const fingerprint = generateRandomBrowserFingerprint();
      console.log(`🎭 当前批次浏览器标识:`);
      console.log(`   User-Agent: ${fingerprint.userAgent.substring(0, 80)}...`);
      console.log(`   视口: ${fingerprint.viewport.width}x${fingerprint.viewport.height}`);
      console.log(`   语言: ${fingerprint.locale}, 时区: ${fingerprint.timezoneId}`);

      // 创建新的浏览器上下文，使用随机标识
      const context = await browser.newContext({
        viewport: fingerprint.viewport,
        userAgent: fingerprint.userAgent,
        locale: fingerprint.locale,
        timezoneId: fingerprint.timezoneId,
        permissions: ["geolocation"],
        extraHTTPHeaders: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": `${fingerprint.locale},zh;q=0.9,en;q=0.8`,
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Upgrade-Insecure-Requests": "1",
        },
      });

      const pages: Page[] = [];
      const pagePromises: Promise<PageResult>[] = [];

      // 逐个创建页面，模拟用户逐个打开tab的行为
      console.log(`📑 开始逐个创建标签页...`);
      for (let i = 0; i < batch.length; i++) {
        const linkInfo = batch[i];
        const pageIndex = startIndex + i + 1;

        console.log(`   📖 创建第 ${i + 1}/${batch.length} 个标签页 (总第${pageIndex}页)`);

        // 创建新页面
        const page = await context.newPage();
        pages.push(page);

        // 为页面设置资源拦截
        await page.route("**/*", (route) => {
          const resourceType = route.request().resourceType();
          if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
            route.abort();
          } else {
            route.continue();
          }
        });

        // 启动页面处理任务（但不等待完成）
        const pagePromise = processSinglePage(page, linkInfo, pageIndex, links.length);
        pagePromises.push(pagePromise);

        // 模拟用户打开tab间的延迟（除了最后一个）
        if (i < batch.length - 1) {
          const tabDelay = randomDelay(800, 2500);
          console.log(`   ⏳ 等待 ${tabDelay}ms 再打开下一个标签页...`);
          await new Promise((resolve) => setTimeout(resolve, tabDelay));
        }
      }

      console.log(`⚡ 所有标签页已创建，等待处理完成...`);
      
      // 等待当前批次的所有页面处理完成
      const batchResults = await Promise.allSettled(pagePromises);

      // 关闭所有页面
      console.log(`🗑️  关闭当前批次的所有标签页...`);
      for (const page of pages) {
        try {
          await page.close();
        } catch (error) {
          console.log(`   ⚠️  关闭标签页时出错: ${(error as Error).message}`);
        }
      }

      // 关闭当前上下文
      await context.close();

      // 处理结果
      batchResults.forEach((result, index) => {
        processedCount++;
        
        if (result.status === 'fulfilled') {
          const pageResult = result.value;
          pageData[pageResult.url] = pageResult.data;
          
          if (pageResult.success) {
            successCount++;
          } else {
            failedCount++;
          }
        } else {
          // Promise rejected
          const linkInfo = batch[index];
          failedCount++;
          pageData[linkInfo.link] = {
            title: "",
            description: "",
          };
          console.log(`   [${startIndex + index + 1}] ❌ Promise 执行失败: ${result.reason}`);
        }
      });

      console.log(`✅ 第 ${currentBatch} 批处理完成`);
      console.log(`   📊 本批成功: ${batchResults.filter(r => r.status === 'fulfilled' && r.value.success).length}`);
      console.log(`   📊 本批失败: ${batchResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length}`);
      
      // 显示总体进度
      console.log(`📈 总体进度: ${processedCount}/${links.length} (${(processedCount/links.length*100).toFixed(1)}%)`);
      console.log(`   累计成功: ${successCount}, 累计失败: ${failedCount}`);
    }

    // 保存页面信息到文件
    const outputPath = path.join(
      __dirname,
      "..",
      "sources",
      "descriptions.json"
    );
    const pageDataOutput: OutputData = {
      total: Object.keys(pageData).length,
      generated: new Date().toISOString(),
      success_count: successCount,
      failed_count: failedCount,
      browser_info: {
        engine: "Playwright + Chrome",
        batch_size: BATCH_SIZE,
        parallel_processing: true,
        sequential_tab_opening: true,
        random_fingerprints: true,
        human_simulation: true,
      },
      pages: pageData,
    };

    writeFileSync(
      outputPath,
      JSON.stringify(pageDataOutput, null, 2),
      "utf-8"
    );

    console.log(`\n🎉 全部处理完成!`);
    console.log(`📁 输出文件: ${outputPath}`);
    console.log(`📊 最终统计:`);
    console.log(`   - 总链接数: ${links.length}`);
    console.log(`   - 成功获取信息: ${successCount}`);
    console.log(`   - 获取失败: ${failedCount}`);
    console.log(
      `   - 有标题: ${
        Object.values(pageData).filter((d) => d.title).length
      }`
    );
    console.log(
      `   - 有描述: ${
        Object.values(pageData).filter((d) => d.description).length
      }`
    );
    console.log(
      `   - 成功率: ${((successCount / links.length) * 100).toFixed(1)}%`
    );
    console.log(`🕒 生成时间: ${pageDataOutput.generated}`);

    // 显示一些示例
    console.log("\n📋 页面信息示例:");
    let exampleCount = 0;
    for (const [url, info] of Object.entries(pageData)) {
      if ((info.title || info.description) && exampleCount < 3) {
        console.log(`${exampleCount + 1}. 标题: ${info.title || "无"}`);
        console.log(`   描述: ${info.description || "无"}`);
        console.log(`   链接: ${url}\n`);
        exampleCount++;
      }
    }
  } catch (error) {
    console.error("❌ 获取页面信息失败:", (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  } finally {
    // 清理资源
    if (browser) {
      await browser.close();
    }

    console.log("✅ 资源清理完成");
  }
}

fetchDescriptions(); 