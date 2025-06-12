# 虚幻引擎文档导航解析器

这个项目用于动态获取和解析虚幻引擎官方文档的完整导航结构，并提供基于关键字的搜索功能。

## 项目背景

虚幻引擎官方文档网站使用动态加载的导航菜单，只有点击展开按钮才能显示子菜单项。传统的静态HTML抓取只能获取到第一层的导航链接，无法获取完整的文档结构。

## 解决方案

本项目使用无头浏览器(Puppeteer)来模拟用户操作，自动点击所有可展开的菜单项，获取完整的导航结构。

## 功能特性

- 🤖 **自动化展开**: 使用无头浏览器自动展开所有菜单项
- 📊 **数据对比**: 对比静态和动态获取的链接数量
- 🔄 **增量更新**: 多轮展开策略确保获取所有嵌套菜单
- 📁 **结构化输出**: 生成JSON格式的链接列表
- 🔍 **关键字搜索**: 支持基于标题和链接的关键字搜索功能

## 文件结构

```
├── scripts/
│   ├── fetch-nav.js     # 动态获取导航结构
│   └── parse-nav.js     # 解析HTML并生成JSON
├── sources/
│   └── list.json        # 生成的链接列表
├── src/
│   └── index.ts         # MCP服务器实现
├── nav.html             # 原始静态导航(87个链接)
├── nav-dist.html        # 动态获取的完整导航(2415个链接)
└── package.json         # 项目配置
```

## 使用方法

### 安装依赖
```bash
npm install
```

### 获取动态导航
```bash
npm run fetch-nav
```

### 解析导航数据
```bash
npm run parse-nav
```

### 完整流程
```bash
npm test
# 或
npm run build
```

### 运行MCP服务器
```bash
npm run dev
```

## MCP工具功能

### get_docs_list

获取虚幻引擎文档链接列表，支持可选的关键字搜索功能。

**参数:**
- `search` (可选): 搜索关键字，用于过滤标题和链接

**返回数据格式:**
```json
{
  "total": 2415,
  "search": "animation",
  "links": [
    {
      "title": "物体和角色动画制作",
      "link": "https://dev.epicgames.com/documentation/zh-cn/unreal-engine/animating-characters-and-objects-in-unreal-engine"
    }
  ]
}
```

**使用示例:**
- 获取所有链接: `get_docs_list()`
- 搜索动画相关: `get_docs_list(search="动画")`
- 搜索蓝图相关: `get_docs_list(search="blueprint")`

## 成果统计

- **原始nav.html链接数量**: 87个
- **动态nav-dist.html链接数量**: 2415个  
- **增加的链接数量**: 2328个
- **展开的菜单项**: 492个
- **展开轮次**: 7轮

## 技术细节

### 展开策略
脚本使用多轮展开策略，每轮查找所有未展开的按钮并点击，直到没有新的可展开项为止。

### 选择器优化
```javascript
// 查找未展开的菜单按钮
const expandButtons = await page.$$('.btn-expander .icon-arrow-forward-ios:not(.is-rotated)');
```

### 搜索实现
搜索功能基于标题和链接字段进行大小写不敏感的关键字匹配：
```typescript
filteredLinks = docLinks.filter(link => 
  link.title.toLowerCase().includes(searchTerm) ||
  link.link.toLowerCase().includes(searchTerm)
);
```

### 错误处理
- 自动重试机制
- 滚动到可视区域
- DOM更新等待
- 异常捕获和日志记录

## 生成的数据格式

```json
{
  "total": 2415,
  "generated": "2025-06-12T17:34:05.387Z",
  "links": [
    {
      "title": "新内容",
      "link": "https://dev.epicgames.com/documentation/zh-cn/unreal-engine/whats-new"
    }
  ]
}
```

## 性能指标

- 浏览器启动时间: ~2-3秒
- 页面加载时间: ~5-10秒  
- 导航展开时间: ~30-60秒
- 数据解析时间: ~1-2秒
- 总执行时间: ~40-80秒
- 搜索响应时间: <100毫秒

## 技术栈

- **Node.js**: 运行环境
- **TypeScript**: 类型安全的开发
- **Puppeteer**: 无头浏览器控制
- **JSDOM**: HTML解析
- **MCP (Model Context Protocol)**: 服务器实现
- **Zod**: 参数验证
- **ES Modules**: 模块化开发

## 注意事项

1. 需要稳定的网络连接
2. 第一次运行会下载Chromium浏览器
3. 运行时间取决于网络速度和页面响应
4. 建议在稳定的环境中运行
5. 搜索关键字支持中英文混合查询

## 后续优化

- [ ] 添加增量更新机制
- [ ] 支持多语言版本
- [ ] 添加缓存机制
- [ ] 错误重试策略优化
- [ ] 并发处理优化
- [ ] 支持正则表达式搜索

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License 