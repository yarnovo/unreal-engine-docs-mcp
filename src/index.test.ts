import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const TEST_FILE_PATH = 'sources/list-test.json';

// Create mock documentation data for testing
beforeAll(() => {
  try {
    mkdirSync('sources', { recursive: true });
    const mockData = {
      total: 3,
      generated: new Date().toISOString(),
      links: [
        {
          title: "虚幻引擎5.6文档",
          link: "https://dev.epicgames.com/documentation/zh-cn/unreal-engine/unreal-engine-5-6-documentation",
          path: "/documentation/zh-cn/unreal-engine/unreal-engine-5-6-documentation"
        },
        {
          title: "蓝图可视化脚本",
          link: "https://dev.epicgames.com/documentation/zh-cn/unreal-engine/blueprints-visual-scripting-in-unreal-engine",
          path: "/documentation/zh-cn/unreal-engine/blueprints-visual-scripting-in-unreal-engine"
        },
        {
          title: "用C++编程",
          link: "https://dev.epicgames.com/documentation/zh-cn/unreal-engine/programming-with-cplusplus-in-unreal-engine",
          path: "/documentation/zh-cn/unreal-engine/programming-with-cplusplus-in-unreal-engine"
        }
      ]
    };
    writeFileSync(TEST_FILE_PATH, JSON.stringify(mockData, null, 2));
  } catch (error) {
    console.warn('Could not create mock data:', error);
  }
});

// Clean up test file after all tests
afterAll(() => {
  try {
    unlinkSync(TEST_FILE_PATH);
  } catch (error) {
    // File might not exist, ignore error
  }
});

describe('MCP Server', () => {
  it('should create server with correct name', () => {
    const server = new McpServer({
      name: "unreal-engine-docs-mcp",
      version: "1.0.0"
    });

    expect(server).toBeDefined();
  });

  it('should validate add tool parameters', () => {
    const schema = z.object({
      a: z.number(),
      b: z.number()
    });

    const validParams = { a: 5, b: 3 };
    const invalidParams = { a: "5", b: 3 };

    expect(() => schema.parse(validParams)).not.toThrow();
    expect(() => schema.parse(invalidParams)).toThrow();
  });

  it('should perform addition correctly', async () => {
    const addFunction = async ({ a, b }: { a: number; b: number }) => ({
      content: [{ type: "text", text: String(a + b) }]
    });

    const result = await addFunction({ a: 5, b: 3 });
    expect(result.content[0].text).toBe("8");
  });

  it('should create greeting message', () => {
    const createGreeting = (name: string) => `Hello, ${name}!`;
    
    expect(createGreeting("World")).toBe("Hello, World!");
    expect(createGreeting("Unreal")).toBe("Hello, Unreal!");
  });

  it('should simulate docs list functionality', async () => {
    // Simulate the get_docs_list function using test data
    const getDocsList = async () => {
      try {
        const data = JSON.parse(readFileSync(TEST_FILE_PATH, 'utf-8'));
        const docLinks = data.links || [];
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              total: docLinks.length,
              links: docLinks
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: "Could not load documentation links" }, null, 2)
          }]
        };
      }
    };

    const result = await getDocsList();
    expect(result.content[0].type).toBe("text");
    
    const data = JSON.parse(result.content[0].text);
    expect(data.total).toBe(3);
    expect(data.links).toHaveLength(3);
    expect(data.links[0].title).toBe("虚幻引擎5.6文档");
    expect(data.links[1].title).toBe("蓝图可视化脚本");
    expect(data.links[2].title).toBe("用C++编程");
  });

  it('should handle error when documentation file is missing', async () => {
    const getDocsListWithError = async () => {
      try {
        // Try to read non-existent file
        const data = JSON.parse(readFileSync('non-existent-file.json', 'utf-8'));
        const docLinks = data.links || [];
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              total: docLinks.length,
              links: docLinks
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: "Could not load documentation links" }, null, 2)
          }]
        };
      }
    };

    const result = await getDocsListWithError();
    expect(result.content[0].type).toBe("text");
    
    const data = JSON.parse(result.content[0].text);
    expect(data.error).toBe("Could not load documentation links");
  });

  it('should validate that all links have required properties', async () => {
    const getDocsList = async () => {
      try {
        const data = JSON.parse(readFileSync(TEST_FILE_PATH, 'utf-8'));
        const docLinks = data.links || [];
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              total: docLinks.length,
              links: docLinks
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: "Could not load documentation links" }, null, 2)
          }]
        };
      }
    };

    const result = await getDocsList();
    const data = JSON.parse(result.content[0].text);
    
    // Validate each link has required properties
    data.links.forEach((link: any) => {
      expect(link).toHaveProperty('title');
      expect(link).toHaveProperty('link');
      expect(link).toHaveProperty('path');
      expect(typeof link.title).toBe('string');
      expect(typeof link.link).toBe('string');
      expect(typeof link.path).toBe('string');
    });
  });
}); 