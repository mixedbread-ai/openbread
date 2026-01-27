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
import { createUpdateCommand } from "../../../src/commands/store/update";
import * as clientUtils from "../../../src/utils/client";
import * as outputUtils from "../../../src/utils/output";
import * as storeUtils from "../../../src/utils/store";

// Mock dependencies
jest.mock("../../../src/utils/client");
jest.mock("../../../src/utils/store", () => ({
  ...(jest.requireActual("../../../src/utils/store") as object),
  resolveStore: jest.fn(),
}));
jest.mock("../../../src/utils/output", () => ({
  ...(jest.requireActual("../../../src/utils/output") as object),
  formatOutput: jest.fn(),
}));

// Explicit mock definitions
const mockCreateClient = clientUtils.createClient as jest.MockedFunction<
  typeof clientUtils.createClient
>;
const mockResolveStore = storeUtils.resolveStore as jest.MockedFunction<
  typeof storeUtils.resolveStore
>;
const mockFormatOutput = outputUtils.formatOutput as jest.MockedFunction<
  typeof outputUtils.formatOutput
>;

describe("Store Update Command", () => {
  let command: Command;
  let mockClient: {
    stores: {
      update: jest.MockedFunction<Mixedbread["stores"]["update"]>;
    };
  };

  beforeEach(() => {
    command = createUpdateCommand();

    // Setup mock client
    mockClient = {
      stores: {
        update: jest.fn(),
      },
    };

    // Setup default mocks
    mockCreateClient.mockReturnValue(mockClient as unknown as Mixedbread);
    mockResolveStore.mockResolvedValue({
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
    it("should update store name", async () => {
      const updatedStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "updated-store",
        description: null,
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.update.mockResolvedValue(updatedStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--name",
        "updated-store",
      ]);

      expect(mockResolveStore).toHaveBeenCalledWith(
        expect.objectContaining({
          stores: expect.any(Object),
        }),
        "test-store"
      );
      expect(mockClient.stores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          name: "updated-store",
        }
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Store "test-store" updated successfully')
      );
      expect(mockFormatOutput).toHaveBeenCalledWith(updatedStore, undefined);
    });

    it("should update store description", async () => {
      const updatedStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "test-store",
        description: "Updated description",
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.update.mockResolvedValue(updatedStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--description",
        "Updated description",
      ]);

      expect(mockClient.stores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          description: "Updated description",
        }
      );
    });

    it("should update store expiration", async () => {
      const updatedStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "test-store",
        description: null,
        expires_after: { anchor: "last_active_at" as const, days: 30 },
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.update.mockResolvedValue(updatedStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--expires-after",
        "30",
      ]);

      expect(mockClient.stores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          expires_after: {
            anchor: "last_active_at",
            days: 30,
          },
        }
      );
    });

    it("should update store metadata", async () => {
      const metadata = { key: "value", version: "2.0" };
      const updatedStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "test-store",
        description: null,
        expires_after: null,
        metadata,
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.update.mockResolvedValue(updatedStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--metadata",
        JSON.stringify(metadata),
      ]);

      expect(mockClient.stores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          metadata,
        }
      );
    });

    it("should update multiple fields at once", async () => {
      const metadata = { updated: true };
      const updatedStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "new-name",
        description: "New description",
        expires_after: { anchor: "last_active_at" as const, days: 7 },
        metadata,
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.update.mockResolvedValue(updatedStore);

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

      expect(mockClient.stores.update).toHaveBeenCalledWith(
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

  describe("Public flag", () => {
    it("should update store with --public flag", async () => {
      const updatedStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "test-store",
        description: null,
        is_public: true,
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.update.mockResolvedValue(updatedStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--public",
      ]);

      expect(mockClient.stores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          is_public: true,
        }
      );

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          is_public: true,
        }),
        undefined
      );
    });

    it("should not include is_public when --public flag is not provided", async () => {
      const updatedStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "updated-store",
        description: null,
        is_public: false,
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.update.mockResolvedValue(updatedStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--name",
        "updated-store",
      ]);

      expect(mockClient.stores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          name: "updated-store",
        }
      );
    });

    it("should set is_public to false with --public=false", async () => {
      const updatedStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "test-store",
        description: null,
        is_public: false,
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.update.mockResolvedValue(updatedStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--public=false",
      ]);

      expect(mockClient.stores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          is_public: false,
        }
      );
    });

    it("should combine --public with other update fields", async () => {
      const updatedStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "updated-store",
        description: "Updated description",
        is_public: true,
        expires_after: null,
        metadata: {},
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.update.mockResolvedValue(updatedStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--name",
        "updated-store",
        "--description",
        "Updated description",
        "--public",
      ]);

      expect(mockClient.stores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          name: "updated-store",
          description: "Updated description",
          is_public: true,
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
        expect.stringContaining("✗"),
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

      const updatedStore = {
        id: "550e8400-e29b-41d4-a716-446655440060",
        name: "test-store",
        description: null,
        expires_after: null,
        metadata: complexMetadata,
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      };

      mockClient.stores.update.mockResolvedValue(updatedStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--metadata",
        JSON.stringify(complexMetadata),
      ]);

      expect(mockClient.stores.update).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440060",
        {
          metadata: complexMetadata,
        }
      );
    });
  });

  describe("Output formatting", () => {
    const updatedStore = {
      id: "550e8400-e29b-41d4-a716-446655440060",
      name: "test-store",
      description: "Updated",
      expires_after: null,
      metadata: {},
      created_at: "2021-01-01T00:00:00Z",
      updated_at: "2021-01-01T00:00:00Z",
    };

    it("should format as table by default", async () => {
      mockClient.stores.update.mockResolvedValue(updatedStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--description",
        "Updated",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(updatedStore, undefined);
    });

    it("should format as JSON when specified", async () => {
      mockClient.stores.update.mockResolvedValue(updatedStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--description",
        "Updated",
        "--format",
        "json",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(updatedStore, "json");
    });

    it("should format as CSV when specified", async () => {
      mockClient.stores.update.mockResolvedValue(updatedStore);

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--description",
        "Updated",
        "--format",
        "csv",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(updatedStore, "csv");
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
          "No update fields provided. Use --name, --description, --public, or --metadata"
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
      mockClient.stores.update.mockRejectedValue(error);

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

    it("should handle store resolution errors", async () => {
      const error = new Error("Store not found");
      mockResolveStore.mockRejectedValue(error);

      await command.parseAsync([
        "node",
        "update",
        "nonexistent-store",
        "--name",
        "new-name",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Store not found"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error rejections", async () => {
      mockClient.stores.update.mockRejectedValue("Unknown error");

      await command.parseAsync([
        "node",
        "update",
        "test-store",
        "--name",
        "new-name",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Failed to update store"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Global options", () => {
    const updatedStore = {
      id: "550e8400-e29b-41d4-a716-446655440060",
      name: "updated-store",
      description: null,
      expires_after: null,
      metadata: {},
      created_at: "2021-01-01T00:00:00Z",
      updated_at: "2021-01-01T00:00:00Z",
    };

    it("should support API key option", async () => {
      mockClient.stores.update.mockResolvedValue(updatedStore);

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
