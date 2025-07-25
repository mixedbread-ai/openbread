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
import { createDeleteCommand } from "../../../src/commands/vector-store/delete";
import * as clientUtils from "../../../src/utils/client";
import * as vectorStoreUtils from "../../../src/utils/vector-store";

// Mock dependencies
jest.mock("../../../src/utils/client");
jest.mock("../../../src/utils/vector-store");

// Explicit mock definitions
const mockCreateClient = clientUtils.createClient as jest.MockedFunction<
  typeof clientUtils.createClient
>;
const mockResolveVectorStore =
  vectorStoreUtils.resolveVectorStore as jest.MockedFunction<
    typeof vectorStoreUtils.resolveVectorStore
  >;

describe("Delete Command", () => {
  let command: Command;
  let mockClient: {
    vectorStores: {
      delete: jest.MockedFunction<Mixedbread["vectorStores"]["delete"]>;
    };
  };

  beforeEach(() => {
    command = createDeleteCommand();

    mockClient = {
      vectorStores: {
        delete: jest.fn(),
      },
    };

    // Setup default mocks
    mockCreateClient.mockReturnValue(mockClient as unknown as Mixedbread);
    mockResolveVectorStore.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440040",
      name: "test-store",
      created_at: "2021-01-01",
      updated_at: "2021-01-01",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic deletion", () => {
    it("should delete vector store with yes flag", async () => {
      mockClient.vectorStores.delete.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440040",
        deleted: true,
      });

      await command.parseAsync(["node", "delete", "test-store", "--yes"]);

      expect(mockResolveVectorStore).toHaveBeenCalledWith(
        expect.objectContaining({
          vectorStores: expect.any(Object),
        }),
        "test-store"
      );
      expect(mockClient.vectorStores.delete).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440040"
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          'Vector store "test-store" deleted successfully'
        )
      );
    });

    it("should skip confirmation when yes flag is used", async () => {
      mockClient.vectorStores.delete.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440040",
        deleted: true,
      });

      await command.parseAsync(["node", "delete", "test-store", "--yes"]);

      expect(mockClient.vectorStores.delete).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440040"
      );
    });
  });

  describe("Error handling", () => {
    it("should handle API errors", async () => {
      const error = new Error("API Error: Unauthorized");
      mockClient.vectorStores.delete.mockRejectedValue(error);

      await command.parseAsync(["node", "delete", "test-store", "--yes"]);

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
        "delete",
        "nonexistent-store",
        "--yes",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Vector store not found"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error rejections", async () => {
      mockClient.vectorStores.delete.mockRejectedValue("Unknown error");

      await command.parseAsync(["node", "delete", "test-store", "--yes"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Failed to delete vector store"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Global options", () => {
    it("should support API key option", async () => {
      mockClient.vectorStores.delete.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440040",
        deleted: true,
      });

      await command.parseAsync([
        "node",
        "delete",
        "test-store",
        "--yes",
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
      await command.parseAsync(["node", "delete", "", "--yes"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"name-or-id" is required')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
