import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  extractUserMetadata,
  loadMetadataMapping,
  metadataEquals,
} from "../../src/utils/metadata-file";

describe("Metadata File Utils", () => {
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a temporary directory for test files
    tempDir = mkdtempSync(join(tmpdir(), "metadata-file-test-"));
  });

  describe("loadMetadataMapping", () => {
    it("should load JSON metadata file", () => {
      const metadataPath = join(tempDir, "metadata.json");
      const metadataContent = {
        "file1.txt": { key1: "value1", key2: 123 },
        "file2.txt": { key1: "value2", key2: 456 },
      };

      writeFileSync(metadataPath, JSON.stringify(metadataContent));

      const result = loadMetadataMapping(metadataPath);

      expect(result.size).toBe(2);
      expect(result.get("file1.txt")).toEqual({ key1: "value1", key2: 123 });
      expect(result.get("file2.txt")).toEqual({ key1: "value2", key2: 456 });
    });

    it("should load YAML metadata file", () => {
      const metadataPath = join(tempDir, "metadata.yaml");
      const yamlContent = `
file1.txt:
  key1: value1
  key2: 123
file2.txt:
  key1: value2
  key2: 456
`;

      writeFileSync(metadataPath, yamlContent);

      const result = loadMetadataMapping(metadataPath);

      expect(result.size).toBe(2);
      expect(result.get("file1.txt")).toEqual({ key1: "value1", key2: 123 });
      expect(result.get("file2.txt")).toEqual({ key1: "value2", key2: 456 });
    });

    it("should normalize paths by removing leading ./", () => {
      const metadataPath = join(tempDir, "metadata.json");
      const metadataContent = {
        "./file1.txt": { key1: "value1" },
        "file2.txt": { key1: "value2" },
        ".\\file3.txt": { key1: "value3" },
      };

      writeFileSync(metadataPath, JSON.stringify(metadataContent));

      const result = loadMetadataMapping(metadataPath);

      expect(result.size).toBe(3);
      expect(result.get("file1.txt")).toEqual({ key1: "value1" });
      expect(result.get("file2.txt")).toEqual({ key1: "value2" });
      expect(result.get("file3.txt")).toEqual({ key1: "value3" });
    });

    it("should throw error for invalid JSON/YAML", () => {
      const metadataPath = join(tempDir, "metadata.json");
      writeFileSync(metadataPath, "not valid json or yaml {{{");

      expect(() => loadMetadataMapping(metadataPath)).toThrow();
    });

    it("should throw error if file content is not an object", () => {
      const metadataPath = join(tempDir, "metadata.json");
      writeFileSync(metadataPath, JSON.stringify(["array", "not", "object"]));

      expect(() => loadMetadataMapping(metadataPath)).toThrow(
        "Metadata file must contain an object mapping paths to metadata"
      );
    });

    it("should throw error if metadata value is not an object", () => {
      const metadataPath = join(tempDir, "metadata.json");
      const metadataContent = {
        "file1.txt": { key1: "value1" },
        "file2.txt": "not an object",
      };

      writeFileSync(metadataPath, JSON.stringify(metadataContent));

      expect(() => loadMetadataMapping(metadataPath)).toThrow(
        'Metadata for "file2.txt" must be an object'
      );
    });

    it("should throw error if metadata value is an array", () => {
      const metadataPath = join(tempDir, "metadata.json");
      const metadataContent = {
        "file1.txt": { key1: "value1" },
        "file2.txt": ["array", "value"],
      };

      writeFileSync(metadataPath, JSON.stringify(metadataContent));

      expect(() => loadMetadataMapping(metadataPath)).toThrow(
        'Metadata for "file2.txt" must be an object'
      );
    });
  });

  describe("extractUserMetadata", () => {
    it("should extract user metadata excluding sync fields", () => {
      const metadata = {
        file_path: "path/to/file.txt",
        file_hash: "abc123",
        git_commit: "def456",
        git_branch: "main",
        uploaded_at: "2024-01-01T00:00:00Z",
        synced: true,
        custom_key1: "custom_value1",
        custom_key2: 123,
      };

      const result = extractUserMetadata(metadata);

      expect(result).toEqual({
        custom_key1: "custom_value1",
        custom_key2: 123,
      });
    });

    it("should return empty object when only sync fields present", () => {
      const metadata = {
        file_path: "path/to/file.txt",
        file_hash: "abc123",
        synced: true,
      };

      const result = extractUserMetadata(metadata);

      expect(result).toEqual({});
    });

    it("should return all metadata when no sync fields present", () => {
      const metadata = {
        custom_key1: "custom_value1",
        custom_key2: 123,
        custom_key3: { nested: "value" },
      };

      const result = extractUserMetadata(metadata);

      expect(result).toEqual({
        custom_key1: "custom_value1",
        custom_key2: 123,
        custom_key3: { nested: "value" },
      });
    });

    it("should handle empty object", () => {
      const metadata = {};

      const result = extractUserMetadata(metadata);

      expect(result).toEqual({});
    });
  });

  describe("metadataEquals", () => {
    it("should return true for identical objects", () => {
      const a = { key1: "value1", key2: 123, key3: true };
      const b = { key1: "value1", key2: 123, key3: true };

      expect(metadataEquals(a, b)).toBe(true);
    });

    it("should return true for objects with keys in different order", () => {
      const a = { key1: "value1", key2: 123, key3: true };
      const b = { key3: true, key1: "value1", key2: 123 };

      expect(metadataEquals(a, b)).toBe(true);
    });

    it("should return false for objects with different values", () => {
      const a = { key1: "value1", key2: 123 };
      const b = { key1: "value1", key2: 456 };

      expect(metadataEquals(a, b)).toBe(false);
    });

    it("should return false for objects with different keys", () => {
      const a = { key1: "value1", key2: 123 };
      const b = { key1: "value1", key3: 123 };

      expect(metadataEquals(a, b)).toBe(false);
    });

    it("should return false when one has extra keys", () => {
      const a = { key1: "value1", key2: 123 };
      const b = { key1: "value1", key2: 123, key3: "extra" };

      expect(metadataEquals(a, b)).toBe(false);
    });

    it("should handle nested objects", () => {
      const a = { key1: "value1", nested: { deep: { value: 123 } } };
      const b = { key1: "value1", nested: { deep: { value: 123 } } };

      expect(metadataEquals(a, b)).toBe(true);
    });

    it("should detect differences in nested objects", () => {
      const a = { key1: "value1", nested: { deep: { value: 123 } } };
      const b = { key1: "value1", nested: { deep: { value: 456 } } };

      expect(metadataEquals(a, b)).toBe(false);
    });

    it("should handle arrays in metadata", () => {
      const a = { key1: "value1", arr: [1, 2, 3] };
      const b = { key1: "value1", arr: [1, 2, 3] };

      expect(metadataEquals(a, b)).toBe(true);
    });

    it("should detect array differences", () => {
      const a = { key1: "value1", arr: [1, 2, 3] };
      const b = { key1: "value1", arr: [1, 2, 4] };

      expect(metadataEquals(a, b)).toBe(false);
    });

    it("should return true for empty objects", () => {
      const a = {};
      const b = {};

      expect(metadataEquals(a, b)).toBe(true);
    });

    it("should handle null values", () => {
      const a = { key1: "value1", key2: null };
      const b = { key1: "value1", key2: null };

      expect(metadataEquals(a, b)).toBe(true);
    });

    it("should detect null vs undefined differences", () => {
      const a = { key1: "value1", key2: null };
      const b = { key1: "value1", key2: undefined };

      expect(metadataEquals(a, b)).toBe(false);
    });

    it("should handle Date objects", () => {
      const date = new Date("2024-01-01T00:00:00.000Z");
      const a = { key1: "value1", date: date };
      const b = { key1: "value1", date: new Date("2024-01-01T00:00:00.000Z") };

      expect(metadataEquals(a, b)).toBe(true);
    });

    it("should detect different Date objects", () => {
      const a = { key1: "value1", date: new Date("2024-01-01T00:00:00.000Z") };
      const b = { key1: "value1", date: new Date("2024-01-02T00:00:00.000Z") };

      expect(metadataEquals(a, b)).toBe(false);
    });

    it("should handle mixed Date and string (ISO)", () => {
      const a = { key1: "value1", date: new Date("2024-01-01T00:00:00.000Z") };
      const b = { key1: "value1", date: "2024-01-01T00:00:00.000Z" };

      // Date object vs ISO string are different types
      expect(metadataEquals(a, b)).toBe(false);
    });

    it("should handle undefined values correctly", () => {
      const a = { key1: "value1", key2: undefined };
      const b = { key1: "value1" };

      // fast-deep-equal treats missing key differently from undefined
      expect(metadataEquals(a, b)).toBe(false);
    });
  });
});
