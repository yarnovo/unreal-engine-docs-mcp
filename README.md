# 虚幻引擎文档 MCP 服务器

这个项目提供虚幻引擎官方文档的 MCP（Model Context Protocol）服务器，支持**基于向量语义搜索**的智能文档查询和访问功能。

## 项目背景

虚幻引擎官方文档网站使用动态加载的导航菜单，只有点击展开按钮才能显示子菜单项。传统的静态HTML抓取只能获取到第一层的导航链接，无法获取完整的文档结构。

## 解决方案

本项目采用多层次技术方案：

1. **无头浏览器自动化**: 使用 Puppeteer 模拟用户操作，自动点击所有可展开的菜单项
2. **完整数据采集**: 获取完整的导航结构并抓取每个页面的标题和描述信息
3. **向量语义搜索**: 基于 LanceDB 和 Ollama 构建语义搜索引擎，提供智能文档检索

## 功能特性

- 🤖 **自动化展开**: 使用无头浏览器自动展开所有菜单项
- 📊 **数据对比**: 对比静态和动态获取的链接数量
- 🔄 **增量更新**: 多轮展开策略确保获取所有嵌套菜单
- 📁 **结构化输出**: 生成JSON格式的增强链接列表
- 📝 **页面信息**: 自动获取每个页面的标题和meta description
- 🧠 **语义搜索**: 基于向量嵌入的智能搜索，支持自然语言查询
- 🔍 **多维度搜索**: 支持基于导航标题、页面标题和描述的全文搜索

## 文件结构

```
├── scripts/                    # 构建脚本 (TypeScript)
│   ├── fetch-nav.ts            # 动态获取导航结构
│   ├── parse-nav.ts            # 解析HTML并生成JSON
│   ├── fetch-descriptions.ts   # 获取页面标题和描述信息
│   ├── merge-data.ts           # 合并导航和页面数据
│   └── build-vector-db.ts      # 构建向量数据库
├── src/                        # 源代码
│   ├── index.ts                # MCP服务器实现
│   └── vector-search.ts        # 向量搜索引擎
├── sources/                    # 数据文件
│   ├── list.json               # 基础链接列表
│   ├── descriptions.json       # 页面描述数据
│   ├── enhanced-list.json      # 增强链接数据 (合并后)
│   └── db/                     # 向量数据库
├── tests/                      # 测试文件
│   └── mcp-client.test.ts      # MCP客户端测试
├── dist/                       # 编译后的JavaScript文件
├── nav-dist.html               # 动态获取的完整导航(2415个链接)
├── tsconfig.json               # TypeScript配置
├── tsconfig.build.json         # 构建配置
└── package.json                # 项目配置
```

## 安装与配置

### 前置要求

1. **Node.js**: 版本 >= 18.0.0
2. **Ollama**: 用于向量嵌入生成
   ```bash
   # 安装 Ollama (根据你的操作系统)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # 下载嵌入模型
   ollama pull bge-m3
   ```

### 安装依赖
```bash
npm install
```

### 构建项目
```bash
npm run build
```

## 使用方法

### 1. 构建文档数据

完整的构建流程：
```bash
# 完整构建流程 (获取导航→解析→获取描述→合并数据)
npm run build-docs
```

分步执行：
```bash
# 1. 获取动态导航结构
npm run fetch-nav

# 2. 解析HTML生成链接列表
npm run parse-nav

# 3. 获取页面标题和描述
npm run fetch-descriptions

# 4. 合并数据生成增强链接列表
npm run merge-data
```

### 2. 构建向量数据库 (可选)

如果需要使用语义搜索功能：
```bash
# 确保 Ollama 服务正在运行
ollama serve

# 构建向量数据库
npm run build-vector-db
```

### 3. 运行MCP服务器
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## MCP工具功能

### search_docs_list

查询并返回虚幻引擎官方文档链接列表，支持**向量语义搜索**技术。

**参数:**
- `search` (必需): 搜索关键字，支持自然语言查询
- `limit` (可选): 返回结果的最大数量，默认10个

**返回数据格式:**
```json
{
  "total": 2415,
  "search": "角色动画制作",
  "searchMethod": "semantic_search",
  "limit": 1,
  "vectorSearchAvailable": true,
  "links": [
    {
      "navTitle": "物体和角色动画制作",
      "pageTitle": "在虚幻引擎中制作角色和物体动画",
      "pageDescription": "学习如何在虚幻引擎中创建和管理角色与物体的动画系统，包括动画蓝图、状态机等高级功能。",
      "link": "https://dev.epicgames.com/documentation/zh-cn/unreal-engine/animating-characters-and-objects-in-unreal-engine"
    }
  ]
}
```

**搜索模式说明:**
- `semantic_search`: 向量语义搜索 (推荐)
- `semantic_search_unavailable`: 向量搜索不可用
- `semantic_search_failed`: 向量搜索失败
- `no_search`: 未提供搜索关键字

**使用示例:**
- 语义搜索动画: `search_docs_list(search="如何制作角色动画")`
- 搜索蓝图功能: `search_docs_list(search="蓝图编程教程")`
- 查找安装指南: `search_docs_list(search="安装虚幻引擎")`
- 新功能探索: `search_docs_list(search="最新功能和更新")`

## 数据统计

### 采集成果
- **原始导航链接**: 87个
- **动态获取链接**: 2415个  
- **新增链接数量**: 2328个
- **展开菜单项**: 492个
- **展开轮次**: 7轮

### 数据完整性
- **页面标题覆盖率**: ~98.5%
- **页面描述覆盖率**: ~97.2%
- **向量化文档数量**: 2415个
- **向量维度**: 1024 (bge-m3模型)

## 技术实现

### 向量搜索引擎

基于以下技术栈：
- **LanceDB**: 高性能向量数据库
- **Ollama**: 本地嵌入模型服务
- **bge-m3**: 多语言嵌入模型，支持中英文混合查询

### 搜索工作流程

1. **文本预处理**: 合并导航标题、页面标题和描述
2. **向量化**: 使用 bge-m3 模型生成文档嵌入向量
3. **存储**: 将向量存储到 LanceDB 中
4. **查询**: 将用户查询转换为向量并执行相似度搜索
5. **排序**: 基于相似度分数返回最相关结果

### 自动化展开策略

```javascript
// 查找未展开的菜单按钮
const expandButtons = await page.$$('.btn-expander .icon-arrow-forward-ios:not(.is-rotated)');
```

### 错误处理机制
- 自动重试机制
- 滚动到可视区域
- DOM更新等待
- 异常捕获和日志记录
- 向量服务连接检测

## 生成的数据格式

### enhanced-list.json - 增强链接数据
```json
{
  "total": 2415,
  "generated": "2025-01-12T10:30:15.387Z",
  "stats": {
    "totalLinks": 2415,
    "withPageTitle": 2380,
    "withPageDescription": 2347,
    "completionRate": {
      "pageTitle": "98.5%",
      "pageDescription": "97.2%"
    }
  },
  "links": [
    {
      "navTitle": "新内容",
      "pageTitle": "虚幻引擎新功能",
      "pageDescription": "了解虚幻引擎5.6的新功能和改进。",
      "link": "https://dev.epicgames.com/documentation/zh-cn/unreal-engine/whats-new"
    }
  ]
}
```

## 性能指标

### 构建性能
- 浏览器启动: ~2-3秒
- 页面加载: ~5-10秒  
- 导航展开: ~30-60秒
- 数据解析: ~1-2秒
- 向量化处理: ~5-10分钟 (2415个文档)
- 总构建时间: ~15-20分钟

### 查询性能
- 向量搜索响应: <200毫秒
- 数据库连接: <100毫秒
- 嵌入向量生成: ~50-100毫秒

## 技术栈

### 核心技术
- **Node.js**: 运行环境
- **TypeScript**: 类型安全的开发语言
- **MCP SDK**: Model Context Protocol 实现

### 数据采集
- **Puppeteer**: 无头浏览器控制
- **JSDOM**: HTML解析和处理
- **Playwright**: 浏览器安装管理

### 搜索技术
- **LanceDB**: 向量数据库
- **Ollama**: 本地AI模型服务
- **bge-m3**: 多语言嵌入模型
- **Apache Arrow**: 高性能数据处理

### 开发工具
- **Vitest**: 单元测试框架
- **tsx**: TypeScript执行器
- **Zod**: 参数验证
- **Rimraf**: 跨平台文件删除

## 环境变量

```bash
# 搜索结果默认限制数量
SEARCH_LIMIT_DEFAULT=10

# Ollama服务地址 (可选)
OLLAMA_BASE_URL=http://localhost:11434

# 嵌入模型名称 (可选)
OLLAMA_MODEL=bge-m3
```

## 开发与测试

### 运行测试
```bash
# 执行所有测试
npm test

# 监视模式运行测试
npm run test:watch
```

### 开发模式
```bash
# 启动开发服务器
npm run dev
```

## 故障排除

### 向量搜索不可用
1. 检查 Ollama 服务是否运行: `ollama serve`
2. 确认模型已安装: `ollama list`
3. 检查向量数据库是否存在: `sources/db/`
4. 重新构建向量数据库: `npm run build-vector-db`

### 数据获取失败
1. 检查网络连接
2. 确认虚幻引擎文档网站可访问
3. 检查浏览器安装: `npm run install-browsers`

## 后续优化计划

- [ ] 支持增量数据更新
- [ ] 添加多语言版本支持  
- [ ] 实现分布式向量搜索
- [ ] 优化向量化处理性能
- [ ] 添加搜索结果缓存
- [ ] 支持自定义嵌入模型
- [ ] 实现搜索历史分析
- [ ] 添加API速率限制

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目。

### 开发流程
1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 运行测试确保通过
5. 提交Pull Request

## 许可证

MIT License 