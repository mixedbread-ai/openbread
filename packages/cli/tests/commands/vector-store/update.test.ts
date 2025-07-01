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
import { createUpdateCommand } from "../../../src/commands/vector-store/update";
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


describe("Vector Store Update Command", () => {
  let command: Command;
  let mockClient: {
    vectorStores: {
      update: jest.MockedFunction<Mixedbread["vectorStores"]["update"]>;
    };
  };

  beforeEach(() => {
    command = createUpdateCommand();

    // Setup mock client
    mockClient = {
      vectorStores: {
        update: jest.fn(),
      },
    };

    // Setup default mocks
    mockCreateClient.mockReturnValue(mockClient as unknown as Mixedbread);
    mockResolveVectorStore.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440060",
      name: "test-store",
      created_at: "2021-01-01",
      updated_at: "2021-01-01",
    });
    mockFormatOutput.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic updates", () => {
    it("should update vector store name", async () => {
      const updatedVectorStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "updated-store",
        description: null,
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.update.mockResolvedValue(updatedVectorStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--name",
        "updated-store",
      ]);

      expect(mockResolveVectorStore).toHaveBeenCalledWith(
        expect.objectContaining({
          vectorStores: expect.any(Object)
        }),
        "test-store"
      );
      expect(mockClient.vectorStores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          name: "updated-store",
        }
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          'Vector store "test-store" updated successfully'
        )
      );
      expect(mockFormatOutput).toHaveBeenCalledWith(
        updatedVectorStore,
        undefined
      );
    });

    it("should update vector store description", async () => {
      const updatedVectorStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "test-store",
        description: "Updated description",
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.update.mockResolvedValue(updatedVectorStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--description",
        "Updated description",
      ]);

      expect(mockClient.vectorStores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          description: "Updated description",
        }
      );
    });

    it("should update vector store expiration", async () => {
      const updatedVectorStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "test-store",
        description: null,
        expires_after: { anchor: "last_active_at" as const, days: 30 },
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.update.mockResolvedValue(updatedVectorStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--expires-after",
        "30",
      ]);

      expect(mockClient.vectorStores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          expires_after: {
            anchor: "last_active_at",
            days: 30,
          },
        }
      );
    });

    it("should update vector store metadata", async () => {
      const metadata = { key: "value", version: "2.0" };
      const updatedVectorStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "test-store",
        description: null,
        expires_after: null,
        metadata,
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.update.mockResolvedValue(updatedVectorStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--metadata",
        JSON.stringify(metadata),
      ]);

      expect(mockClient.vectorStores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          metadata,
        }
      );
    });

    it("should update multiple fields at once", async () => {
      const metadata = { updated: true };
      const updatedVectorStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "new-name",
        description: "New description",
        expires_after: { anchor: "last_active_at" as const, days: 7 },
        metadata,
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.update.mockResolvedValue(updatedVectorStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--name",
        "new-name",
        "--description",
        "New description",
        "--expires-after",
        "7",
        "--metadata",
        JSON.stringify(metadata),
      ]);

      expect(mockClient.vectorStores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          name: "new-name",
          description: "New description",
          expires_after: {
            anchor: "last_active_at",
            days: 7,
          },
          metadata,
        }
      );
    });
  });

  describe("Metadata handling", () => {
    it("should handle invalid metadata JSON", async () => {
      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--metadata",
        "invalid-json",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Error:"),
        expect.stringContaining("Invalid JSON in metadata option")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle complex metadata", async () => {
      const complexMetadata = {
        tags: ["tag1", "tag2"],
        config: { nested: { value: true } },
        numbers: [1, 2, 3],
      };

      const updatedVectorStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "test-store",
        description: null,
        expires_after: null,
        metadata: complexMetadata,
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.vectorStores.update.mockResolvedValue(updatedVectorStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--metadata",
        JSON.stringify(complexMetadata),
      ]);

      expect(mockClient.vectorStores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          metadata: complexMetadata,
        }
      );
    });
  });

  describe("Output formatting", () => {
    const updatedVectorStore = {
      id: "550e8400-e29b-41d4-a716-446655440060",
      name: "test-store",
      description: "Updated",
      expires_after: null,
      metadata: {},
      created_at: "2021-01-01T00:00:00Z",
      updated_at: "2021-01-01T00:00:00Z",
    };

    it("should format as table by default", async () => {
      mockClient.vectorStores.update.mockResolvedValue(updatedVectorStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--description",
        "Updated",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(
        updatedVectorStore,
        undefined
      );
    });

    it("should format as JSON when specified", async () => {
      mockClient.vectorStores.update.mockResolvedValue(updatedVectorStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--description",
        "Updated",
        "--format",
        "json",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(updatedVectorStore, "json");
    });

    it("should format as CSV when specified", async () => {
      mockClient.vectorStores.update.mockResolvedValue(updatedVectorStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--description",
        "Updated",
        "--format",
        "csv",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(updatedVectorStore, "csv");
    });
  });

  describe("Validation", () => {
    it("should validate expires-after is a positive number", async () => {
      await command.parseAsync([
        "node",
        "update",
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
        "update",
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

    it("should require at least one update field", async () => {
      await command.parseAsync(["node", "update", "test-store"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          "No update fields provided. Use --name, --description, or --metadata"
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate required name-or-id argument", async () => {
      await command.parseAsync(["node", "update", "", "--name", "new-name"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"name-or-id" is required')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Error handling", () => {
    it("should handle API errors", async () => {
      const error = new Error("API Error: Unauthorized");
      mockClient.vectorStores.update.mockRejectedValue(error);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--name",
        "new-name",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "API Error: Unauthorized"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle vector store resolution errors", async () => {
      const error = new Error("Vector store not found");
      mockResolveVectorStore.mockRejectedValue(error);

      await command.parseAsync([
        "node",
        "update",
        "nonexistent-store",
        "--name",
        "new-name",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Vector store not found"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error rejections", async () => {
      mockClient.vectorStores.update.mockRejectedValue("Unknown error");

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--name",
        "new-name",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Failed to update vector store"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Global options", () => {
    const updatedVectorStore = {
      id: "550e8400-e29b-41d4-a716-446655440060",
      name: "updated-store",
      description: null,
      expires_after: null,
      metadata: {},
      created_at: "2021-01-01T00:00:00Z",
      updated_at: "2021-01-01T00:00:00Z",
    };

    it("should support API key option", async () => {
      mockClient.vectorStores.update.mockResolvedValue(updatedVectorStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--name",
        "updated-store",
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
});
