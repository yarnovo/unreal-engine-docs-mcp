#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchNavigation() {
    let browser = null;
    
    try {
        console.log('🚀 启动浏览器...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // 设置用户代理和视口
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('📄 访问文档页面...');
        const url = 'https://dev.epicgames.com/documentation/zh-cn/unreal-engine/unreal-engine-5-6-documentation';
        
        // 访问页面并等待加载完成
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        console.log('✅ 页面加载完成');
        
        // 等待导航元素加载
        console.log('⏳ 等待导航元素加载...');
        await page.waitForSelector('.documents-tree', { timeout: 10000 });
        
        // 展开所有可展开的菜单项
        console.log('🔄 开始展开所有菜单项...');
        let expandedCount = 0;
        let maxAttempts = 10; // 最多尝试10轮展开
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            console.log(`📂 第 ${attempt + 1} 轮展开...`);
            
            // 查找所有可展开的按钮（未展开的）
            const expandButtons = await page.$$('.btn-expander .icon-arrow-forward-ios:not(.is-rotated)');
            
            if (expandButtons.length === 0) {
                console.log('✅ 所有菜单项已展开完毕');
                break;
            }
            
            console.log(`   找到 ${expandButtons.length} 个可展开项`);
            let currentRoundExpanded = 0;
            
            // 点击每个展开按钮
            for (let i = 0; i < expandButtons.length; i++) {
                try {
                    // 检查按钮是否仍然存在且未展开
                    const isStillCollapsed = await expandButtons[i].evaluate(el => 
                        !el.classList.contains('is-rotated')
                    );
                    
                    if (!isStillCollapsed) {
                        continue;
                    }
                    
                    // 滚动到按钮位置
                    await expandButtons[i].scrollIntoView();
                    
                    // 点击按钮的父元素（.btn-expander）
                    const expandButton = await expandButtons[i].evaluateHandle(el => el.closest('.btn-expander'));
                    await expandButton.click();
                    expandedCount++;
                    currentRoundExpanded++;
                    
                    // 短暂等待DOM更新
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (error) {
                    console.log(`   ⚠️  展开第 ${i + 1} 项时出错: ${error.message}`);
                }
            }
            
            // 等待DOM更新完成
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`   本轮展开了 ${currentRoundExpanded} 项`);
            
            if (currentRoundExpanded === 0) {
                console.log('✅ 本轮无新展开项，结束展开');
                break;
            }
        }
        
        console.log(`🎉 总共展开了 ${expandedCount} 个菜单项`);
        
        // 获取完整的导航HTML
        console.log('📋 提取导航HTML结构...');
        const navigationHtml = await page.evaluate(() => {
            const navElement = document.querySelector('.documents-tree');
            return navElement ? navElement.outerHTML : null;
        });
        
        if (!navigationHtml) {
            throw new Error('未找到 .documents-tree 元素');
        }
        
        // 保存到文件
        const outputPath = path.join(__dirname, '..', 'nav-dist.html');
        writeFileSync(outputPath, navigationHtml, 'utf-8');
        
        console.log(`💾 导航结构已保存到: ${outputPath}`);
        
        // 统计链接数量
        const linkCount = await page.evaluate(() => {
            return document.querySelectorAll('.documents-tree a.contents-table-link').length;
        });
        
        console.log(`🔗 提取到 ${linkCount} 个链接`);
        console.log('✅ 完成！');
        
    } catch (error) {
        console.error('❌ 获取导航失败:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

fetchNavigation(); 