import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('虚幻引擎文档 MCP 服务器', () => {
  it('应该能够读取文档链接', () => {
    const sourcesPath = join(__dirname, 'sources', 'list.json');
    const data = JSON.parse(readFileSync(sourcesPath, 'utf-8'));
    
    expect(data).toHaveProperty('links');
    expect(Array.isArray(data.links)).toBe(true);
    expect(data.links.length).toBeGreaterThan(0);
  });

  it('应该能够读取描述文件', () => {
    const descriptionsPath = join(__dirname, 'sources', 'descriptions.json');
    const descriptionsData = JSON.parse(readFileSync(descriptionsPath, 'utf-8'));
    
    expect(descriptionsData).toHaveProperty('descriptions');
    expect(typeof descriptionsData.descriptions).toBe('object');
  });

  it('描述文件应该包含测试数据', () => {
    const descriptionsPath = join(__dirname, 'sources', 'descriptions.json');
    const descriptionsData = JSON.parse(readFileSync(descriptionsPath, 'utf-8'));
    const descriptions = descriptionsData.descriptions;
    
    expect(descriptions['https://dev.epicgames.com/documentation/zh-cn/unreal-engine/whats-new']).toBe('了解虚幻引擎5.6的新功能和改进。');
    expect(descriptions['https://dev.epicgames.com/documentation/zh-cn/unreal-engine/install-unreal-engine']).toBe('学习如何下载和安装虚幻引擎到您的计算机上。');
  });

  it('搜索功能应该能够过滤链接', () => {
    const sourcesPath = join(__dirname, 'sources', 'list.json');
    const data = JSON.parse(readFileSync(sourcesPath, 'utf-8'));
    const links = data.links;
    
    // 模拟搜索逻辑
    const searchTerm = '安装';
    const filteredLinks = links.filter((link: any) => 
      link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.link.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    expect(filteredLinks.length).toBeGreaterThan(0);
    expect(filteredLinks.some((link: any) => link.title.includes('安装'))).toBe(true);
  });

  it('搜索功能应该能够根据描述过滤', () => {
    const descriptionsPath = join(__dirname, 'sources', 'descriptions.json');
    const descriptionsData = JSON.parse(readFileSync(descriptionsPath, 'utf-8'));
    const descriptions = descriptionsData.descriptions;
    
    const sourcesPath = join(__dirname, 'sources', 'list.json');
    const data = JSON.parse(readFileSync(sourcesPath, 'utf-8'));
    const links = data.links;
    
    // 模拟基于描述的搜索
    const searchTerm = '新功能';
    const filteredLinks = links.filter((link: any) => {
      const description = descriptions[link.link] || '';
      return (
        link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.link.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
    
    expect(filteredLinks.length).toBeGreaterThan(0);
  });
}); 