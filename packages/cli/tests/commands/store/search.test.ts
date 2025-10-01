import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type Mixedbread from "@mixedbread/sdk";
import type { StoreSearchResponse } from "@mixedbread/sdk/resources/index.mjs";
import type { FileSearchResponse } from "@mixedbread/sdk/resources/stores.mjs";
import type { Command } from "commander";
import { createSearchCommand } from "../../../src/commands/store/search";
import * as clientUtils from "../../../src/utils/client";
import * as configUtils from "../../../src/utils/config";
import * as outputUtils from "../../../src/utils/output";
import * as storeUtils from "../../../src/utils/store";

// Mock dependencies
jest.mock("../../../src/utils/client");
jest.mock("../../../src/utils/store");
jest.mock("../../../src/utils/output", () => ({
  ...(jest.requireActual("../../../src/utils/output") as object),
  formatOutput: jest.fn(),
}));
jest.mock("../../../src/utils/config");

// Explicit mock definitions
const mockCreateClient = clientUtils.createClient as jest.MockedFunction<
  typeof clientUtils.createClient
>;
const mockResolveStore = storeUtils.resolveStore as jest.MockedFunction<
  typeof storeUtils.resolveStore
>;
const mockLoadConfig = configUtils.loadConfig as jest.MockedFunction<
  typeof configUtils.loadConfig
>;
const mockFormatOutput = outputUtils.formatOutput as jest.MockedFunction<
  typeof outputUtils.formatOutput
>;

describe("Store Search Command", () => {
  let command: Command;
  let mockClient: {
    stores: {
      files: {
        search: jest.MockedFunction<Mixedbread["stores"]["files"]["search"]>;
      };
      search: jest.MockedFunction<Mixedbread["stores"]["search"]>;
    };
  };

  beforeEach(() => {
    command = createSearchCommand();
    mockClient = {
      stores: {
        files: {
          search: jest.fn(),
        },
        search: jest.fn(),
      },
    };

    // Setup default mocks
    mockCreateClient.mockReturnValue(mockClient as unknown as Mixedbread);
    mockResolveStore.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440080",
      name: "test-store",
      created_at: "2021-01-01",
      updated_at: "2021-01-01",
    });
    mockLoadConfig.mockReturnValue({
      defaults: {
        search: {
          top_k: 5,
          rerank: false,
        },
      },
      version: "1.0.0",
    });
    mockFormatOutput.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic chunk search (default)", () => {
    const mockChunkResults: StoreSearchResponse = {
      data: [
        {
          filename: "document1.pdf",
          score: 0.95,
          store_id: "550e8400-e29b-41d4-a716-446655440080",
          chunk_index: 0,
          metadata: { author: "John Doe" },
          type: "text",
          file_id: "123",
          text: "This is a test text",
        },
      ],
    };

    it("should search chunks in store with default options", async () => {
      const mockChunkResults: StoreSearchResponse = {
        data: [
          {
            filename: "document1.pdf",
            score: 0.95,
            store_id: "550e8400-e29b-41d4-a716-446655440080",
            chunk_index: 0,
            metadata: { page: 1 },
            type: "text",
            file_id: "123",
            text: "This is a test text",
          },
          {
            filename: "document2.txt",
            score: 0.87,
            store_id: "550e8400-e29b-41d4-a716-446655440080",
            chunk_index: 1,
            metadata: { category: "manual" },
            type: "text",
            file_id: "456",
            text: "Another test text",
          },
        ],
      };
      mockClient.stores.search.mockResolvedValue(mockChunkResults);

      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "machine learning",
      ]);

      expect(mockResolveStore).toHaveBeenCalledWith(
        expect.objectContaining({
          stores: expect.any(Object),
        }),
        "test-store"
      );
      expect(mockClient.stores.search).toHaveBeenCalledWith({
        query: "machine learning",
        store_identifiers: ["550e8400-e29b-41d4-a716-446655440080"],
        top_k: 5,
        search_options: {
          return_metadata: undefined,
          score_threshold: undefined,
          rerank: false,
        },
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.any(String), // checkmark symbol
        expect.stringContaining("Found 2 results") // Found 2 results message
      );

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            filename: "document1.pdf",
            score: "0.95",
            store_id: "550e8400-e29b-41d4-a716-446655440080",
            chunk_index: 0,
          }),
          expect.objectContaining({
            filename: "document2.txt",
            score: "0.87",
            store_id: "550e8400-e29b-41d4-a716-446655440080",
            chunk_index: 1,
          }),
        ]),
        undefined
      );
    });

    it("should search with custom top-k", async () => {
      mockClient.stores.search.mockResolvedValue(mockChunkResults);

      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--top-k",
        "20",
      ]);

      expect(mockClient.stores.search).toHaveBeenCalledWith(
        expect.objectContaining({
          top_k: 20,
        })
      );
    });

    it("should search with threshold", async () => {
      mockClient.stores.search.mockResolvedValue(mockChunkResults);

      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--threshold",
        "0.8",
      ]);

      expect(mockClient.stores.search).toHaveBeenCalledWith(
        expect.objectContaining({
          search_options: expect.objectContaining({
            score_threshold: 0.8,
          }),
        })
      );
    });

    it("should search with return metadata enabled", async () => {
      mockClient.stores.search.mockResolvedValue(mockChunkResults);

      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--return-metadata",
      ]);

      expect(mockClient.stores.search).toHaveBeenCalledWith(
        expect.objectContaining({
          search_options: expect.objectContaining({
            return_metadata: true,
          }),
        })
      );

      const formattedData = mockFormatOutput.mock.calls[0]?.[0];
      expect(formattedData?.[0]).toHaveProperty("metadata");
    });

    it("should search with reranking enabled", async () => {
      mockClient.stores.search.mockResolvedValue(mockChunkResults);

      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--rerank",
      ]);

      expect(mockClient.stores.search).toHaveBeenCalledWith(
        expect.objectContaining({
          search_options: expect.objectContaining({
            rerank: true,
          }),
        })
      );
    });

    it("should handle empty search results", async () => {
      mockClient.stores.search.mockResolvedValue({ data: [] });

      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "nonexistent query",
      ]);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("No results found.")
      );
      expect(mockFormatOutput).not.toHaveBeenCalled();
    });
  });

  describe("File search", () => {
    it("should search files when file-search flag is enabled", async () => {
      const mockFileResults: FileSearchResponse = {
        data: [
          {
            filename: "document1.pdf",
            score: 0.95,
            store_id: "550e8400-e29b-41d4-a716-446655440080",
            metadata: { author: "John Doe" },
            id: "123",
            created_at: "2021-01-01",
            chunks: [],
          },
          {
            filename: "document2.txt",
            score: 0.87,
            store_id: "550e8400-e29b-41d4-a716-446655440080",
            metadata: { category: "manual" },
            id: "456",
            created_at: "2021-01-01",
            chunks: [],
          },
        ],
      };
      mockClient.stores.files.search.mockResolvedValue(mockFileResults);

      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--file-search",
      ]);

      expect(mockClient.stores.files.search).toHaveBeenCalledWith({
        query: "query",
        store_identifiers: ["550e8400-e29b-41d4-a716-446655440080"],
        top_k: 5,
        search_options: {
          return_metadata: undefined,
          score_threshold: undefined,
          rerank: false,
        },
      });

      const formattedData = mockFormatOutput.mock.calls[0]?.[0];
      expect(formattedData?.[0]).not.toHaveProperty("chunk_index");
      expect(formattedData?.[1]).not.toHaveProperty("chunk_index");
    });

    it("should search files with all options", async () => {
      const mockFileResults: FileSearchResponse = {
        data: [
          {
            filename: "document1.pdf",
            score: 0.95,
            store_id: "550e8400-e29b-41d4-a716-446655440080",
            metadata: { author: "John Doe" },
            id: "123",
            created_at: "2021-01-01",
            chunks: [],
          },
        ],
      };
      mockClient.stores.files.search.mockResolvedValue(mockFileResults);

      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--file-search",
        "--top-k",
        "15",
        "--threshold",
        "0.7",
        "--return-metadata",
        "--rerank",
      ]);

      expect(mockClient.stores.files.search).toHaveBeenCalledWith({
        query: "query",
        store_identifiers: ["550e8400-e29b-41d4-a716-446655440080"],
        top_k: 15,
        search_options: {
          return_metadata: true,
          score_threshold: 0.7,
          rerank: true,
        },
      });
    });
  });

  describe("Output formatting", () => {
    const mockResults: StoreSearchResponse = {
      data: [
        {
          filename: "test.pdf",
          score: 0.9,
          store_id: "550e8400-e29b-41d4-a716-446655440080",
          chunk_index: 0,
          metadata: { key: "value" },
          type: "text",
          file_id: "123",
          text: "This is a test text",
        },
      ],
    };

    it("should format as table by default", async () => {
      mockClient.stores.search.mockResolvedValue(mockResults);

      await command.parseAsync(["node", "search", "test-store", "query"]);

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.any(Array),
        undefined
      );
    });

    it("should format as JSON when specified", async () => {
      mockClient.stores.search.mockResolvedValue(mockResults);

      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--format",
        "json",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(expect.any(Array), "json");
    });

    it("should format as CSV when specified", async () => {
      mockClient.stores.search.mockResolvedValue(mockResults);

      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--format",
        "csv",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(expect.any(Array), "csv");
    });
  });

  describe("Validation", () => {
    it("should validate required name-or-id argument", async () => {
      await command.parseAsync(["node", "search", "", "query"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"name-or-id" is required')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate required query argument", async () => {
      await command.parseAsync(["node", "search", "test-store", ""]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"query" is required')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate top-k is positive", async () => {
      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--top-k",
        "-5",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"top-k" must be positive')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate top-k is an integer", async () => {
      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--top-k",
        "5.5",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"top-k" must be an integer')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate top-k maximum value", async () => {
      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--top-k",
        "150",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"top-k" must be less than or equal to 100')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate threshold minimum value", async () => {
      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--threshold",
        "-0.1",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          '"threshold" must be greater than or equal to 0'
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate threshold maximum value", async () => {
      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--threshold",
        "1.5",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"threshold" must be less than or equal to 1')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Error handling", () => {
    it("should handle search API errors", async () => {
      const error = new Error("API Error: Rate limit exceeded");
      mockClient.stores.search.mockRejectedValue(error);

      await command.parseAsync(["node", "search", "test-store", "query"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "API Error: Rate limit exceeded"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle store resolution errors", async () => {
      const error = new Error("Store not found");
      mockResolveStore.mockRejectedValue(error);

      await command.parseAsync([
        "node",
        "search",
        "nonexistent-store",
        "query",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Store not found"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error rejections", async () => {
      mockClient.stores.search.mockRejectedValue("Unknown error");

      await command.parseAsync(["node", "search", "test-store", "query"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Failed to search store"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Global options", () => {
    const mockResults: StoreSearchResponse = {
      data: [
        {
          filename: "test.pdf",
          score: 0.9,
          store_id: "550e8400-e29b-41d4-a716-446655440080",
          chunk_index: 0,
          metadata: {},
          type: "text",
          file_id: "123",
          text: "This is a test text",
        },
      ],
    };

    it("should support API key option", async () => {
      mockClient.stores.search.mockResolvedValue(mockResults);

      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--api-key",
        "mxb_test123",
      ]);

      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "mxb_test123",
        })
      );
    });
  });

  describe("Config defaults", () => {
    it("should use config defaults when options not provided", async () => {
      mockLoadConfig.mockReturnValue({
        defaults: {
          search: {
            top_k: 15,
            rerank: true,
          },
        },
        version: "1.0.0",
      });

      mockClient.stores.search.mockResolvedValue({ data: [] });

      await command.parseAsync(["node", "search", "test-store", "query"]);

      expect(mockClient.stores.search).toHaveBeenCalledWith(
        expect.objectContaining({
          top_k: 15,
          search_options: expect.objectContaining({
            rerank: true,
          }),
        })
      );
    });

    it("should override config defaults with command options", async () => {
      mockLoadConfig.mockReturnValue({
        defaults: {
          search: {
            top_k: 15,
            rerank: true,
          },
        },
        version: "1.0.0",
      });

      mockClient.stores.search.mockResolvedValue({ data: [] });

      await command.parseAsync([
        "node",
        "search",
        "test-store",
        "query",
        "--top-k",
        "25",
      ]);

      expect(mockClient.stores.search).toHaveBeenCalledWith(
        expect.objectContaining({
          top_k: 25,
          search_options: expect.objectContaining({
            rerank: true,
          }),
        })
      );
    });
  });
});
