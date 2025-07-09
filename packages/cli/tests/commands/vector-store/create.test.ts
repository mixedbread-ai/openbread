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
import { createCreateCommand } from "../../../src/commands/vector-store/create";
import * as clientUtils from "../../../src/utils/client";
import * as outputUtils from "../../../src/utils/output";

// Mock dependencies
jest.mock("../../../src/utils/client");
jest.mock("../../../src/utils/output");

// Explicit mock definitions
const mockCreateClient = clientUtils.createClient as jest.MockedFunction<
  typeof clientUtils.createClient
>;
const mockFormatOutput = outputUtils.formatOutput as jest.MockedFunction<
  typeof outputUtils.formatOutput
>;

describe("Vector Store Create Command", () => {
  let command: Command;
  let mockClient: {
    vectorStores: {
      create: jest.MockedFunction<Mixedbread["vectorStores"]["create"]>;
    };
  };

  beforeEach(() => {
    command = createCreateCommand();

    // Setup mock client
    mockClient = {
      vectorStores: {
        create: jest.fn(),
      },
    };

    // Setup default mocks
    mockCreateClient.mockReturnValue(mockClient as unknown as Mixedbread);
    mockFormatOutput.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic creation", () => {
    it("should create vector store with name only", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "test-store",
        description: null,
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.create.mockResolvedValue(mockResponse);

      await command.parseAsync(["node", "create", "test-store"]);

      expect(mockClient.vectorStores.create).toHaveBeenCalledWith({
        name: "test-store",
        description: undefined,
        expires_after: undefined,
        metadata: undefined,
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("✓"),
        expect.stringContaining(
          'Vector store "test-store" created successfully'
        )
      );

      expect(mockFormatOutput).toHaveBeenCalledWith(
        {
          id: "550e8400-e29b-41d4-a716-446655440010",
          name: "test-store",
          description: null,
          expires_after: null,
          metadata: {},
        },
        undefined
      );
    });

    it("should create vector store with description", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "test-store",
        description: "Test description",
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "test-store",
        "--description",
        "Test description",
      ]);

      expect(mockClient.vectorStores.create).toHaveBeenCalledWith({
        name: "test-store",
        description: "Test description",
        expires_after: undefined,
        metadata: undefined,
      });
    });

    it("should create vector store with expiration", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "temp-store",
        description: null,
        expires_after: {
          anchor: "last_active_at" as const,
          days: 30,
        },
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "temp-store",
        "--expires-after",
        "30",
      ]);

      expect(mockClient.vectorStores.create).toHaveBeenCalledWith({
        name: "temp-store",
        description: undefined,
        expires_after: {
          anchor: "last_active_at" as const,
          days: 30,
        },
        metadata: undefined,
      });
    });
  });

  describe("Metadata handling", () => {
    it("should create vector store with metadata", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "test-store",
        description: null,
        expires_after: null,
        metadata: {
          project: "website",
          team: "engineering",
        },
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "test-store",
        "--metadata",
        '{"project":"website","team":"engineering"}',
      ]);

      expect(mockClient.vectorStores.create).toHaveBeenCalledWith({
        name: "test-store",
        description: undefined,
        expires_after: undefined,
        metadata: {
          project: "website",
          team: "engineering",
        },
      });
    });

    it("should handle invalid metadata JSON", async () => {
      await command.parseAsync([
        "node",
        "create",
        "test-store",
        "--metadata",
        "invalid-json",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("✗"),
        expect.stringContaining("Invalid JSON in metadata option")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle complex metadata", async () => {
      const complexMetadata = {
        tags: ["products", "catalog"],
        config: {
          indexing: true,
          version: 2,
        },
        last_updated: "2024-01-01",
      };

      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "test-store",
        description: null,
        expires_after: null,
        metadata: complexMetadata,
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "test-store",
        "--metadata",
        JSON.stringify(complexMetadata),
      ]);

      expect(mockClient.vectorStores.create).toHaveBeenCalledWith({
        name: "test-store",
        description: undefined,
        expires_after: undefined,
        metadata: complexMetadata,
      });
    });
  });

  describe("Output formatting", () => {
    it("should format output as JSON when specified", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "test-store",
        description: null,
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "test-store",
        "--format",
        "json",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(expect.any(Object), "json");
    });

    it("should format output as CSV when specified", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "test-store",
        description: null,
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "test-store",
        "--format",
        "csv",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(expect.any(Object), "csv");
    });
  });

  describe("Error handling", () => {
    it("should handle API errors", async () => {
      const error = new Error("API Error: Unauthorized");
      mockClient.vectorStores.create.mockRejectedValue(error);

      await command.parseAsync(["node", "create", "test-store"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "API Error: Unauthorized"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle network errors", async () => {
      const error = new Error("Network error");
      mockClient.vectorStores.create.mockRejectedValue(error);

      await command.parseAsync(["node", "create", "test-store"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Network error"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error rejections", async () => {
      mockClient.vectorStores.create.mockRejectedValue("Unknown error");

      await command.parseAsync(["node", "create", "test-store"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Failed to create vector store"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Validation", () => {
    it("should validate expires-after is a positive number", async () => {
      await command.parseAsync([
        "node",
        "create",
        "test-store",
        "--expires-after",
        "-5",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"expires-after" must be positive')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate expires-after is an integer", async () => {
      await command.parseAsync([
        "node",
        "create",
        "test-store",
        "--expires-after",
        "5.5",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"expires-after" must be an integer')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate name is not empty", async () => {
      await command.parseAsync(["node", "create", ""]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"name" is required')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
