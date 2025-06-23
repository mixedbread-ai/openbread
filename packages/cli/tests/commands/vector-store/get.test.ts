import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type Mixedbread from "@mixedbread/sdk";
import type { Command } from "commander";
import { createGetCommand } from "../../../src/commands/vector-store/get";
import * as clientUtils from "../../../src/utils/client";
import * as outputUtils from "../../../src/utils/output";
import * as vectorStoreUtils from "../../../src/utils/vector-store";

// Mock dependencies
jest.mock("../../../src/utils/client");
jest.mock("../../../src/utils/vector-store");
jest.mock("../../../src/utils/output", () => ({
  ...(jest.requireActual("../../../src/utils/output") as object),
  formatOutput: jest.fn(),
}));


// Explicit mock definitions
const mockCreateClient = clientUtils.createClient as jest.MockedFunction<
  typeof clientUtils.createClient
>;
const mockResolveVectorStore =
  vectorStoreUtils.resolveVectorStore as jest.MockedFunction<
    typeof vectorStoreUtils.resolveVectorStore
  >;
const mockFormatOutput = outputUtils.formatOutput as jest.MockedFunction<
  typeof outputUtils.formatOutput
>;


describe("Vector Store Get Command", () => {
  let command: Command;
  let mockClient: {
    vectorStores: {
      retrieve: jest.MockedFunction<Mixedbread["vectorStores"]["retrieve"]>;
    };
  };

  beforeEach(() => {
    command = createGetCommand();

    // Setup mock client
    mockClient = {
      vectorStores: {
        retrieve: jest.fn(),
      },
    };

    // Setup default mocks
    mockCreateClient.mockReturnValue(mockClient as unknown as Mixedbread);
    mockResolveVectorStore.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440050",
      name: "test-store",
      created_at: "2021-01-01",
      updated_at: "2021-01-01",
    });
    mockFormatOutput.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic retrieval", () => {
    it("should get vector store details", async () => {
      mockResolveVectorStore.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440050",
        name: "test-store",
        description: "A test vector store",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        file_counts: { total: 5 },
        usage_bytes: 1048576,
        expires_at: null,
        metadata: { key: "value" },
      });

      await command.parseAsync(["node", "get", "test-store"]);

      expect(mockResolveVectorStore).toHaveBeenCalledWith(
        mockClient,
        "test-store"
      );
      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "550e8400-e29b-41d4-a716-446655440050",
          name: "test-store",
          description: "A test vector store",
          status: "active",
          "total files": 5,
          "completed files": 0,
          "processing files": 0,
          "failed files": 0,
          usage: "1 MB",
          "created at": expect.any(String),
          metadata: { key: "value" },
        }),
        undefined
      );
    });

    it("should handle expired vector stores", async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      mockResolveVectorStore.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440050",
        name: "test-store",
        description: "An expired vector store",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        file_counts: { total: 5 },
        usage_bytes: 1048576,
        expires_at: expiredDate.toISOString(),
        metadata: {},
      });

      await command.parseAsync(["node", "get", "test-store"]);

      const formattedData = mockFormatOutput.mock.calls[0]?.[0] as any;
      expect(formattedData.status).toBe("expired");
    });

    it("should handle missing optional fields", async () => {
      mockResolveVectorStore.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440050",
        name: "test-store",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        // Missing description, file_counts, usage_bytes, expires_at, metadata
      });

      await command.parseAsync(["node", "get", "test-store"]);

      const formattedData = mockFormatOutput.mock.calls[0]?.[0] as any;
      expect(formattedData).toMatchObject({
        id: "550e8400-e29b-41d4-a716-446655440050",
        name: "test-store",
        description: "N/A",
        status: "active",
        "total files": 0,
        "completed files": 0,
        "processing files": 0,
        "failed files": 0,
        usage: "0 B",
        "created at": expect.any(String),
      });
    });
  });

  describe("Output formatting", () => {
    const mockVectorStore = {
      id: "550e8400-e29b-41d4-a716-446655440050",
      name: "test-store",
      description: "A test vector store",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      file_counts: { total: 5 },
      usage_bytes: 1048576,
      expires_at: null,
      metadata: { key: "value" },
    };

    it("should format as table by default", async () => {
      (
        vectorStoreUtils.resolveVectorStore as jest.MockedFunction<
          typeof vectorStoreUtils.resolveVectorStore
        >
      ).mockResolvedValue(mockVectorStore);

      await command.parseAsync(["node", "get", "test-store"]);

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      );
    });

    it("should format as JSON when specified", async () => {
      (
        vectorStoreUtils.resolveVectorStore as jest.MockedFunction<
          typeof vectorStoreUtils.resolveVectorStore
        >
      ).mockResolvedValue(mockVectorStore);

      await command.parseAsync([
        "node",
        "get",
        "test-store",
        "--format",
        "json",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.any(Object),
        "json"
      );
    });

    it("should format as CSV when specified", async () => {
      (
        vectorStoreUtils.resolveVectorStore as jest.MockedFunction<
          typeof vectorStoreUtils.resolveVectorStore
        >
      ).mockResolvedValue(mockVectorStore);

      await command.parseAsync([
        "node",
        "get",
        "test-store",
        "--format",
        "csv",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.any(Object),
        "csv"
      );
    });
  });

  describe("Error handling", () => {
    it("should handle vector store resolution errors", async () => {
      const error = new Error("Vector store not found");
      mockResolveVectorStore.mockRejectedValue(error);

      await command.parseAsync(["node", "get", "nonexistent-store"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Vector store not found"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error rejections", async () => {
      mockResolveVectorStore.mockRejectedValue("Unknown error");

      await command.parseAsync(["node", "get", "test-store"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Failed to get vector store details"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Global options", () => {
    const mockVectorStore = {
      id: "550e8400-e29b-41d4-a716-446655440050",
      name: "test-store",
      description: "A test vector store",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      file_counts: { total: 5 },
      usage_bytes: 1048576,
      expires_at: null,
      metadata: {},
    };

    it("should support API key option", async () => {
      (
        vectorStoreUtils.resolveVectorStore as jest.MockedFunction<
          typeof vectorStoreUtils.resolveVectorStore
        >
      ).mockResolvedValue(mockVectorStore);

      await command.parseAsync([
        "node",
        "get",
        "test-store",
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

  describe("Command validation", () => {
    it("should validate required name-or-id argument", async () => {
      await command.parseAsync(["node", "get", ""]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"name-or-id" is required')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
