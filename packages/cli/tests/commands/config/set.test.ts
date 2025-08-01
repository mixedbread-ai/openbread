import { join } from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Command } from "commander";
import mockFs from "mock-fs";
import { createSetCommand } from "../../../src/commands/config/set";
import { loadConfig } from "../../../src/utils/config";
import { getTestConfigDir } from "../../helpers/test-utils";

describe("Config Set Command", () => {
  const configDir = getTestConfigDir();
  const configFile = join(configDir, "config.json");
  let command: Command;

  beforeEach(() => {
    command = createSetCommand();
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  describe("Basic value setting", () => {
    it("should set default API key name in new format", () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
          },
        }),
      });

      command.parse(["node", "set", "defaults.api_key", "work"]);

      const config = loadConfig();
      expect(config.defaults?.api_key).toBe("work");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("✓"),
        expect.stringContaining("Set defaults.api_key to work")
      );
    });

    it("should set nested values", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0" }),
      });

      command.parse([
        "node",
        "set",
        "defaults.upload.strategy",
        "high_quality",
      ]);

      const config = loadConfig();
      expect(config.defaults?.upload?.strategy).toBe("high_quality");
    });

    it("should set boolean values", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0" }),
      });

      command.parse([
        "node",
        "set",
        "defaults.upload.contextualization",
        "true",
      ]);

      const config = loadConfig();
      expect(config.defaults?.upload?.contextualization).toBe(true);
    });

    it("should set number values", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0" }),
      });

      command.parse(["node", "set", "defaults.upload.parallel", "10"]);

      const config = loadConfig();
      expect(config.defaults?.upload?.parallel).toBe(10);
    });

    it("should set aliases", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0" }),
      });

      command.parse(["node", "set", "aliases.docs", "vs_abc123"]);

      const config = loadConfig();
      expect(config.aliases?.docs).toBe("vs_abc123");
    });
  });

  describe("Creating nested structures", () => {
    it("should create nested objects if they do not exist", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0" }),
      });

      command.parse(["node", "set", "defaults.upload.strategy", "fast"]);

      const config = loadConfig();
      expect(config.defaults).toBeDefined();
      expect(config.defaults?.upload).toBeDefined();
      expect(config.defaults?.upload?.strategy).toBe("fast");
    });

    it("should preserve existing nested values", () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          defaults: {
            upload: {
              strategy: "fast",
              parallel: 5,
            },
          },
        }),
      });

      command.parse([
        "node",
        "set",
        "defaults.upload.contextualization",
        "true",
      ]);

      const config = loadConfig();
      expect(config.defaults?.upload?.strategy).toBe("fast");
      expect(config.defaults?.upload?.parallel).toBe(5);
      expect(config.defaults?.upload?.contextualization).toBe(true);
    });
  });

  describe("Validation", () => {
    it("should validate enum values", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0" }),
      });

      command.parse(["node", "set", "defaults.upload.strategy", "invalid"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Invalid value for defaults.upload.strategy:")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate boolean values", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0" }),
      });

      command.parse([
        "node",
        "set",
        "defaults.upload.contextualization",
        "maybe",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Failed to set configuration:"),
        expect.stringContaining('Must be "true" or "false"')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate number values", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0" }),
      });

      command.parse([
        "node",
        "set",
        "defaults.upload.parallel",
        "not-a-number",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Invalid value for defaults.upload.parallel:")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should reject unknown config keys", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0" }),
      });

      command.parse(["node", "set", "unknown.key", "value"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Unknown config key: unknown.key")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Error handling", () => {
    it("should handle file system errors", () => {
      // Make config directory read-only
      mockFs({
        [configDir]: mockFs.directory({ mode: 0o444 }),
      });

      command.parse(["node", "set", "api_key", "mxb_test123"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Failed to set configuration:",
        expect.any(String)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should create config file if it does not exist", () => {
      mockFs({});

      command.parse(["node", "set", "base_url", "https://api.example.com"]);

      const config = loadConfig();
      expect(config.base_url).toBe("https://api.example.com");
    });
  });
});
