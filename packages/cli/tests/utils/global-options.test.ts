import { describe, expect, it } from "@jest/globals";
import { Command } from "commander";
import { z } from "zod";
import {
  BaseGlobalOptionsSchema,
  GlobalOptionsSchema,
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

      expect(() => {
        parseOptions(GlobalOptionsSchema, options);
      }).toThrow("Cannot specify both --api-key and --saved-key options");
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

      expect(() => {
        parseOptions(GlobalOptionsSchema, options);
      }).toThrow('"format" must be either "table", "json", or "csv"');
    });

    it("should handle validation errors for format", () => {
      const options = {
        apiKey: "work", // Valid API key name
        format: "invalid",
      };

      expect(() => {
        parseOptions(GlobalOptionsSchema, options);
      }).toThrow('"format" must be either "table", "json", or "csv"');
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

      expect(() => {
        parseOptions(customSchema, options);
      }).toThrow("Cannot specify both --api-key and --saved-key options");
    });
  });
});
