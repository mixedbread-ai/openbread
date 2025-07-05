import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import mockFs from "mock-fs";
import {
  type CLIConfig,
  getApiKey,
  loadConfig,
  parseConfigValue,
  resolveVectorStoreName,
  saveConfig,
} from "../../src/utils/config";
import { getTestConfigDir } from "../helpers/test-utils";

describe("Config Utils", () => {
  const configDir = getTestConfigDir();
  const configFile = join(configDir, "config.json");

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  describe("loadConfig", () => {
    it("should return default config when config file does not exist", () => {
      mockFs({});

      const config = loadConfig();

      expect(config).toMatchObject({
        version: "1.0",
        defaults: {
          upload: {
            strategy: "fast",
            contextualization: false,
            parallel: 5,
          },
          search: {
            top_k: 10,
            rerank: false,
          },
        },
        aliases: {},
      });
    });

    it("should load and validate config from file", () => {
      const testConfig: CLIConfig = {
        version: "1.0",
        api_key: "mxb_test123",
        api_keys: {
          work: "mxb_work123",
          personal: "mxb_personal123",
        },
        defaults: {
          upload: {
            strategy: "high_quality",
            parallel: 10,
          },
          api_key: "work",
        },
        aliases: {
          docs: "vs_abc123",
        },
      };

      mockFs({
        [configFile]: JSON.stringify(testConfig),
      });

      const config = loadConfig();

      expect(config.api_key).toBe("mxb_test123");
      expect(config.api_keys?.work).toBe("mxb_work123");
      expect(config.api_keys?.personal).toBe("mxb_personal123");
      expect(config.defaults?.api_key).toBe("work");
      expect(config.defaults?.upload?.strategy).toBe("high_quality");
      expect(config.aliases?.docs).toBe("vs_abc123");
    });

    it("should return default config for invalid JSON", () => {
      mockFs({
        [configFile]: "invalid json",
      });

      const config = loadConfig();

      expect(console.warn).toHaveBeenCalledWith(
        expect.any(String),
        "Failed to load config file, using defaults"
      );
      expect(config.version).toBe("1.0");
    });

    it("should warn and use defaults for invalid config structure", () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_key: "invalid_key", // Should start with mxb_
        }),
      });

      const config = loadConfig();

      expect(console.warn).toHaveBeenCalled();
      expect(config.api_key).toBeUndefined();
    });
  });

  describe("saveConfig", () => {
    it("should create config directory if it does not exist", () => {
      mockFs({});

      const config: CLIConfig = {
        version: "1.0",
        api_key: "mxb_test123",
      };

      saveConfig(config);

      const savedContent = readFileSync(configFile, "utf-8");
      expect(JSON.parse(savedContent)).toEqual(config);
    });

    it("should overwrite existing config file", () => {
      const oldConfig = { version: "1.0", api_key: "mxb_old" };
      const newConfig: CLIConfig = { version: "1.0", api_key: "mxb_new" };

      mockFs({
        [configFile]: JSON.stringify(oldConfig),
      });

      saveConfig(newConfig);

      const savedContent = readFileSync(configFile, "utf-8");
      expect(JSON.parse(savedContent).api_key).toBe("mxb_new");
    });
  });

  describe("getApiKey", () => {
    const originalEnv = process.env.MXBAI_API_KEY;

    afterEach(() => {
      if (originalEnv) {
        process.env.MXBAI_API_KEY = originalEnv;
      } else {
        delete process.env.MXBAI_API_KEY;
      }
    });

    it("should prioritize command line option with direct API key", () => {
      process.env.MXBAI_API_KEY = "mxb_env123";
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
          },
          defaults: {
            api_key: "work",
          },
        }),
      });

      const apiKey = getApiKey({ apiKey: "mxb_cli123" });

      expect(apiKey).toBe("mxb_cli123");
    });

    it("should resolve API key name from command line option", () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
            personal: "mxb_personal123",
          },
          defaults: {
            api_key: "work",
          },
        }),
      });

      const apiKey = getApiKey({ apiKey: "personal" });

      expect(apiKey).toBe("mxb_personal123");
    });

    it("should use environment variable when no CLI option", () => {
      process.env.MXBAI_API_KEY = "mxb_env123";
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
          },
        }),
      });

      const apiKey = getApiKey();

      expect(apiKey).toBe("mxb_env123");
    });

    it("should use default API key from new format", () => {
      delete process.env.MXBAI_API_KEY;
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
            personal: "mxb_personal123",
          },
          defaults: {
            api_key: "work",
          },
        }),
      });

      const apiKey = getApiKey();

      expect(apiKey).toBe("mxb_work123");
    });

    it("should prompt for migration when old format detected", () => {
      delete process.env.MXBAI_API_KEY;
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_key: "mxb_old123",
          api_keys: {},
        }),
      });

      getApiKey();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("⚠  Migration Required")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should show available keys when no default set", () => {
      delete process.env.MXBAI_API_KEY;
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
            personal: "mxb_personal123",
          },
        }),
      });

      getApiKey();

      expect(console.log).toHaveBeenCalledWith(
        expect.any(String),
        "No default API key set.\n"
      );
      expect(console.log).toHaveBeenCalledWith("Available API keys:");
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should exit with error when API key name not found", () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
          },
        }),
      });

      getApiKey({ apiKey: "nonexistent" });

      expect(console.log).toHaveBeenCalledWith(
        expect.any(String),
        'No API key found with name "nonexistent"'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should exit with error when no API key found", () => {
      delete process.env.MXBAI_API_KEY;
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {},
        }),
      });

      getApiKey();

      expect(console.log).toHaveBeenCalledWith(
        expect.any(String),
        "No API key found.\n"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("resolveVectorStoreName", () => {
    it("should return alias value if exists", () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          aliases: { docs: "vs_abc123" },
        }),
      });

      const resolved = resolveVectorStoreName("docs");

      expect(resolved).toBe("vs_abc123");
    });

    it("should return original name if no alias exists", () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          aliases: { other: "vs_xyz789" },
        }),
      });

      const resolved = resolveVectorStoreName("vs_direct123");

      expect(resolved).toBe("vs_direct123");
    });

    it("should handle missing aliases object", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0" }),
      });

      const resolved = resolveVectorStoreName("test");

      expect(resolved).toBe("test");
    });
  });

  describe("parseConfigValue", () => {
    it("should parse boolean values", () => {
      expect(
        parseConfigValue("defaults.upload.contextualization", "true")
      ).toBe(true);
      expect(
        parseConfigValue("defaults.upload.contextualization", "false")
      ).toBe(false);
    });

    it("should parse number values", () => {
      expect(parseConfigValue("defaults.upload.parallel", "10")).toBe(10);
      expect(parseConfigValue("defaults.search.top_k", "5")).toBe(5);
    });

    it("should parse enum values", () => {
      expect(parseConfigValue("defaults.upload.strategy", "fast")).toBe("fast");
      expect(parseConfigValue("defaults.upload.strategy", "high_quality")).toBe(
        "high_quality"
      );
    });

    it("should parse string values", () => {
      expect(parseConfigValue("api_key", "mxb_test123")).toBe("mxb_test123");
      expect(parseConfigValue("aliases.docs", "vs_abc123")).toBe("vs_abc123");
    });

    it("should validate api_key format", () => {
      parseConfigValue("api_key", "invalid_key");

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Invalid value for api_key:"),
        expect.any(String)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate enum constraints", () => {
      parseConfigValue("defaults.upload.strategy", "invalid_strategy");

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Invalid value for defaults.upload.strategy:"),
        expect.any(String)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate number constraints", () => {
      parseConfigValue("defaults.upload.parallel", "-5");

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Invalid value for defaults.upload.parallel:"),
        expect.stringContaining("positive")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle unknown config keys", () => {
      parseConfigValue("unknown.key", "value");

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Unknown config key: unknown.key")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
