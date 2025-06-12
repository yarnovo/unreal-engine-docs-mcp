#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json to get version
let packageVersion = "1.0.0"; // fallback version
try {
  const packagePath = join(__dirname, "..", "package.json");
  const packageData = JSON.parse(readFileSync(packagePath, "utf-8"));
  packageVersion = packageData.version;
} catch (error) {
  console.warn(
    "Could not load package version:",
    error instanceof Error ? error.message : String(error)
  );
}

// Load documentation links
let docLinks: Array<{ title: string; link: string; path: string }> = [];
try {
  const sourcesPath = join(__dirname, "..", "sources", "list.json");
  const data = JSON.parse(readFileSync(sourcesPath, "utf-8"));
  docLinks = data.links || [];
} catch (error) {
  console.warn(
    "Could not load documentation links:",
    error instanceof Error ? error.message : String(error)
  );
}

const server = new McpServer({
  name: "unreal-engine-docs-mcp",
  version: packageVersion,
});

// Get all Unreal Engine documentation links
server.tool(
  "get_docs_list",
  {},
  async () => {
    const result = {
      total: docLinks.length,
      links: docLinks,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Create stdio transport
const transport = new StdioServerTransport();

// Connect server to stdio transport
server.connect(transport);
