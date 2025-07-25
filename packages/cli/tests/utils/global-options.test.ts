import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Command } from "commander";
import { z } from "zod";
import {
  BaseGlobalOptionsSchema,
  GlobalOptionsSchema,
  mergeCommandOptions,
  parseOptions,
  setupGlobalOptions,
} from "../../src/utils/global-options";

describe("Global Options", () => {
  describe("setupGlobalOptions", () => {
    it("should add global options to command", () => {
      const command = new Command();
      setupGlobalOptions(command);

      const options = command.options;
      expect(options).toContainEqual(
        expect.objectContaining({ long: "--api-key" })
      );
      expect(options).toContainEqual(
        expect.objectContaining({ long: "--saved-key" })
      );
      expect(options).toContainEqual(
        expect.objectContaining({ long: "--format" })
      );
      expect(options).toContainEqual(
        expect.objectContaining({ long: "--debug" })
      );
    });

    it.skip("should set debug mode from flag", () => {
      const command = new Command();
      setupGlobalOptions(command);

      // Mock the hook behavior
      const commandWithHooks = command as Command & {
        _hooks: {
          preAction: ((thisCommand: unknown, actionCommand: unknown) => void)[];
        };
      };
      const hookCallback = commandWithHooks._hooks.preAction[0];
      hookCallback({ opts: () => ({ debug: true }) }, command);

      expect(process.env.MXBAI_DEBUG).toBe("true");
    });

    it.skip("should preserve existing debug mode from environment", () => {
      const originalDebug = process.env.MXBAI_DEBUG;
      process.env.MXBAI_DEBUG = "true";

      const command = new Command();
      setupGlobalOptions(command);

      const commandWithHooks = command as Command & {
        _hooks: {
          preAction: ((thisCommand: unknown, actionCommand: unknown) => void)[];
        };
      };
      const hookCallback = commandWithHooks._hooks.preAction[0];
      hookCallback({ opts: () => ({ debug: false }) }, command);

      expect(process.env.MXBAI_DEBUG).toBe("true");

      // Cleanup
      if (originalDebug) {
        process.env.MXBAI_DEBUG = originalDebug;
      } else {
        delete process.env.MXBAI_DEBUG;
      }
    });
  });

  describe("mergeCommandOptions", () => {
    let parentCommand: Command;
    let childCommand: Command;

    beforeEach(() => {
      parentCommand = new Command();
      parentCommand.opts = jest
        .fn<() => Record<string, unknown>>()
        .mockReturnValue({ apiKey: "parent_key", format: "json" }) as any;

      childCommand = new Command();
      childCommand.parent = parentCommand;
    });

    it("should merge parent and child options", () => {
      const options = { debug: true };
      const merged = mergeCommandOptions(childCommand, options);

      expect(merged).toEqual({
        apiKey: "parent_key",
        format: "json",
        debug: true,
      });
    });

    it("should prioritize child options over parent", () => {
      const options = { apiKey: "child_key", format: "csv" };
      const merged = mergeCommandOptions(childCommand, options);

      expect(merged).toEqual({
        apiKey: "child_key",
        format: "csv",
      });
    });

    it("should handle commands without parent", () => {
      const command = new Command();
      const options = { apiKey: "test_key" };
      const merged = mergeCommandOptions(command, options);

      expect(merged).toEqual({ apiKey: "test_key" });
    });

    it("should log options in debug mode", () => {
      const originalDebug = process.env.MXBAI_DEBUG;
      process.env.MXBAI_DEBUG = "true";

      const options = { debug: true };
      mergeCommandOptions(childCommand, options);

      expect(console.log).toHaveBeenCalledWith(
        "\nCommand hierarchy options:",
        expect.any(Array)
      );
      expect(console.log).toHaveBeenCalledWith(
        "Merged options:",
        expect.any(Object)
      );

      // Cleanup
      if (originalDebug) {
        process.env.MXBAI_DEBUG = originalDebug;
      } else {
        delete process.env.MXBAI_DEBUG;
      }
    });
  });

  describe("parseOptions", () => {
    it("should parse valid options", () => {
      const options = {
        apiKey: "mxb_test123",
        format: "json",
        debug: true,
      };

      const parsed = parseOptions(GlobalOptionsSchema, options);

      expect(parsed).toEqual(options);
    });

    it("should parse valid options with savedKey", () => {
      const options = {
        savedKey: "work",
        format: "json",
        debug: true,
      };

      const parsed = parseOptions(GlobalOptionsSchema, options);

      expect(parsed).toEqual(options);
    });

    it("should reject both apiKey and savedKey options", () => {
      const options = {
        apiKey: "mxb_test123",
        savedKey: "work",
      };

      parseOptions(GlobalOptionsSchema, options);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          "Cannot specify both --api-key and --saved-key options"
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should allow optional fields to be undefined", () => {
      const options = {};
      const parsed = parseOptions(GlobalOptionsSchema, options);

      expect(parsed).toEqual({});
    });

    it("should accept any string as API key (validation moved to resolution)", () => {
      const options = {
        apiKey: "work", // API key name
      };

      const parsed = parseOptions(GlobalOptionsSchema, options);

      expect(parsed).toEqual(options);
    });

    it("should accept actual API keys", () => {
      const options = {
        apiKey: "mxb_test123", // Actual API key
      };

      const parsed = parseOptions(GlobalOptionsSchema, options);

      expect(parsed).toEqual(options);
    });

    it("should validate format enum", () => {
      const options = {
        format: "invalid",
      };

      parseOptions(GlobalOptionsSchema, options);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          '"format" must be either "table", "json", or "csv"'
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle validation errors for format", () => {
      const options = {
        apiKey: "work", // Valid API key name
        format: "invalid",
      };

      parseOptions(GlobalOptionsSchema, options);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          '"format" must be either "table", "json", or "csv"'
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should parse custom schemas", () => {
      const customSchema = BaseGlobalOptionsSchema.extend({
        customField: z.string(),
      });

      const options = {
        apiKey: "mxb_test",
        customField: "test",
      };

      const parsed = parseOptions(customSchema, options);

      expect(parsed).toEqual(options);
    });

    it("should reject both apiKey and savedKey in extended schemas", () => {
      const { extendGlobalOptions } = require("../../src/utils/global-options");
      const customSchema = extendGlobalOptions({
        customField: z.string(),
      });

      const options = {
        apiKey: "mxb_test123",
        savedKey: "work",
        customField: "test",
      };

      parseOptions(customSchema, options);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          "Cannot specify both --api-key and --saved-key options"
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
