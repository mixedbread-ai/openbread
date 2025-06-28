import {
  createMixedbreadClient,
  getMixedbreadClient,
  resetMixedbreadClient,
} from "../../src/utils.js";

describe("Utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Reset singleton
    resetMixedbreadClient();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("createMixedbreadClient", () => {
    it("should create client with valid API key", () => {
      process.env.MXBAI_API_KEY = "test-api-key";

      const client = createMixedbreadClient();

      expect(client).toBeDefined();
      expect(client.constructor.name).toBe("Mixedbread");
    });

    it("should throw error when API key is missing", () => {
      delete process.env.MXBAI_API_KEY;

      expect(() => createMixedbreadClient()).toThrow(
        "MXBAI_API_KEY environment variable is required"
      );
    });

    it("should throw error when API key is empty", () => {
      process.env.MXBAI_API_KEY = "";

      expect(() => createMixedbreadClient()).toThrow(
        "MXBAI_API_KEY environment variable is required"
      );
    });
  });

  describe("getMixedbreadClient", () => {
    it("should return singleton instance", () => {
      process.env.MXBAI_API_KEY = "test-api-key";

      const client1 = getMixedbreadClient();
      const client2 = getMixedbreadClient();

      expect(client1).toBe(client2);
    });

    it("should create client on first call", () => {
      process.env.MXBAI_API_KEY = "test-api-key";

      const client = getMixedbreadClient();

      expect(client).toBeDefined();
      expect(client.constructor.name).toBe("Mixedbread");
    });

    it("should throw error when API key is missing", () => {
      delete process.env.MXBAI_API_KEY;

      expect(() => getMixedbreadClient()).toThrow(
        "MXBAI_API_KEY environment variable is required"
      );
    });
  });
});
