import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  VectorStoreSearchSchema,
  VectorStoreFileSearchSchema,
  VectorStoreRetrieveSchema,
  VectorStoreListSchema,
  VectorStoreCreateSchema,
  VectorStoreDeleteSchema,
  VectorStoreUploadSchema,
  VectorStoreFileRetrieveSchema,
} from "./types/index.js";
import { vectorStoreSearch } from "./tools/vector-store-search.js";
import { vectorStoreFileSearch } from "./tools/vector-store-file-search.js";
import { vectorStoreRetrieve } from "./tools/vector-store-retrieve.js";
import { vectorStoreList } from "./tools/vector-store-list.js";
import { vectorStoreCreate } from "./tools/vector-store-create.js";
import { vectorStoreDelete } from "./tools/vector-store-delete.js";
import { vectorStoreUpload } from "./tools/vector-store-upload.js";
import { vectorStoreFileRetrieve } from "./tools/vector-store-file-retrieve.js";

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
        name: "vector_store_search",
        description:
          "Search for chunks within vector stores based of their relevance to the query",
        inputSchema: zodToJsonSchema(VectorStoreSearchSchema),
      },
      {
        name: "vector_store_file_search",
        description:
          "Search for files within vector stores based of their relevance to the query",
        inputSchema: zodToJsonSchema(VectorStoreFileSearchSchema),
      },
      {
        name: "vector_store_retrieve",
        description:
          "Retrieve detailed information about a specific vector store",
        inputSchema: zodToJsonSchema(VectorStoreRetrieveSchema),
      },
      {
        name: "vector_store_list",
        description: "List all vector stores",
        inputSchema: zodToJsonSchema(VectorStoreListSchema),
      },
      {
        name: "vector_store_create",
        description: "Create a new vector store",
        inputSchema: zodToJsonSchema(VectorStoreCreateSchema),
      },
      {
        name: "vector_store_delete",
        description: "Delete a vector store",
        inputSchema: zodToJsonSchema(VectorStoreDeleteSchema),
      },
      {
        name: "vector_store_upload",
        description: "Upload a file to a vector store",
        inputSchema: zodToJsonSchema(VectorStoreUploadSchema),
      },
      {
        name: "vector_store_file_retrieve",
        description:
          "Retrieve detailed information about a specific file in a vector store",
        inputSchema: zodToJsonSchema(VectorStoreFileRetrieveSchema),
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "vector_store_search": {
        const validatedArgs = VectorStoreSearchSchema.parse(args);
        return await vectorStoreSearch(validatedArgs);
      }

      case "vector_store_file_search": {
        const validatedArgs = VectorStoreFileSearchSchema.parse(args);
        return await vectorStoreFileSearch(validatedArgs);
      }

      case "vector_store_retrieve": {
        const validatedArgs = VectorStoreRetrieveSchema.parse(args);
        return await vectorStoreRetrieve(validatedArgs);
      }

      case "vector_store_list": {
        const validatedArgs = VectorStoreListSchema.parse(args);
        return await vectorStoreList(validatedArgs);
      }

      case "vector_store_create": {
        const validatedArgs = VectorStoreCreateSchema.parse(args);
        return await vectorStoreCreate(validatedArgs);
      }

      case "vector_store_delete": {
        const validatedArgs = VectorStoreDeleteSchema.parse(args);
        return await vectorStoreDelete(validatedArgs);
      }

      case "vector_store_upload": {
        const validatedArgs = VectorStoreUploadSchema.parse(args);
        return await vectorStoreUpload(validatedArgs);
      }

      case "vector_store_file_retrieve": {
        const validatedArgs = VectorStoreFileRetrieveSchema.parse(args);
        return await vectorStoreFileRetrieve(validatedArgs);
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
