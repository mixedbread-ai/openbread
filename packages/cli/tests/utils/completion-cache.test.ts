import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Mixedbread } from "@mixedbread/sdk";
import mockFs from "mock-fs";
import {
  clearCacheForKey,
  getCurrentKeyName,
  getStoresForCompletion,
  refreshAllCaches,
  refreshCacheForKey,
  updateCacheAfterCreate,
  updateCacheAfterDelete,
  updateCacheAfterUpdate,
} from "../../src/utils/completion-cache";

// Mock createClient
jest.mock("../../src/utils/client", () => ({
  createClient: jest.fn(),
}));

// Mock config module
jest.mock("../../src/utils/config", () => ({
  loadConfig: jest.fn(),
  getConfigDir: jest.fn(() => "/test/.config/mixedbread"),
}));

describe("Completion Cache", () => {
  const configDir = "/test/.config/mixedbread";
  const cacheFile = join(configDir, "completion-cache.json");

  let mockLoadConfig: jest.MockedFunction<
    typeof import("../../src/utils/config").loadConfig
  >;
  let mockCreateClient: jest.MockedFunction<
    typeof import("../../src/utils/client").createClient
  >;

  beforeEach(async () => {
    // Get mocked functions
    const config = await import("../../src/utils/config");
    mockLoadConfig = config.loadConfig as jest.MockedFunction<
      typeof config.loadConfig
    >;

    const client = await import("../../src/utils/client");
    mockCreateClient = client.createClient as jest.MockedFunction<
      typeof client.createClient
    >;

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  describe("getCurrentKeyName", () => {
    it("should return the default key name from config", () => {
      mockLoadConfig.mockReturnValue({
        version: "1.0",
        api_keys: {
          work: "mxb_work123",
          personal: "mxb_personal123",
        },
        defaults: {
          api_key: "work",
        },
      });

      const keyName = getCurrentKeyName();
      expect(keyName).toBe("work");
    });

    it("should return null if no default key is set", () => {
      mockLoadConfig.mockReturnValue({
        version: "1.0",
        api_keys: {
          work: "mxb_work123",
        },
        defaults: {},
      });

      const keyName = getCurrentKeyName();
      expect(keyName).toBeNull();
    });

    it("should return null if default key doesn't exist in api_keys", () => {
      mockLoadConfig.mockReturnValue({
        version: "1.0",
        api_keys: {
          work: "mxb_work123",
        },
        defaults: {
          api_key: "nonexistent",
        },
      });

      const keyName = getCurrentKeyName();
      expect(keyName).toBeNull();
    });

    it("should return null if no api_keys exist", () => {
      mockLoadConfig.mockReturnValue({
        version: "1.0",
        defaults: {
          api_key: "work",
        },
      });

      const keyName = getCurrentKeyName();
      expect(keyName).toBeNull();
    });
  });

  describe("getStoresForCompletion", () => {
    it("should return stores for a given key from cache", () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            work: ["store1", "store2", "store3"],
            personal: ["personal-store"],
          },
        }),
      });

      const stores = getStoresForCompletion("work");
      expect(stores).toEqual(["store1", "store2", "store3"]);
    });

    it("should return empty array if key not in cache", () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            work: ["store1"],
          },
        }),
      });

      const stores = getStoresForCompletion("personal");
      expect(stores).toEqual([]);
    });

    it("should return empty array if cache file doesn't exist", () => {
      mockFs({});

      const stores = getStoresForCompletion("work");
      expect(stores).toEqual([]);
    });

    it("should return empty array if cache is invalid", () => {
      mockFs({
        [cacheFile]: "invalid json",
      });

      const stores = getStoresForCompletion("work");
      expect(stores).toEqual([]);
    });
  });

  describe("refreshCacheForKey", () => {
    it("should fetch and cache stores for a key", async () => {
      mockFs({
        [configDir]: {},
      });

      const mockList = jest
        .fn<
          (params: {
            limit: number;
          }) => Promise<{ data: Array<{ id: string; name: string }> }>
        >()
        .mockResolvedValue({
          data: [
            { id: "store1", name: "store1" },
            { id: "store2", name: "store2" },
          ],
        });
      const mockClient = {
        vectorStores: {
          list: mockList,
        },
      } as unknown as Mixedbread;

      await refreshCacheForKey("work", mockClient);

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.work).toEqual(["store1", "store2"]);
      expect(mockList).toHaveBeenCalledWith({ limit: 50 });
    });

    it("should preserve existing cache for other keys", async () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            personal: ["personal-store"],
          },
        }),
      });

      const mockList = jest
        .fn<
          (params: {
            limit: number;
          }) => Promise<{ data: Array<{ id: string; name: string }> }>
        >()
        .mockResolvedValue({
          data: [{ id: "store1", name: "work-store" }],
        });
      const mockClient = {
        vectorStores: {
          list: mockList,
        },
      } as unknown as Mixedbread;

      await refreshCacheForKey("work", mockClient);

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.personal).toEqual(["personal-store"]);
      expect(cacheContent.stores.work).toEqual(["work-store"]);
    });

    it("should keep existing cache on API error", async () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            work: ["existing-store"],
          },
        }),
      });

      const mockList = jest
        .fn<
          (params: {
            limit: number;
          }) => Promise<{ data: Array<{ id: string; name: string }> }>
        >()
        .mockRejectedValue(new Error("API Error"));
      const mockClient = {
        vectorStores: {
          list: mockList,
        },
      } as unknown as Mixedbread;

      await refreshCacheForKey("work", mockClient);

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.work).toEqual(["existing-store"]);
    });

    it("should create cache directory if it doesn't exist", async () => {
      mockFs({});

      const mockList = jest
        .fn<
          (params: {
            limit: number;
          }) => Promise<{ data: Array<{ id: string; name: string }> }>
        >()
        .mockResolvedValue({
          data: [{ id: "store1", name: "store1" }],
        });
      const mockClient = {
        vectorStores: {
          list: mockList,
        },
      } as unknown as Mixedbread;

      await refreshCacheForKey("work", mockClient);

      expect(existsSync(configDir)).toBe(true);
      expect(existsSync(cacheFile)).toBe(true);
    });
  });

  describe("refreshAllCaches", () => {
    it("should refresh cache for all API keys", async () => {
      mockLoadConfig.mockReturnValue({
        version: "1.0",
        api_keys: {
          work: "mxb_work123",
          personal: "mxb_personal123",
        },
      });

      mockFs({
        [configDir]: {},
      });

      const mockList = jest
        .fn<
          (params: {
            limit: number;
          }) => Promise<{ data: Array<{ id: string; name: string }> }>
        >()
        .mockResolvedValueOnce({
          data: [{ id: "store1", name: "work-store" }],
        })
        .mockResolvedValueOnce({
          data: [{ id: "store2", name: "personal-store" }],
        });
      const mockClient = {
        vectorStores: {
          list: mockList,
        },
      } as unknown as Mixedbread;

      mockCreateClient.mockReturnValue(mockClient);

      await refreshAllCaches({ baseUrl: "https://api.example.com" });

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.work).toEqual(["work-store"]);
      expect(cacheContent.stores.personal).toEqual(["personal-store"]);
      expect(mockCreateClient).toHaveBeenCalledTimes(2);
    });

    it("should throw error if no API keys found", async () => {
      mockLoadConfig.mockReturnValue({
        version: "1.0",
      });

      await expect(refreshAllCaches({})).rejects.toThrow("No API keys found");
    });
  });

  describe("updateCacheAfterCreate", () => {
    it("should add new store to cache", () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            work: ["existing-store"],
          },
        }),
      });

      updateCacheAfterCreate("work", "new-store");

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.work).toContain("new-store");
      expect(cacheContent.stores.work).toContain("existing-store");
    });

    it("should not add duplicate stores", () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            work: ["existing-store"],
          },
        }),
      });

      updateCacheAfterCreate("work", "existing-store");

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.work).toEqual(["existing-store"]);
    });

    it("should not exceed max stores limit", () => {
      const stores = Array.from({ length: 50 }, (_, i) => `store${i}`);
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            work: stores,
          },
        }),
      });

      updateCacheAfterCreate("work", "new-store");

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.work.length).toBe(50);
      expect(cacheContent.stores.work).not.toContain("new-store");
    });

    it("should initialize stores array if key doesn't exist", () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {},
        }),
      });

      updateCacheAfterCreate("work", "new-store");

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.work).toEqual(["new-store"]);
    });
  });

  describe("updateCacheAfterUpdate", () => {
    it("should rename store in cache", () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            work: ["old-name", "other-store"],
          },
        }),
      });

      updateCacheAfterUpdate("work", "old-name", "new-name");

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.work).toEqual(["new-name", "other-store"]);
    });

    it("should handle non-existent store gracefully", () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            work: ["store1", "store2"],
          },
        }),
      });

      updateCacheAfterUpdate("work", "nonexistent", "new-name");

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.work).toEqual(["store1", "store2"]);
    });
  });

  describe("updateCacheAfterDelete", () => {
    it("should remove store from cache", () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            work: ["store1", "store2", "store3"],
          },
        }),
      });

      updateCacheAfterDelete("work", "store2");

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.work).toEqual(["store1", "store3"]);
    });

    it("should handle non-existent store gracefully", () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            work: ["store1", "store2"],
          },
        }),
      });

      updateCacheAfterDelete("work", "nonexistent");

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.work).toEqual(["store1", "store2"]);
    });
  });

  describe("clearCacheForKey", () => {
    it("should remove all stores for a key", () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            work: ["store1", "store2"],
            personal: ["personal-store"],
          },
        }),
      });

      clearCacheForKey("work");

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.work).toBeUndefined();
      expect(cacheContent.stores.personal).toEqual(["personal-store"]);
    });

    it("should only clear specified key", () => {
      mockFs({
        [cacheFile]: JSON.stringify({
          version: "1.0",
          stores: {
            work: ["store1"],
            personal: ["personal-store"],
          },
        }),
      });

      clearCacheForKey("work");

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores.personal).toEqual(["personal-store"]);
      expect(cacheContent.stores.work).toBeUndefined();
    });
  });

  describe("concurrent operations", () => {
    it("should handle concurrent cache updates", async () => {
      mockFs({
        [configDir]: {},
      });

      const mockList = jest
        .fn<
          (params: {
            limit: number;
          }) => Promise<{ data: Array<{ id: string; name: string }> }>
        >()
        .mockResolvedValue({
          data: [{ id: "store1", name: "store1" }],
        });
      const mockClient = {
        vectorStores: {
          list: mockList,
        },
      } as unknown as Mixedbread;

      // Simulate concurrent writes
      await Promise.all([
        refreshCacheForKey("work", mockClient),
        refreshCacheForKey("personal", mockClient),
      ]);

      const cacheContent = JSON.parse(readFileSync(cacheFile, "utf-8"));
      expect(cacheContent.stores).toHaveProperty("work");
      expect(cacheContent.stores).toHaveProperty("personal");
    });
  });
});
