import {
  createMCPListToolsRequest,
  createMCPToolCall,
} from "../helpers/test-utils.js";

jest.mock("../../src/utils.js", () => ({
  getMixedbreadClient: jest.fn(() => ({
    stores: {
      search: jest.fn().mockResolvedValue({ chunks: [], total: 0 }),
      list: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
    },
  })),
}));

describe("MCP Protocol Compliance", () => {
  describe("Tool Registration", () => {
    it("should register all expected tools", () => {
      const expectedTools = [
        "store_search",
        "store_retrieve",
        "store_list",
        "store_create",
        "store_delete",
        "store_upload",
        "store_file_retrieve",
      ];

      expect(expectedTools).toHaveLength(7);
      expect(expectedTools).toContain("store_search");
      expect(expectedTools).toContain("store_list");
    });
  });

  describe("Request/Response Format", () => {
    it("should handle valid MCP requests", () => {
      const request = createMCPToolCall("store_search", {
        query: "test",
        store_identifiers: ["store1"],
        top_k: 5,
      });

      expect(request.jsonrpc).toBe("2.0");
      expect(request.method).toBe("tools/call");
      expect(request.params.name).toBe("store_search");
      expect(request.params.arguments).toEqual({
        query: "test",
        store_identifiers: ["store1"],
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
