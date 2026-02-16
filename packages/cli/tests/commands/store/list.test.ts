import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type Mixedbread from "@mixedbread/sdk";
import type { CursorResponse } from "@mixedbread/sdk/core/pagination.mjs";
import type { Store } from "@mixedbread/sdk/resources/index.mjs";
import type { Command } from "commander";
import { createListCommand } from "../../../src/commands/store/list";
import * as clientUtils from "../../../src/utils/client";
import * as outputUtils from "../../../src/utils/output";

// Mock dependencies
jest.mock("../../../src/utils/client");
jest.mock("../../../src/utils/output", () => ({
  ...(jest.requireActual("../../../src/utils/output") as object),
  formatOutput: jest.fn(),
}));

// Explicit mock definitions
const mockCreateClient = clientUtils.createClient as jest.MockedFunction<
  typeof clientUtils.createClient
>;
const mockFormatOutput = outputUtils.formatOutput as jest.MockedFunction<
  typeof outputUtils.formatOutput
>;

// Helper to create a properly typed mock cursor
// Since the Cursor class has private fields, we need to use type assertion
// but we avoid 'any' by being specific about what we're mocking
const createMockCursor = (
  data: Store[],
  pagination: CursorResponse.Pagination
): CursorResponse<Store> => {
  return {
    data,
    pagination,
  } as unknown as CursorResponse<Store>;
};

describe("Store List Command", () => {
  let command: Command;
  let mockClient: {
    stores: {
      list: jest.MockedFunction<
        (options: { limit?: number }) => Promise<CursorResponse<Store>>
      >;
    };
  };

  beforeEach(() => {
    command = createListCommand();

    // Setup mock client
    mockClient = {
      stores: {
        list: jest.fn(),
      },
    };

    // Setup default mocks
    mockCreateClient.mockReturnValue(mockClient as unknown as Mixedbread);
    mockFormatOutput.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic listing", () => {
    it("should list stores with default options", async () => {
      const mockData = [
        {
          id: "550e8400-e29b-41d4-a716-446655440021",
          name: "store1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          file_counts: { total: 10 },
          usage_bytes: 1048576,
          expires_at: null,
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440022",
          name: "store2",
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          file_counts: { total: 5 },
          usage_bytes: 524288,
          expires_at: null,
        },
      ];

      mockClient.stores.list.mockResolvedValue(
        createMockCursor(mockData, {
          first_cursor: "123",
          last_cursor: "456",
          has_more: true,
          total: 2,
        })
      );

      await command.parseAsync(["node", "list"]);

      expect(mockClient.stores.list).toHaveBeenCalledWith({
        limit: 100,
      });

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            id: expect.any(String),
            status: expect.any(String),
            files: expect.any(Number),
            usage: expect.any(String),
            created: expect.any(String),
          }),
        ]),
        undefined
      );
    });

    it("should format byte sizes correctly", async () => {
      const mockData = [
        {
          id: "550e8400-e29b-41d4-a716-446655440021",
          name: "small",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          file_counts: { total: 1 },
          usage_bytes: 1024, // 1 KB
          expires_at: null,
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440022",
          name: "medium",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          file_counts: { total: 1 },
          usage_bytes: 1048576, // 1 MB
          expires_at: null,
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440023",
          name: "large",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          file_counts: { total: 1 },
          usage_bytes: 1073741824, // 1 GB
          expires_at: null,
        },
      ];

      mockClient.stores.list.mockResolvedValue(
        createMockCursor(mockData, {
          first_cursor: "123",
          last_cursor: "456",
          has_more: true,
          total: 2,
        })
      );

      await command.parseAsync(["node", "list"]);

      const formattedData = mockFormatOutput.mock.calls[0]?.[0] as any;

      expect(formattedData[0].usage).toBe("1 KB");
      expect(formattedData[1].usage).toBe("1 MB");
      expect(formattedData[2].usage).toBe("1 GB");
    });

    it("should handle empty results", async () => {
      mockClient.stores.list.mockResolvedValue(
        createMockCursor([], {
          first_cursor: "123",
          last_cursor: "456",
          has_more: false,
          total: 0,
        })
      );

      await command.parseAsync(["node", "list"]);

      expect(console.log).toHaveBeenCalledWith("No stores found.");
      expect(mockFormatOutput).not.toHaveBeenCalled();
    });
  });

  describe("Pagination", () => {
    it("should handle custom limit", async () => {
      mockClient.stores.list.mockResolvedValue(
        createMockCursor([], {
          first_cursor: "123",
          last_cursor: "456",
          has_more: false,
          total: 0,
        })
      );

      await command.parseAsync(["node", "list", "--limit", "50"]);

      expect(mockClient.stores.list).toHaveBeenCalledWith({
        limit: 50,
      });
    });

    it("should validate limit is positive", async () => {
      await command.parseAsync(["node", "list", "--limit", "-5"]);

      expect(console.log).toHaveBeenCalledWith(
        "✗",
        expect.stringContaining('"limit" must be positive')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Output formatting", () => {
    const mockData = [
      {
        id: "550e8400-e29b-41d4-a716-446655440021",
        name: "store1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        file_counts: { total: 10 },
        usage_bytes: 1048576,
        expires_at: null,
      },
    ];

    it("should format as table by default", async () => {
      mockClient.stores.list.mockResolvedValue(
        createMockCursor(mockData, {
          first_cursor: "123",
          last_cursor: "456",
          has_more: true,
          total: 2,
        })
      );

      await command.parseAsync(["node", "list"]);

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.any(Array),
        undefined
      );
    });

    it("should format as JSON when specified", async () => {
      mockClient.stores.list.mockResolvedValue(
        createMockCursor(mockData, {
          first_cursor: "123",
          last_cursor: "456",
          has_more: true,
          total: 2,
        })
      );

      await command.parseAsync(["node", "list", "--format", "json"]);

      expect(mockFormatOutput).toHaveBeenCalledWith(expect.any(Array), "json");
    });

    it("should format as CSV when specified", async () => {
      mockClient.stores.list.mockResolvedValue(
        createMockCursor(mockData, {
          first_cursor: "123",
          last_cursor: "456",
          has_more: true,
          total: 2,
        })
      );

      await command.parseAsync(["node", "list", "--format", "csv"]);

      expect(mockFormatOutput).toHaveBeenCalledWith(expect.any(Array), "csv");
    });
  });

  describe("Error handling", () => {
    it("should handle API errors", async () => {
      const error = new Error("API Error: Rate limit exceeded");
      mockClient.stores.list.mockRejectedValue(error);

      await command.parseAsync(["node", "list"]);

      expect(console.log).toHaveBeenCalledWith(
        "✗",
        "API Error: Rate limit exceeded"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle network errors", async () => {
      const error = new Error("ECONNREFUSED");
      mockClient.stores.list.mockRejectedValue(error);

      await command.parseAsync(["node", "list"]);

      expect(console.log).toHaveBeenCalledWith("✗", "ECONNREFUSED");
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error rejections", async () => {
      mockClient.stores.list.mockRejectedValue("Unknown error");

      await command.parseAsync(["node", "list"]);

      expect(console.log).toHaveBeenCalledWith("✗", "Failed to list stores");
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("API key handling", () => {
    it("should use API key from command line", async () => {
      mockClient.stores.list.mockResolvedValue(
        createMockCursor([], {
          first_cursor: "123",
          last_cursor: "456",
          has_more: true,
          total: 2,
        })
      );

      await command.parseAsync(["node", "list", "--api-key", "mxb_test123"]);

      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "mxb_test123",
        })
      );
    });

    it("should work without explicit API key (uses env/config)", async () => {
      mockClient.stores.list.mockResolvedValue(
        createMockCursor([], {
          first_cursor: "123",
          last_cursor: "456",
          has_more: true,
          total: 2,
        })
      );

      await command.parseAsync(["node", "list"]);

      expect(mockCreateClient).toHaveBeenCalled();
    });
  });

  describe("Base URL handling", () => {
    it("should pass base URL from command line to createClient", async () => {
      mockClient.stores.list.mockResolvedValue(
        createMockCursor([], {
          first_cursor: "123",
          last_cursor: "456",
          has_more: false,
          total: 0,
        })
      );

      await command.parseAsync([
        "node",
        "list",
        "--base-url",
        "https://custom-api.example.com",
      ]);

      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: "https://custom-api.example.com",
        })
      );
    });

    it("should validate base URL is a valid URL", async () => {
      mockClient.stores.list.mockResolvedValue(
        createMockCursor([], {
          first_cursor: "123",
          last_cursor: "456",
          has_more: false,
          total: 0,
        })
      );

      await command.parseAsync([
        "node",
        "list",
        "--base-url",
        "not-a-valid-url",
      ]);

      expect(console.log).toHaveBeenCalledWith(
        "✗",
        expect.stringContaining('"base-url" must be a valid URL')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should work with base URL and API key together", async () => {
      mockClient.stores.list.mockResolvedValue(
        createMockCursor([], {
          first_cursor: "123",
          last_cursor: "456",
          has_more: false,
          total: 0,
        })
      );

      await command.parseAsync([
        "node",
        "list",
        "--base-url",
        "https://custom-api.example.com",
        "--api-key",
        "mxb_test123",
      ]);

      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: "https://custom-api.example.com",
          apiKey: "mxb_test123",
        })
      );
    });

    it("should prioritize CLI base URL over environment variable", async () => {
      const originalEnv = process.env.MXBAI_BASE_URL;
      process.env.MXBAI_BASE_URL = "https://env-api.example.com";

      mockClient.stores.list.mockResolvedValue(
        createMockCursor([], {
          first_cursor: "123",
          last_cursor: "456",
          has_more: false,
          total: 0,
        })
      );

      await command.parseAsync([
        "node",
        "list",
        "--base-url",
        "https://cli-api.example.com",
      ]);

      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: "https://cli-api.example.com",
        })
      );

      // Cleanup
      if (originalEnv) {
        process.env.MXBAI_BASE_URL = originalEnv;
      } else {
        delete process.env.MXBAI_BASE_URL;
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle stores with missing fields", async () => {
      const mockData = [
        {
          id: "550e8400-e29b-41d4-a716-446655440021",
          name: "store1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          expires_at: null,
          // Missing file_counts and usage_bytes
        },
      ];

      mockClient.stores.list.mockResolvedValue(
        createMockCursor(mockData, {
          first_cursor: "123",
          last_cursor: "456",
          has_more: true,
          total: 2,
        })
      );

      await command.parseAsync(["node", "list"]);

      const formattedData = mockFormatOutput.mock.calls[0]?.[0] as any;

      expect(formattedData[0]).toMatchObject({
        id: "550e8400-e29b-41d4-a716-446655440021",
        name: "store1",
        status: "active",
        files: undefined,
        usage: "0 B",
        created: "1/1/2024",
      });
    });

    it("should handle very large file counts", async () => {
      const mockData = [
        {
          id: "550e8400-e29b-41d4-a716-446655440021",
          name: "huge-store",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          file_counts: { total: 1000000 },
          usage_bytes: 1099511627776, // 1 TB
          expires_at: null,
        },
      ];

      mockClient.stores.list.mockResolvedValue(
        createMockCursor(mockData, {
          first_cursor: "123",
          last_cursor: "456",
          has_more: true,
          total: 2,
        })
      );

      await command.parseAsync(["node", "list"]);

      const formattedData = mockFormatOutput.mock.calls[0]?.[0] as any;

      expect(formattedData[0].files).toBe(1000000);
      expect(formattedData[0].usage).toMatch(/TB$/);
    });
  });
});
