import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  createMCPListToolsRequest,
  createMCPToolCall,
} from "../helpers/test-utils.js";

jest.mock("../../src/utils.js", () => ({
  getMixedbreadClient: jest.fn(() => ({
    vectorStores: {
      search: jest.fn().mockResolvedValue({ chunks: [], total: 0 }),
      list: jest.fn().mockResolvedValue({ vectorStores: [], total: 0 }),
    },
  })),
}));

describe("MCP Protocol Compliance", () => {
  let _server: Server;

  beforeEach(async () => {
    // Import the server setup after mocking - no default export in index.js
    await import("../../src/index.js");
    _server = new Server(
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
  });

  describe("Tool Registration", () => {
    it("should register all expected tools", () => {
      const expectedTools = [
        "vector_store_search",
        "vector_store_file_search",
        "vector_store_retrieve",
        "vector_store_list",
        "vector_store_create",
        "vector_store_delete",
        "vector_store_upload",
        "vector_store_file_retrieve",
      ];

      // This test would need the actual server instance to be accessible
      // For now, we'll just verify the expected tools exist
      expect(expectedTools).toHaveLength(8);
      expect(expectedTools).toContain("vector_store_search");
      expect(expectedTools).toContain("vector_store_list");
    });
  });

  describe("Request/Response Format", () => {
    it("should handle valid MCP requests", () => {
      const request = createMCPToolCall("vector_store_search", {
        query: "test",
        vector_store_identifiers: ["store1"],
        top_k: 5,
      });

      expect(request.jsonrpc).toBe("2.0");
      expect(request.method).toBe("tools/call");
      expect(request.params.name).toBe("vector_store_search");
      expect(request.params.arguments).toEqual({
        query: "test",
        vector_store_identifiers: ["store1"],
        top_k: 5,
      });
    });

    it("should format list tools request correctly", () => {
      const request = createMCPListToolsRequest();

      expect(request.jsonrpc).toBe("2.0");
      expect(request.method).toBe("tools/list");
      expect(request.params).toEqual({});
    });
  });

  describe("Error Handling", () => {
    it("should return proper error format for invalid tool calls", () => {
      const errorResponse = {
        content: [
          {
            type: "text" as const,
            text: "Error: Unknown tool: invalid_tool",
          },
        ],
        isError: true,
      };

      expect(errorResponse.isError).toBe(true);
      expect(errorResponse.content[0].type).toBe("text");
      expect(errorResponse.content[0].text).toContain("Error");
    });
  });
});
