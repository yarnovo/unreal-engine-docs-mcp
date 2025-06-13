# 测试说明

## 概述

本项目包含MCP服务端的集成测试，主要测试虚幻引擎文档搜索功能。

## 环境依赖

### 本地开发环境
- **Ollama服务**: 用于向量语义搜索
- **向量数据库**: 预构建的文档向量数据

### CI环境
在CI环境中，测试会使用vitest的`skipIf`功能自动跳过需要外部服务的测试用例，只执行基础功能验证。

## 测试用例

### 1. 工具列表测试 (CI环境跳过)
验证MCP服务端能够正确返回可用工具列表。

### 2. 混合搜索测试 (CI环境跳过)
测试语义搜索和关键词搜索的混合功能，支持中英文搜索。

### 3. 基础功能测试 (总是执行)
在所有环境中执行的轻量级测试，验证测试框架和基础JavaScript功能。

## CI环境检测

测试通过检测 `CI` 环境变量来判断是否在CI环境中：
```javascript
const isCI = !!process.env.CI;
```

使用vitest的 `it.skipIf(isCI)` 功能优雅地跳过需要外部服务的测试。

## 运行测试

### 本地开发
```bash
# 运行所有测试（需要Ollama服务）
npm test

# 监听模式
npm run test:watch
```

### CI环境
```bash
# CI环境测试（自动跳过依赖外部服务的测试）
npm run test:ci
```

## Git Hooks

项目集成了Husky，在每次commit前会自动：
1. 构建项目 (`npm run build`)
2. 运行测试 (`npm test`)

如果构建或测试失败，commit会被阻止。

## 测试输出示例

### CI环境
```
✓ tests/mcp-client.test.ts > MCP 服务端测试 > 应该能列出可用工具 [skipped]
✓ tests/mcp-client.test.ts > MCP 服务端测试 > 应该能调用混合搜索工具 [skipped]  
✓ tests/mcp-client.test.ts > MCP 服务端测试 > CI环境基础测试：验证测试环境配置
```

### 本地环境
```
✓ tests/mcp-client.test.ts > MCP 服务端测试 > 应该能列出可用工具
✓ tests/mcp-client.test.ts > MCP 服务端测试 > 应该能调用混合搜索工具
✓ tests/mcp-client.test.ts > MCP 服务端测试 > CI环境基础测试：验证测试环境配置
```

## 故障排除

### 测试在本地失败
1. 确保Ollama服务正在运行
2. 确保向量数据库已构建 (`npm run build-vector-db`)
3. 检查依赖是否正确安装 (`npm ci`)

### CI测试失败
1. 检查基础功能测试是否通过
2. 查看CI日志中的详细错误信息
3. 确保代码构建成功 