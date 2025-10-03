import { describe, expect, it } from "@jest/globals";
import {
  findSimilarCommands,
  formatUnknownCommandError,
} from "../../src/utils/command-suggestions";

describe("Command Suggestions", () => {
  describe("findSimilarCommands", () => {
    const commands = ["store", "config", "completion", "list", "files"];

    it("should find commands within threshold", () => {
      expect(findSimilarCommands("stor", commands)).toEqual(["store"]);
      expect(findSimilarCommands("confg", commands)).toEqual(["config"]);
      expect(findSimilarCommands("lis", commands)).toContain("list");
    });

    it("should return empty for commands beyond threshold", () => {
      expect(findSimilarCommands("xyz", commands)).toEqual([]);
      expect(findSimilarCommands("abcdefg", commands)).toEqual([]);
    });

    it("should sort by distance (closest first)", () => {
      const result = findSimilarCommands("lst", commands);
      expect(result[0]).toBe("list"); // distance 1
    });

    it("should return multiple matches when applicable", () => {
      const result = findSimilarCommands("st", commands);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("store");
    });

    it("should use custom threshold", () => {
      expect(findSimilarCommands("str", commands, 1)).toEqual([]);
      expect(findSimilarCommands("store", commands, 0)).toEqual(["store"]);
    });
  });

  describe("formatUnknownCommandError", () => {
    const commands = ["store", "config", "completion"];

    it("should show deprecation message for 'vs' command", () => {
      const result = formatUnknownCommandError("vs", commands);
      expect(result).toContain("deprecated");
      expect(result).toContain("store");
      expect(result).toContain("v2.0.0");
      expect(result).toContain("CHANGELOG.md");
    });

    it("should show suggestions for close matches", () => {
      const result = formatUnknownCommandError("stor", commands);
      expect(result).toContain("Unknown command");
      expect(result).toContain("Did you mean one of these?");
      expect(result).toContain("store");
      expect(result).toContain("--help");
    });

    it("should list all commands when no close matches", () => {
      const result = formatUnknownCommandError("xyz", commands);
      expect(result).toContain("Unknown command");
      expect(result).toContain("Available commands:");
      expect(result).toContain("store");
      expect(result).toContain("config");
      expect(result).toContain("completion");
    });
  });
});
