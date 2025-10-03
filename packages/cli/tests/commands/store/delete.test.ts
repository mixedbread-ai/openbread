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
import { createDeleteCommand } from "../../../src/commands/store/delete";
import * as clientUtils from "../../../src/utils/client";
import * as storeUtils from "../../../src/utils/store";

// Mock dependencies
jest.mock("../../../src/utils/client");
jest.mock("../../../src/utils/store");

// Explicit mock definitions
const mockCreateClient = clientUtils.createClient as jest.MockedFunction<
  typeof clientUtils.createClient
>;
const mockResolveStore = storeUtils.resolveStore as jest.MockedFunction<
  typeof storeUtils.resolveStore
>;

describe("Delete Command", () => {
  let command: Command;
  let mockClient: {
    stores: {
      delete: jest.MockedFunction<Mixedbread["stores"]["delete"]>;
    };
  };

  beforeEach(() => {
    command = createDeleteCommand();

    mockClient = {
      stores: {
        delete: jest.fn(),
      },
    };

    // Setup default mocks
    mockCreateClient.mockReturnValue(mockClient as unknown as Mixedbread);
    mockResolveStore.mockResolvedValue({
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
    it("should delete store with yes flag", async () => {
      mockClient.stores.delete.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440040",
        deleted: true,
      });

      await command.parseAsync(["node", "delete", "test-store", "--yes"]);

      expect(mockResolveStore).toHaveBeenCalledWith(
        expect.objectContaining({
          stores: expect.any(Object),
        }),
        "test-store"
      );
      expect(mockClient.stores.delete).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440040"
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Store "test-store" deleted successfully')
      );
    });

    it("should skip confirmation when yes flag is used", async () => {
      mockClient.stores.delete.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440040",
        deleted: true,
      });

      await command.parseAsync(["node", "delete", "test-store", "--yes"]);

      expect(mockClient.stores.delete).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440040"
      );
    });
  });

  describe("Error handling", () => {
    it("should handle API errors", async () => {
      const error = new Error("API Error: Unauthorized");
      mockClient.stores.delete.mockRejectedValue(error);

      await command.parseAsync(["node", "delete", "test-store", "--yes"]);

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
        "delete",
        "nonexistent-store",
        "--yes",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Store not found"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error rejections", async () => {
      mockClient.stores.delete.mockRejectedValue("Unknown error");

      await command.parseAsync(["node", "delete", "test-store", "--yes"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Failed to delete store"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Global options", () => {
    it("should support API key option", async () => {
      mockClient.stores.delete.mockResolvedValue({
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
