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
import { createCreateCommand } from "../../../src/commands/store/create";
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

describe("Store Create Command", () => {
  let command: Command;
  let mockClient: {
    stores: {
      create: jest.MockedFunction<Mixedbread["stores"]["create"]>;
    };
  };

  beforeEach(() => {
    command = createCreateCommand();

    // Setup mock client
    mockClient = {
      stores: {
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
    it("should create store with name only", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "test-store",
        description: null,
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.create.mockResolvedValue(mockResponse);

      await command.parseAsync(["node", "create", "test-store"]);

      expect(mockClient.stores.create).toHaveBeenCalledWith({
        name: "test-store",
        description: undefined,
        expires_after: undefined,
        metadata: undefined,
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("✓"),
        expect.stringContaining('Store "test-store" created successfully')
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

    it("should create store with description", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "test-store",
        description: "Test description",
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "test-store",
        "--description",
        "Test description",
      ]);

      expect(mockClient.stores.create).toHaveBeenCalledWith({
        name: "test-store",
        description: "Test description",
        expires_after: undefined,
        metadata: undefined,
      });
    });

    it("should create store with expiration", async () => {
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

      mockClient.stores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "temp-store",
        "--expires-after",
        "30",
      ]);

      expect(mockClient.stores.create).toHaveBeenCalledWith({
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
    it("should create store with metadata", async () => {
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

      mockClient.stores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "test-store",
        "--metadata",
        '{"project":"website","team":"engineering"}',
      ]);

      expect(mockClient.stores.create).toHaveBeenCalledWith({
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

      expect(console.log).toHaveBeenCalledWith(
        "✗",
        "Invalid JSON in metadata option"
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

      mockClient.stores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "test-store",
        "--metadata",
        JSON.stringify(complexMetadata),
      ]);

      expect(mockClient.stores.create).toHaveBeenCalledWith({
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

      mockClient.stores.create.mockResolvedValue(mockResponse);

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

      mockClient.stores.create.mockResolvedValue(mockResponse);

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
      mockClient.stores.create.mockRejectedValue(error);

      await command.parseAsync(["node", "create", "test-store"]);

      expect(console.log).toHaveBeenCalledWith("✗", "API Error: Unauthorized");
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle network errors", async () => {
      const error = new Error("Network error");
      mockClient.stores.create.mockRejectedValue(error);

      await command.parseAsync(["node", "create", "test-store"]);

      expect(console.log).toHaveBeenCalledWith("✗", "Network error");
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error rejections", async () => {
      mockClient.stores.create.mockRejectedValue("Unknown error");

      await command.parseAsync(["node", "create", "test-store"]);

      expect(console.log).toHaveBeenCalledWith("✗", "Failed to create store");
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Public flag", () => {
    it("should create store with --public flag", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "public-store",
        description: null,
        is_public: true,
        config: null,
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.create.mockResolvedValue(mockResponse);

      await command.parseAsync(["node", "create", "public-store", "--public"]);

      expect(mockClient.stores.create).toHaveBeenCalledWith({
        name: "public-store",
        description: undefined,
        is_public: true,
        config: undefined,
        expires_after: undefined,
        metadata: undefined,
      });

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          is_public: true,
        }),
        undefined
      );
    });

    it("should omit is_public when --public flag is not provided", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "test-store",
        description: null,
        is_public: false,
        config: null,
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.create.mockResolvedValue(mockResponse);

      await command.parseAsync(["node", "create", "test-store"]);

      expect(mockClient.stores.create).toHaveBeenCalledWith({
        name: "test-store",
        description: undefined,
        is_public: undefined,
        config: undefined,
        expires_after: undefined,
        metadata: undefined,
      });
    });
  });

  describe("Contextualization flag", () => {
    it("should enable contextualization with --contextualization flag alone", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "ctx-store",
        description: null,
        is_public: false,
        config: { contextualization: true },
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "ctx-store",
        "--contextualization",
      ]);

      expect(mockClient.stores.create).toHaveBeenCalledWith({
        name: "ctx-store",
        description: undefined,
        is_public: undefined,
        config: { contextualization: true },
        expires_after: undefined,
        metadata: undefined,
      });

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          config: { contextualization: true },
        }),
        undefined
      );
    });

    it("should parse comma-separated fields for --contextualization", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "ctx-store",
        description: null,
        is_public: false,
        config: { contextualization: { with_metadata: ["title", "author"] } },
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "ctx-store",
        "--contextualization=title,author",
      ]);

      expect(mockClient.stores.create).toHaveBeenCalledWith({
        name: "ctx-store",
        description: undefined,
        is_public: undefined,
        config: { contextualization: { with_metadata: ["title", "author"] } },
        expires_after: undefined,
        metadata: undefined,
      });
    });

    it("should parse single field for --contextualization", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "ctx-store",
        description: null,
        is_public: false,
        config: { contextualization: { with_metadata: ["title"] } },
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "ctx-store",
        "--contextualization=title",
      ]);

      expect(mockClient.stores.create).toHaveBeenCalledWith({
        name: "ctx-store",
        description: undefined,
        is_public: undefined,
        config: { contextualization: { with_metadata: ["title"] } },
        expires_after: undefined,
        metadata: undefined,
      });
    });

    it("should throw error for empty contextualization fields", async () => {
      await command.parseAsync([
        "node",
        "create",
        "ctx-store",
        "--contextualization=,,,",
      ]);

      expect(console.log).toHaveBeenCalledWith(
        "✗",
        expect.stringContaining("Invalid value for --contextualization")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should combine --public and --contextualization flags", async () => {
      const mockResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "full-store",
        description: "My store",
        is_public: true,
        config: { contextualization: { with_metadata: ["title", "author"] } },
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.create.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "create",
        "full-store",
        "--public",
        "--contextualization=title,author",
        "--description",
        "My store",
      ]);

      expect(mockClient.stores.create).toHaveBeenCalledWith({
        name: "full-store",
        description: "My store",
        is_public: true,
        config: { contextualization: { with_metadata: ["title", "author"] } },
        expires_after: undefined,
        metadata: undefined,
      });
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

      expect(console.log).toHaveBeenCalledWith(
        "✗",
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

      expect(console.log).toHaveBeenCalledWith(
        "✗",
        expect.stringContaining('"expires-after" must be an integer')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate name is not empty", async () => {
      await command.parseAsync(["node", "create", ""]);

      expect(console.log).toHaveBeenCalledWith(
        "✗",
        expect.stringContaining('"name" is required')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
