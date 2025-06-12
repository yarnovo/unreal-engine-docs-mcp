# Unreal Engine Docs MCP Server

🎮 **虚幻引擎文档 MCP 服务器** - 为Model Context Protocol提供虚幻引擎5.6中文文档访问。

## 🚀 快速开始

### 安装使用

```bash
# 直接运行（推荐）
npx unreal-engine-docs-mcp

# 或全局安装
npm install -g unreal-engine-docs-mcp
unreal-engine-docs-mcp
```

### MCP 客户端配置

在你的 MCP 配置文件中添加：

```json
{
  "mcpServers": {
    "unreal-engine-docs": {
      "command": "npx",
      "args": ["-y", "unreal-engine-docs-mcp"]
    }
  }
}
```

## 🔧 可用工具

### `get_docs_list` - 获取所有文档列表
```json
{
  "name": "get_docs_list",
  "arguments": {}
}
```

返回所有虚幻引擎文档链接，无需分页参数。

## 📋 文档数据

- **总链接数**: 87个
- **文档版本**: 虚幻引擎5.6中文文档
- **涵盖内容**: 入门指南、编程教程、蓝图、C++、工具使用等

## 🛠️ 开发

### 本地开发

```bash
# 克隆项目
git clone <your-repo-url>
cd unreal-engine-docs-mcp

# 安装依赖
npm install

# 解析导航数据（如需更新文档）
npm run parse-nav

# 运行测试
npm test

# 构建项目
npm run build

# 本地运行
npm run dev
```

### 项目结构

```
├── src/
│   ├── index.ts          # MCP服务器主文件
│   └── index.test.ts     # 测试文件
├── scripts/
│   └── parse-nav.js      # HTML解析脚本
├── sources/
│   └── list.json         # 文档链接数据
├── .github/workflows/
│   └── release.yml       # GitHub Actions配置
└── nav.html             # 原始导航HTML文件
```

## 🚀 发布流程

### GitHub Actions 自动化

本项目使用 GitHub Actions 实现自动测试和发布：

#### 🔄 **触发条件**
- **Push 到 main 分支**: 运行测试
- **Pull Request**: 运行测试  
- **版本标签 (v*.*.*)**: 运行测试 + 发布到 NPM

#### 📝 **发布步骤**

1. **更新版本号**
   ```bash
   npm version patch  # 或 minor, major
   ```

2. **推送标签**
   ```bash
   git push origin main --tags
   ```

3. **自动发布**
   - GitHub Actions 会自动运行测试
   - 验证版本标签与 package.json 匹配
   - 发布到 NPM
   - 创建 GitHub Release

#### 🔑 **所需 Secrets**

在 GitHub 仓库设置中添加以下 secrets：

- `NPM_TOKEN`: NPM 发布令牌
  ```bash
  # 获取 NPM token
  npm login
  npm token create --read-only=false
  ```

### 手动发布

```bash
# 构建项目
npm run build

# 发布到 NPM
npm publish
```

## ⚙️ GitHub Actions 详细配置

### 测试作业 (test)
- **运行环境**: Ubuntu Latest
- **Node.js 版本**: 18.x, 20.x (矩阵测试)
- **步骤**:
  1. 检出代码
  2. 设置 Node.js
  3. 安装依赖
  4. 运行测试
  5. 构建项目
  6. 解析文档数据
  7. 验证输出

### 发布作业 (publish)
- **触发条件**: 仅在版本标签时运行
- **依赖**: test 作业成功
- **步骤**:
  1. 检出代码
  2. 设置 Node.js
  3. 安装依赖和构建
  4. 验证版本匹配
  5. 发布到 NPM
  6. 创建 GitHub Release

## 📄 许可证

ISC License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️ for Unreal Engine developers** 