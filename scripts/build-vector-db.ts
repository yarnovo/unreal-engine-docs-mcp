import * as lancedb from "@lancedb/lancedb";
import { readFileSync, existsSync, rmSync, statSync, readdirSync } from "fs";
import { join } from "path";

interface EnhancedDoc {
  navTitle: string;
  link: string;
  pageTitle?: string;
  pageDescription?: string;
}

interface DocumentInput {
  id: string;
  navTitle: string;
  pageTitle: string;
  pageDescription: string;
  link: string;
  text: string;
  vector?: number[];
  [key: string]: any;
}

// 自定义嵌入函数类，调用本地 ollama 服务
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

async function buildVectorDatabase(): Promise<void> {
  const dbPath = join("sources", "db");
  const sourceFile = join("sources", "enhanced-list.json");

  // 检查源文件是否存在
  if (!existsSync(sourceFile)) {
    console.error("❌ enhanced-list.json 文件不存在");
    process.exit(1);
  }

  // 删除现有数据库
  if (existsSync(dbPath)) {
    console.log("🗑️  删除现有数据库...");
    rmSync(dbPath, { recursive: true, force: true });
  }

  console.log("📖 读取源数据...");
  const rawData = readFileSync(sourceFile, "utf-8");
  const jsonData = JSON.parse(rawData);
  const enhancedDocs: EnhancedDoc[] = jsonData.links || [];

  console.log(`📊 找到 ${enhancedDocs.length} 个文档`);

  // 初始化嵌入函数
  console.log("🤖 初始化 Ollama 嵌入服务...");
  const embeddingFunction = new OllamaEmbeddingFunction();

  // 测试 Ollama 连接
  try {
    await embeddingFunction.embed(["测试连接"]);
    console.log("✅ Ollama 服务连接成功");
  } catch (error) {
    console.error(
      "❌ 无法连接到 Ollama 服务，请确保 Ollama 正在运行并且已安装 bge-m3 模型"
    );
    console.error("   运行命令: ollama pull bge-m3");
    process.exit(1);
  }

  // 合并文档文本
  function combineDocumentText(doc: EnhancedDoc): string {
    const navTitle = doc.navTitle;
    const pageTitle = doc.pageTitle || "";
    const pageDescription = doc.pageDescription || "";

    return `导航标题: ${navTitle}\n页面标题: ${pageTitle}\n页面描述: ${pageDescription}`.trim();
  }

  // 准备数据
  console.log("📝 准备数据用于向量化...");
  const documents: DocumentInput[] = enhancedDocs.map((doc, index) => ({
    id: `doc_${index}`,
    navTitle: doc.navTitle,
    pageTitle: doc.pageTitle || "",
    pageDescription: doc.pageDescription || "",
    link: doc.link,
    text: combineDocumentText(doc),
  }));

  // 批处理向量化
  const batchSize = 50;
  console.log(`🔄 开始向量化处理 (批次大小: ${batchSize})...`);

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const texts = batch.map((doc) => doc.text);

    console.log(
      `处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        documents.length / batchSize
      )} (${i + 1}-${Math.min(i + batchSize, documents.length)})`
    );

    try {
      const embeddings = await embeddingFunction.embed(texts);

      // 将嵌入向量添加到文档中
      batch.forEach((doc, index) => {
        doc.vector = embeddings[index];
      });
    } catch (error) {
      console.error(
        `❌ 批次 ${Math.floor(i / batchSize) + 1} 处理失败:`,
        error
      );
      process.exit(1);
    }
  }

  console.log("💾 连接到 LanceDB 并创建表...");

  // 连接到 LanceDB
  const db = await lancedb.connect(dbPath);

  // 创建表
  const table = await db.createTable("documents", documents, {
    mode: "overwrite",
  });

  console.log("✅ 向量数据库构建完成!");

  // 打印数据库信息
  const dbSize = getDirectorySize(dbPath);
  const vectorCount = documents.length;
  const sampleDoc = documents[0];
  const vectorDimension = sampleDoc.vector?.length || 0;

  console.log("\n📊 数据库统计信息:");
  console.log(`   📍 位置: ${dbPath}`);
  console.log(`   📏 大小: ${formatBytes(dbSize)}`);
  console.log(`   📄 文档数量: ${vectorCount}`);
  console.log(`   🔢 向量维度: ${vectorDimension}`);
  console.log(`   🤖 嵌入模型: bge-m3 (via Ollama)`);
  console.log(`   🔗 连接地址: http://localhost:11434`);

  // 执行测试查询
  console.log("\n🔍 执行测试查询...");
  try {
    const testQuery = "虚幻引擎";
    const testEmbedding = await embeddingFunction.embed([testQuery]);

    const results = await table.search(testEmbedding[0]).limit(3).toArray();

    console.log(`   查询: "${testQuery}"`);
    console.log(`   找到 ${results.length} 个相关结果:`);

    results.forEach((result, index) => {
      console.log(
        `   ${index + 1}. ${result.navTitle} (相似度: ${(
          1 - result._distance
        ).toFixed(3)})`
      );
    });
  } catch (error) {
    console.error("⚠️  测试查询失败:", error);
  }

  console.log(`\n🎉 向量数据库构建成功完成!`);
}

function getDirectorySize(dirPath: string): number {
  let totalSize = 0;

  function calculateSize(path: string) {
    try {
      const stats = statSync(path);
      if (stats.isDirectory()) {
        const files = readdirSync(path);
        files.forEach((file: string) => {
          calculateSize(join(path, file));
        });
      } else {
        totalSize += stats.size;
      }
    } catch (error) {
      // 忽略无法访问的文件
    }
  }

  calculateSize(dirPath);
  return totalSize;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 主执行函数
async function main() {
  try {
    await buildVectorDatabase();
    console.log("✨ 脚本执行完成");
  } catch (error) {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  }
}

// 检查是否是直接执行的脚本
if (
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1].includes("build-vector-db")
) {
  main();
}

export { buildVectorDatabase, OllamaEmbeddingFunction };
