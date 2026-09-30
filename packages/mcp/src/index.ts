#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { storeCreate } from "./tools/store-create.js";
import { storeDelete } from "./tools/store-delete.js";
import { storeFileRetrieve } from "./tools/store-file-retrieve.js";
import { storeList } from "./tools/store-list.js";
import { storeRetrieve } from "./tools/store-retrieve.js";
import { storeSearch } from "./tools/store-search.js";
import { storeUpload } from "./tools/store-upload.js";
import {
  StoreCreateSchema,
  StoreDeleteSchema,
  StoreFileRetrieveSchema,
  StoreListSchema,
  StoreRetrieveSchema,
  StoreSearchSchema,
  StoreUploadSchema,
} from "./types/index.js";

const server = new Server(
  {
    name: "mixedbread-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "store_search",
        description:
          "Search for chunks within stores based on their relevance to the query",
        inputSchema: zodToJsonSchema(StoreSearchSchema),
      },
      {
        name: "store_retrieve",
        description: "Retrieve detailed information about a specific store",
        inputSchema: zodToJsonSchema(StoreRetrieveSchema),
      },
      {
        name: "store_list",
        description: "List all stores",
        inputSchema: zodToJsonSchema(StoreListSchema),
      },
      {
        name: "store_create",
        description: "Create a new store",
        inputSchema: zodToJsonSchema(StoreCreateSchema),
      },
      {
        name: "store_delete",
        description: "Delete a store",
        inputSchema: zodToJsonSchema(StoreDeleteSchema),
      },
      {
        name: "store_upload",
        description: "Upload a file to a store",
        inputSchema: zodToJsonSchema(StoreUploadSchema),
      },
      {
        name: "store_file_retrieve",
        description:
          "Retrieve detailed information about a specific file in a store",
        inputSchema: zodToJsonSchema(StoreFileRetrieveSchema),
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "store_search": {
        const validatedArgs = StoreSearchSchema.parse(args);
        return await storeSearch(validatedArgs);
      }

      case "store_retrieve": {
        const validatedArgs = StoreRetrieveSchema.parse(args);
        return await storeRetrieve(validatedArgs);
      }

      case "store_list": {
        const validatedArgs = StoreListSchema.parse(args);
        return await storeList(validatedArgs);
      }

      case "store_create": {
        const validatedArgs = StoreCreateSchema.parse(args);
        return await storeCreate(validatedArgs);
      }

      case "store_delete": {
        const validatedArgs = StoreDeleteSchema.parse(args);
        return await storeDelete(validatedArgs);
      }

      case "store_upload": {
        const validatedArgs = StoreUploadSchema.parse(args);
        return await storeUpload(validatedArgs);
      }

      case "store_file_retrieve": {
        const validatedArgs = StoreFileRetrieveSchema.parse(args);
        return await storeFileRetrieve(validatedArgs);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mixedbread MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
