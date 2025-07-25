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
import { createKeysCommand } from "../../../src/commands/config/keys";
import { loadConfig } from "../../../src/utils/config";
import { getTestConfigDir } from "../../helpers/test-utils";

// Mock inquirer
jest.mock("inquirer");

describe("Config Keys Command", () => {
  const configDir = getTestConfigDir();
  const configFile = join(configDir, "config.json");
  let command: Command;
  let mockInquirer: jest.Mocked<typeof import("inquirer").default>;

  beforeEach(async () => {
    command = createKeysCommand();
    mockInquirer = (await import("inquirer")).default as jest.Mocked<
      typeof import("inquirer").default
    >;
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  describe("add command", () => {
    it("should add API key with provided name", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0", api_keys: {} }),
      });

      command.parse(["node", "keys", "add", "mxb_test123", "work"]);

      const config = loadConfig();
      expect(config.api_keys?.work).toBe("mxb_test123");
      expect(config.defaults?.api_key).toBe("work");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("✓"),
        expect.stringContaining('API key "work" saved and set as default')
      );
    });

    it("should prompt for name if not provided", async () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0", api_keys: {} }),
      });

      mockInquirer.prompt.mockResolvedValue({ name: "personal" });

      await command.parseAsync(["node", "keys", "add", "mxb_test123"]);

      const config = loadConfig();
      expect(config.api_keys?.personal).toBe("mxb_test123");
      expect(config.defaults?.api_key).toBe("personal");
      expect(mockInquirer.prompt).toHaveBeenCalledWith({
        type: "input",
        name: "name",
        message: expect.stringContaining("Enter a name for this API key"),
        validate: expect.any(Function),
      });
    });

    it("should validate API key format", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0" }),
      });

      command.parse(["node", "keys", "add", "invalid_key", "test"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("✗"),
        'API key must start with "mxb_"'
      );
    });

    it("should validate name is not empty", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0", api_keys: {} }),
      });

      command.parse(["node", "keys", "add", "mxb_test123", "   "]);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("✗"),
        "Name cannot be empty"
      );
    });

    it("should check for duplicate names", () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: { work: "mxb_existing" },
        }),
      });

      command.parse(["node", "keys", "add", "mxb_test123", "work"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("✗"),
        'API key "work" already exists'
      );
    });

    it("should validate name in prompt", async () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: { existing: "mxb_existing" },
        }),
      });

      mockInquirer.prompt.mockResolvedValue({ name: "new" });

      await command.parseAsync(["node", "keys", "add", "mxb_test123"]);

      const promptCall = mockInquirer.prompt.mock.calls[0][0] as any;
      const validate = promptCall.validate;

      expect(validate("")).toBe("Name cannot be empty");
      expect(validate("  ")).toBe("Name cannot be empty");
      expect(validate("existing")).toBe('API key "existing" already exists');
      expect(validate("different")).toBe(true);
    });
  });

  describe("list command", () => {
    it("should list all API keys with default marked", () => {
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

      command.parse(["node", "keys", "list"]);

      expect(console.log).toHaveBeenCalledWith("API Keys:");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("* work (default)")
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("  personal")
      );
    });

    it("should show message when no API keys configured", () => {
      mockFs({
        [configFile]: JSON.stringify({ version: "1.0", api_keys: {} }),
      });

      command.parse(["node", "keys", "list"]);

      expect(console.log).toHaveBeenCalledWith("No API keys configured");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("mxbai config keys add")
      );
    });
  });

  describe("remove command", () => {
    it("should remove API key with confirmation", async () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
            personal: "mxb_personal123",
          },
          defaults: {
            api_key: "personal",
          },
        }),
      });

      mockInquirer.prompt.mockResolvedValue({ confirm: true });

      await command.parseAsync(["node", "keys", "remove", "work"]);

      const config = loadConfig();
      expect(config.api_keys?.work).toBeUndefined();
      expect(config.api_keys?.personal).toBe("mxb_personal123");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("✓"),
        'API key "work" removed'
      );
    });

    it("should warn when removing default API key", async () => {
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

      mockInquirer.prompt.mockResolvedValue({ confirm: true });

      await command.parseAsync(["node", "keys", "remove", "work"]);

      const config = loadConfig();
      expect(config.defaults?.api_key).toBeUndefined();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("⚠"),
        "No default API key set. Set a new default:"
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("mxbai config keys set-default personal")
      );
    });

    it("should cancel removal when not confirmed", async () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
          },
        }),
      });

      mockInquirer.prompt.mockResolvedValue({ confirm: false });

      await command.parseAsync(["node", "keys", "remove", "work"]);

      const config = loadConfig();
      expect(config.api_keys?.work).toBe("mxb_work123");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Removal cancelled.")
      );
    });

    it("should handle removing non-existent key", async () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
          },
        }),
      });

      await command.parseAsync(["node", "keys", "remove", "nonexistent"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("✗"),
        'No API key found with name "nonexistent"'
      );
    });

    it("should remove API key with --yes flag without confirmation", async () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
            personal: "mxb_personal123",
          },
        }),
      });

      await command.parseAsync(["node", "keys", "remove", "work", "--yes"]);

      const config = loadConfig();
      expect(config.api_keys?.work).toBeUndefined();
      expect(config.api_keys?.personal).toBe("mxb_personal123");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("✓"),
        'API key "work" removed'
      );
      // Should not call inquirer.prompt when using --yes
      expect(mockInquirer.prompt).not.toHaveBeenCalled();
    });

    it("should remove default API key with --yes flag without confirmation", async () => {
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

      await command.parseAsync(["node", "keys", "remove", "work", "--yes"]);

      const config = loadConfig();
      expect(config.api_keys?.work).toBeUndefined();
      expect(config.defaults?.api_key).toBeUndefined();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("✓"),
        'API key "work" removed'
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("⚠"),
        "No default API key set. Set a new default:"
      );
      // Should not call inquirer.prompt when using --yes
      expect(mockInquirer.prompt).not.toHaveBeenCalled();
    });

    it("should handle --yes flag with non-existent key", async () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
          },
        }),
      });

      await command.parseAsync([
        "node",
        "keys",
        "remove",
        "nonexistent",
        "--yes",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("✗"),
        'No API key found with name "nonexistent"'
      );
      // Should not call inquirer.prompt even with --yes when key doesn't exist
      expect(mockInquirer.prompt).not.toHaveBeenCalled();
    });
  });

  describe("set-default command", () => {
    it("should set default API key", () => {
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

      command.parse(["node", "keys", "set-default", "personal"]);

      const config = loadConfig();
      expect(config.defaults?.api_key).toBe("personal");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("✓"),
        '"personal" set as default API key'
      );
    });

    it("should handle setting default for non-existent key", () => {
      mockFs({
        [configFile]: JSON.stringify({
          version: "1.0",
          api_keys: {
            work: "mxb_work123",
          },
        }),
      });

      command.parse(["node", "keys", "set-default", "nonexistent"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("✗"),
        'No API key found with name "nonexistent"'
      );
      expect(console.log).toHaveBeenCalledWith("\nAvailable API keys:");
    });
  });

  describe("help command", () => {
    it("should show help when no subcommand provided", () => {
      const helpSpy = jest.spyOn(command, "help").mockImplementation((() => {
        console.log("Keys help");
        return command;
      }) as any);

      command.parse(["node", "keys"]);

      expect(helpSpy).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith("Keys help");
    });
  });
});
