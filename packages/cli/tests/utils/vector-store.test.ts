// Import Jest globals directly
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Mixedbread } from "@mixedbread/sdk";
import * as configUtils from "../../src/utils/config";
import { resolveStore } from "../../src/utils/store";

// Mock config utils
jest.mock("../../src/utils/config");

describe("Store Utils", () => {
  describe("resolveStore", () => {
    let mockClient: {
      stores: {
        list: jest.MockedFunction<() => Promise<{ data: unknown[] }>>;
        retrieve: jest.MockedFunction<(id: string) => Promise<unknown>>;
      };
    };

    beforeEach(() => {
      mockClient = {
        stores: {
          list: jest.fn(),
          retrieve: jest.fn(),
        },
      };

      (
        configUtils.resolveStoreName as jest.MockedFunction<
          typeof configUtils.resolveStoreName
        >
      ).mockImplementation((name) => name);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should resolve store ID directly", async () => {
      const mockStore = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "test-store",
      };

      mockClient.stores.retrieve.mockResolvedValue(mockStore);
      mockClient.stores.list.mockResolvedValue({ data: [] });

      const result = await resolveStore(
        mockClient as unknown as Mixedbread,
        "550e8400-e29b-41d4-a716-446655440010"
      );

      expect(result).toEqual(mockStore);
      expect(mockClient.stores.retrieve).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440010"
      );
      expect(mockClient.stores.list).not.toHaveBeenCalled();
    });

    it("should resolve store by name", async () => {
      const mockStore = {
        id: "550e8400-e29b-41d4-a716-446655440011",
        name: "my-store",
      };

      // Names are valid identifiers, so retrieve should succeed
      mockClient.stores.retrieve.mockResolvedValue(mockStore);

      const result = await resolveStore(
        mockClient as unknown as Mixedbread,
        "my-store"
      );

      expect(result).toEqual(mockStore);
      expect(mockClient.stores.retrieve).toHaveBeenCalledWith("my-store");
      expect(mockClient.stores.list).not.toHaveBeenCalled();
    });

    it("should resolve using alias", async () => {
      const mockStore = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "aliased-store",
      };

      (
        configUtils.resolveStoreName as jest.MockedFunction<
          typeof configUtils.resolveStoreName
        >
      ).mockReturnValue("550e8400-e29b-41d4-a716-446655440001");
      mockClient.stores.retrieve.mockResolvedValue(mockStore);
      mockClient.stores.list.mockResolvedValue({ data: [] });

      const result = await resolveStore(
        mockClient as unknown as Mixedbread,
        "myalias"
      );

      expect(configUtils.resolveStoreName).toHaveBeenCalledWith("myalias");
      expect(result).toEqual(mockStore);
      expect(mockClient.stores.retrieve).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440001"
      );
    });

    it("should handle store not found by ID", async () => {
      mockClient.stores.retrieve.mockRejectedValue(
        new Error("Store not found")
      );
      mockClient.stores.list.mockResolvedValue({ data: [] });

      await expect(
        resolveStore(
          mockClient as unknown as Mixedbread,
          "550e8400-e29b-41d4-a716-446655440002"
        )
      ).rejects.toThrow(
        'Store "550e8400-e29b-41d4-a716-446655440002" not found'
      );
    });

    it("should handle store not found by name", async () => {
      // Mock retrieve to fail first
      mockClient.stores.retrieve.mockRejectedValue(new Error("Not found"));

      mockClient.stores.list.mockResolvedValue({
        data: [
          { id: "550e8400-e29b-41d4-a716-446655440014", name: "other-store" },
          { id: "550e8400-e29b-41d4-a716-446655440015", name: "another-store" },
        ],
      });

      await expect(
        resolveStore(
          mockClient as unknown as Mixedbread,
          "nonexistent-store"
        )
      ).rejects.toThrow('Store "nonexistent-store" not found');
    });

    it("should handle empty store list", async () => {
      // Mock retrieve to fail first
      mockClient.stores.retrieve.mockRejectedValue(new Error("Not found"));

      mockClient.stores.list.mockResolvedValue({ data: [] });

      await expect(
        resolveStore(mockClient as unknown as Mixedbread, "any-store")
      ).rejects.toThrow('Store "any-store" not found');
    });

    it("should handle API errors when listing", async () => {
      // Mock retrieve to fail first
      mockClient.stores.retrieve.mockRejectedValue(new Error("Not found"));
      mockClient.stores.list.mockRejectedValue(
        new Error("API Error: Unauthorized")
      );

      await expect(
        resolveStore(mockClient as unknown as Mixedbread, "some-store")
      ).rejects.toThrow("API Error: Unauthorized");
    });

    it("should handle case-sensitive name matching", async () => {
      const mockStore = {
        id: "550e8400-e29b-41d4-a716-446655440017",
        name: "mystore",
      };

      // Names are valid identifiers, so retrieve should succeed
      mockClient.stores.retrieve.mockResolvedValue(mockStore);

      const result = await resolveStore(
        mockClient as unknown as Mixedbread,
        "mystore"
      );

      expect(result).toEqual(mockStore);
      expect(mockClient.stores.retrieve).toHaveBeenCalledWith("mystore");
      expect(mockClient.stores.list).not.toHaveBeenCalled();
    });

    it("should handle special characters in names", async () => {
      const mockStore = {
        id: "550e8400-e29b-41d4-a716-446655440018",
        name: "my-store_v2.0",
      };

      // Names with special characters are still valid identifiers
      mockClient.stores.retrieve.mockResolvedValue(mockStore);

      const result = await resolveStore(
        mockClient as unknown as Mixedbread,
        "my-store_v2.0"
      );

      expect(result).toEqual(mockStore);
      expect(mockClient.stores.retrieve).toHaveBeenCalledWith("my-store_v2.0");
      expect(mockClient.stores.list).not.toHaveBeenCalled();
    });

    it("should check if input looks like UUID before searching by name", async () => {
      // Input that looks like UUID should try retrieve first, then fall through to name search
      mockClient.stores.retrieve.mockRejectedValue(new Error("Not found"));
      mockClient.stores.list.mockResolvedValue({ data: [] });

      await expect(
        resolveStore(
          mockClient as unknown as Mixedbread,
          "550e8400-e29b-41d4-a716-446655440003"
        )
      ).rejects.toThrow();

      expect(mockClient.stores.retrieve).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440003"
      );
      expect(mockClient.stores.list).toHaveBeenCalled();
    });

    it("should search by name for non-ID inputs", async () => {
      const mockStore = {
        id: "550e8400-e29b-41d4-a716-446655440004",
        name: "test",
      };

      // Names are valid identifiers, so retrieve should succeed
      mockClient.stores.retrieve.mockResolvedValue(mockStore);

      const result = await resolveStore(
        mockClient as unknown as Mixedbread,
        "test"
      );

      expect(result).toEqual(mockStore);
      expect(mockClient.stores.retrieve).toHaveBeenCalledWith("test");
      expect(mockClient.stores.list).not.toHaveBeenCalled();
    });
  });
});
