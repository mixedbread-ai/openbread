import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { createMcpHandler, experimental_withMcpAuth } from "mcp-handler";
import { vectorStoreCreate } from "@/lib/tools/vector-store-create";
import { vectorStoreDelete } from "@/lib/tools/vector-store-delete";
import { vectorStoreFileRetrieve } from "@/lib/tools/vector-store-file-retrieve";
import { vectorStoreFileSearch } from "@/lib/tools/vector-store-file-search";
import { vectorStoreList } from "@/lib/tools/vector-store-list";
import { vectorStoreRetrieve } from "@/lib/tools/vector-store-retrieve";
import { vectorStoreSearch } from "@/lib/tools/vector-store-search";
import { vectorStoreUpload } from "@/lib/tools/vector-store-upload";
import {
  VectorStoreCreateSchema,
  VectorStoreDeleteSchema,
  VectorStoreFileRetrieveSchema,
  VectorStoreFileSearchSchema,
  VectorStoreListSchema,
  VectorStoreRetrieveSchema,
  VectorStoreSearchSchema,
  VectorStoreUploadSchema,
} from "@/lib/types";
import { createMcpAuthVerifier, getApiKeyFromMcpContext } from "@/lib/utils";

// Create the MCP handler
const baseHandler = createMcpHandler(
  (server) => {
    // Vector Store Search
    server.tool(
      "vector_store_search",
      "Search for chunks within vector stores based of their relevance to the query",
      VectorStoreSearchSchema.shape,
      async (
        args,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ) => {
        const apiKey = getApiKeyFromMcpContext(extra);
        if (!apiKey) {
          return {
            content: [
              {
                type: "text",
                text: "Error: API key is required. Please provide it via Authorization header or MXBAI_API_KEY environment variable.",
              },
            ],
          };
        }
        return await vectorStoreSearch(args, apiKey);
      }
    );

    // Vector Store File Search
    server.tool(
      "vector_store_file_search",
      "Search for files within vector stores based of their relevance to the query",
      VectorStoreFileSearchSchema.shape,
      async (
        args,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ) => {
        const apiKey = getApiKeyFromMcpContext(extra);
        if (!apiKey) {
          return {
            content: [
              {
                type: "text",
                text: "Error: API key is required. Please provide it via Authorization header or MXBAI_API_KEY environment variable.",
              },
            ],
          };
        }
        return await vectorStoreFileSearch(args, apiKey);
      }
    );

    // Vector Store Retrieve
    server.tool(
      "vector_store_retrieve",
      "Retrieve detailed information about a specific vector store",
      VectorStoreRetrieveSchema.shape,
      async (
        args,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ) => {
        const apiKey = getApiKeyFromMcpContext(extra);
        if (!apiKey) {
          return {
            content: [
              {
                type: "text",
                text: "Error: API key is required. Please provide it via Authorization header or MXBAI_API_KEY environment variable.",
              },
            ],
          };
        }
        return await vectorStoreRetrieve(args, apiKey);
      }
    );

    // Vector Store List
    server.tool(
      "vector_store_list",
      "List all vector stores",
      VectorStoreListSchema.shape,
      async (
        args,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ) => {
        const apiKey = getApiKeyFromMcpContext(extra);
        if (!apiKey) {
          return {
            content: [
              {
                type: "text",
                text: "Error: API key is required. Please provide it via Authorization header or MXBAI_API_KEY environment variable.",
              },
            ],
          };
        }
        return await vectorStoreList(args, apiKey);
      }
    );

    // Vector Store Create
    server.tool(
      "vector_store_create",
      "Create a new vector store",
      VectorStoreCreateSchema.shape,
      async (
        args,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ) => {
        const apiKey = getApiKeyFromMcpContext(extra);
        if (!apiKey) {
          return {
            content: [
              {
                type: "text",
                text: "Error: API key is required. Please provide it via Authorization header or MXBAI_API_KEY environment variable.",
              },
            ],
          };
        }
        return await vectorStoreCreate(args, apiKey);
      }
    );

    // Vector Store Delete
    server.tool(
      "vector_store_delete",
      "Delete a vector store",
      VectorStoreDeleteSchema.shape,
      async (
        args,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ) => {
        const apiKey = getApiKeyFromMcpContext(extra);
        if (!apiKey) {
          return {
            content: [
              {
                type: "text",
                text: "Error: API key is required. Please provide it via Authorization header or MXBAI_API_KEY environment variable.",
              },
            ],
          };
        }
        return await vectorStoreDelete(args, apiKey);
      }
    );

    // Vector Store Upload
    server.tool(
      "vector_store_upload",
      "Upload a file to a vector store",
      VectorStoreUploadSchema.shape,
      async (
        args,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ) => {
        const apiKey = getApiKeyFromMcpContext(extra);
        if (!apiKey) {
          return {
            content: [
              {
                type: "text",
                text: "Error: API key is required. Please provide it via Authorization header or MXBAI_API_KEY environment variable.",
              },
            ],
          };
        }
        return await vectorStoreUpload(args, apiKey);
      }
    );

    // Vector Store File Retrieve
    server.tool(
      "vector_store_file_retrieve",
      "Retrieve detailed information about a specific file in a vector store",
      VectorStoreFileRetrieveSchema.shape,
      async (
        args,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ) => {
        const apiKey = getApiKeyFromMcpContext(extra);
        if (!apiKey) {
          return {
            content: [
              {
                type: "text",
                text: "Error: API key is required. Please provide it via Authorization header or MXBAI_API_KEY environment variable.",
              },
            ],
          };
        }
        return await vectorStoreFileRetrieve(args, apiKey);
      }
    );
  },
  {
    serverInfo: {
      name: "mixedbread-mcp-server",
      version: "1.0.0",
    },
  },
  {
    basePath: "/api",
    verboseLogs: process.env.NODE_ENV === "development",
  }
);

const handler = experimental_withMcpAuth(baseHandler, createMcpAuthVerifier(), {
  required: false,
});

export { handler as GET, handler as POST };
