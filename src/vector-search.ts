import * as lancedb from "@lancedb/lancedb";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SearchResult {
  id: string;
  navTitle: string;
  pageTitle: string;
  pageDescription: string;
  link: string;
  text: string;
  score: number;
}

interface EnhancedLink {
  navTitle: string;
  link: string;
  pageTitle?: string;
  pageDescription?: string;
}

class OllamaEmbeddingFunction {
  private model: string;
  private baseUrl: string;

  constructor(
    model: string = "bge-m3",
    baseUrl: string = "http://localhost:11434"
  ) {
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      try {
        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            prompt: text,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Ollama API 请求失败: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.json();
        if (!result.embedding) {
          throw new Error("Ollama API 返回的数据中没有 embedding 字段");
        }

        embeddings.push(result.embedding);
      } catch (error) {
        console.error(
          `为文本生成嵌入向量时出错: "${text.substring(0, 50)}..."`,
          error
        );
        throw error;
      }
    }

    return embeddings;
  }
}

class VectorSearchEngine {
  private dbPath: string;
  private embeddingFunction: OllamaEmbeddingFunction;
  private table: any;
  private isInitialized: boolean = false;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || join(__dirname, "..", "..", "sources", "db");
    this.embeddingFunction = new OllamaEmbeddingFunction();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!existsSync(this.dbPath)) {
      throw new Error(
        `向量数据库不存在: ${this.dbPath}。请先运行 npm run build-vector-db 构建数据库。`
      );
    }

    try {
      const db = await lancedb.connect(this.dbPath);
      this.table = await db.openTable("documents");
      this.isInitialized = true;
      console.log("✅ 向量搜索引擎初始化成功");
    } catch (error) {
      console.error("❌ 向量搜索引擎初始化失败:", error);
      throw error;
    }
  }

  async search(query: string, limit: number = 10): Promise<EnhancedLink[]> {
    await this.initialize();

    try {
      // 生成查询向量
      const queryEmbedding = await this.embeddingFunction.embed([query]);

      // 执行向量搜索
      const results = await this.table
        .search(queryEmbedding[0])
        .limit(limit)
        .toArray();

      // 转换结果格式
      return results.map((result: any) => ({
        navTitle: result.navTitle,
        link: result.link,
        pageTitle: result.pageTitle,
        pageDescription: result.pageDescription,
      }));
    } catch (error) {
      console.error("向量搜索失败:", error);
      // 如果向量搜索失败，返回空结果
      return [];
    }
  }

  async searchWithScores(
    query: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    await this.initialize();

    try {
      // 生成查询向量
      const queryEmbedding = await this.embeddingFunction.embed([query]);

      // 执行向量搜索
      const results = await this.table
        .search(queryEmbedding[0])
        // 默认确保按照 score 降序排列（相似度越高越靠前）
        .limit(limit)
        .toArray();

      // 转换结果格式并计算相似度分数
      return results.map((result: any) => ({
        id: result.id,
        navTitle: result.navTitle,
        pageTitle: result.pageTitle,
        pageDescription: result.pageDescription,
        link: result.link,
        text: result.text,
        score: 1 - result._distance, // 将距离转换为相似度分数
      }));
    } catch (error) {
      console.error("向量搜索失败:", error);
      return [];
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // 检查数据库是否存在
      if (!existsSync(this.dbPath)) {
        return false;
      }

      // 检查 Ollama 服务是否可用
      await this.embeddingFunction.embed(["测试"]);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// 创建全局实例
let vectorSearchEngine: VectorSearchEngine | null = null;

export function getVectorSearchEngine(): VectorSearchEngine {
  if (!vectorSearchEngine) {
    vectorSearchEngine = new VectorSearchEngine();
  }
  return vectorSearchEngine;
}

export {
  VectorSearchEngine,
  SearchResult,
  EnhancedLink,
  OllamaEmbeddingFunction,
};
