import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type Mixedbread from "@mixedbread/sdk";
import { glob } from "glob";
import mockFs from "mock-fs";
import * as gitUtils from "../../src/utils/git";
import * as hashUtils from "../../src/utils/hash";
import { analyzeChanges, executeSyncChanges } from "../../src/utils/sync";
import type { FileSyncMetadata } from "../../src/utils/sync-state";
import * as uploadUtils from "../../src/utils/upload";
import { createMockClient, type FlexibleMock } from "../helpers/test-utils";

// Mock console.warn since we're testing warning behavior
const mockConsoleWarn = jest.fn();
const originalConsoleWarn = console.warn;

// Mock dependencies
jest.mock("../../src/utils/upload");
jest.mock("../../src/utils/hash", () => ({
  calculateFileHash: jest.fn(() => Promise.resolve("mock-hash")),
  hashesMatch: jest.fn(() => false),
}));
jest.mock("../../src/utils/git", () => ({
  getChangedFiles: jest.fn(() => Promise.resolve([])),
  normalizeGitPatterns: jest.fn(() => Promise.resolve([])),
}));
jest.mock("../../src/utils/sync-state", () => ({
  buildFileSyncMetadata: jest.fn().mockReturnValue({
    file_path: "test.txt",
    file_hash: "test-hash",
    uploaded_at: "2023-01-01T00:00:00.000Z",
    synced: true,
  }),
}));
jest.mock("glob");

const mockUploadFile = uploadUtils.uploadFile as jest.MockedFunction<
  typeof uploadUtils.uploadFile
>;

const mockCalculateFileHash =
  hashUtils.calculateFileHash as jest.MockedFunction<
    typeof hashUtils.calculateFileHash
  >;
const mockHashesMatch = hashUtils.hashesMatch as jest.MockedFunction<
  typeof hashUtils.hashesMatch
>;
const mockGetChangedFiles = gitUtils.getChangedFiles as jest.MockedFunction<
  typeof gitUtils.getChangedFiles
>;
const mockNormalizeGitPatterns =
  gitUtils.normalizeGitPatterns as jest.MockedFunction<
    typeof gitUtils.normalizeGitPatterns
  >;

describe("Sync Utils", () => {
  let mockClient: {
    vectorStores: {
      files: {
        upload: FlexibleMock;
        delete: FlexibleMock;
      };
    };
  };

  beforeEach(() => {
    // Override the global console.warn mock for these specific tests
    console.warn = mockConsoleWarn;

    mockClient = createMockClient();

    // Reset all mocks
    jest.clearAllMocks();
    mockConsoleWarn.mockClear();
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
    mockConsoleWarn.mockClear();
  });

  describe("analyzeChanges", () => {
    it("should analyze changes for regular files", async () => {
      mockFs({
        "file1.txt": "Content 1",
        "file2.txt": "Content 2",
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "file1.txt",
        "file2.txt",
      ]);

      const syncedFiles = new Map();
      const gitInfo = { commit: "abc123", branch: "main", isRepo: true };

      const analysis = await analyzeChanges({
        patterns: ["*.txt"],
        syncedFiles,
        gitInfo,
      });

      expect(analysis.added).toHaveLength(2);
      expect(analysis.modified).toHaveLength(0);
      expect(analysis.deleted).toHaveLength(0);
      expect(analysis.unchanged).toBe(0);
      expect(analysis.totalSize).toBe(18); // "Content 1" + "Content 2" = 9 + 9 = 18
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it("should include empty files in analysis", async () => {
      mockFs({
        "content.txt": "Real content",
        "empty1.txt": "",
        "empty2.txt": "",
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "content.txt",
        "empty1.txt",
        "empty2.txt",
      ]);

      const syncedFiles = new Map();
      const gitInfo = { commit: "abc123", branch: "main", isRepo: true };

      const analysis = await analyzeChanges({
        patterns: ["*.txt"],
        syncedFiles,
        gitInfo,
      });

      // Based on the test results, empty files are included in the analysis
      expect(analysis.added).toHaveLength(3);
      expect(
        analysis.added.find((f) => f.path.includes("content.txt"))
      ).toBeTruthy();
      expect(
        analysis.added.find((f) => f.path.includes("empty1.txt"))
      ).toBeTruthy();
      expect(
        analysis.added.find((f) => f.path.includes("empty2.txt"))
      ).toBeTruthy();
      expect(analysis.modified).toHaveLength(0);
      expect(analysis.deleted).toHaveLength(0);
      expect(analysis.unchanged).toBe(0);
      expect(analysis.totalSize).toBe(12); // Only "Real content" = 12 bytes (empty files have 0 size)
    });

    it("should handle modified files with empty files mixed in", async () => {
      mockFs({
        "modified.txt": "Modified content",
        "empty.txt": "",
        "unchanged.txt": "Unchanged content",
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "modified.txt",
        "empty.txt",
        "unchanged.txt",
      ]);

      const syncedFiles = new Map<
        string,
        { fileId: string; metadata: FileSyncMetadata }
      >([
        [
          require("path").resolve("modified.txt"),
          {
            fileId: "modified-file-id",
            metadata: {
              file_path: "modified.txt",
              file_hash: "old-hash",
              uploaded_at: "2023-01-01T00:00:00.000Z",
              synced: true,
            },
          },
        ],
        [
          require("path").resolve("unchanged.txt"),
          {
            fileId: "unchanged-file-id",
            metadata: {
              file_path: "unchanged.txt",
              file_hash: "unchanged-hash",
              uploaded_at: "2023-01-01T00:00:00.000Z",
              synced: true,
            },
          },
        ],
      ]);

      // Mock hash comparison
      mockCalculateFileHash
        .mockResolvedValueOnce("new-hash") // modified.txt
        .mockResolvedValueOnce("unchanged-hash"); // unchanged.txt

      mockHashesMatch
        .mockReturnValueOnce(false) // modified.txt - changed
        .mockReturnValueOnce(true); // unchanged.txt - unchanged

      const gitInfo = { commit: "abc123", branch: "main", isRepo: true };

      const analysis = await analyzeChanges({
        patterns: ["*.txt"],
        syncedFiles,
        gitInfo,
      });

      // Empty files are included in analysis
      expect(analysis.added).toHaveLength(1); // empty.txt is new
      expect(analysis.added[0].path).toMatch(/empty\.txt$/);
      expect(analysis.modified).toHaveLength(1);
      expect(analysis.modified[0].path).toMatch(/modified\.txt$/);
      expect(analysis.deleted).toHaveLength(0);
      expect(analysis.unchanged).toBe(1);
      expect(analysis.totalSize).toBe(16); // Only "Modified content" = 16 bytes (empty file has 0 size)
    });

    it("should handle git-based detection with empty files", async () => {
      mockFs({
        "added.txt": "Added content",
        "empty.txt": "",
        "modified.txt": "Modified content",
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "added.txt",
        "empty.txt",
        "modified.txt",
      ]);

      const syncedFiles = new Map<
        string,
        { fileId: string; metadata: FileSyncMetadata }
      >([
        [
          require("path").resolve("modified.txt"),
          {
            fileId: "modified-file-id",
            metadata: {
              file_path: "modified.txt",
              file_hash: "old-hash",
              uploaded_at: "2023-01-01T00:00:00.000Z",
              synced: true,
            },
          },
        ],
      ]);

      // Mock git changes
      mockNormalizeGitPatterns.mockResolvedValue(["*.txt"]);
      mockGetChangedFiles.mockResolvedValue([
        { path: "added.txt", status: "added" },
        { path: "empty.txt", status: "added" },
        { path: "modified.txt", status: "modified" },
      ]);

      const gitInfo = { commit: "abc123", branch: "main", isRepo: true };

      const analysis = await analyzeChanges({
        patterns: ["*.txt"],
        syncedFiles,
        gitInfo,
        fromGit: "HEAD~1",
      });

      // When using git detection, empty files in git changes are still included
      expect(analysis.added).toHaveLength(2); // added.txt and empty.txt
      expect(
        analysis.added.find((f) => f.path.includes("added.txt"))
      ).toBeTruthy();
      expect(
        analysis.added.find((f) => f.path.includes("empty.txt"))
      ).toBeTruthy();
      expect(analysis.modified).toHaveLength(1);
      expect(analysis.modified[0].path).toMatch(/modified\.txt$/);
      expect(analysis.deleted).toHaveLength(0);
      expect(analysis.unchanged).toBe(0);
      expect(analysis.totalSize).toBe(29); // "Added content" + "Modified content" = 13 + 16 = 29
    });
  });

  describe("executeSyncChanges", () => {
    it("should execute sync changes for regular files", async () => {
      mockFs({
        "new.txt": "New content",
        "modified.txt": "Modified content",
      });

      const analysis = {
        added: [
          {
            path: require("path").resolve("new.txt"),
            type: "added" as const,
            size: 11,
          },
        ],
        modified: [
          {
            path: require("path").resolve("modified.txt"),
            type: "modified" as const,
            size: 16,
            fileId: "modified-file-id",
          },
        ],
        deleted: [],
        unchanged: 0,
        totalFiles: 2,
        totalSize: 27,
      };

      mockClient.vectorStores.files.delete.mockResolvedValue({});
      mockUploadFile.mockResolvedValue();

      const result = await executeSyncChanges(
        mockClient as unknown as Mixedbread,
        "test-store",
        analysis,
        {
          strategy: "fast",
          contextualization: false,
          parallel: 2,
        }
      );

      expect(result.uploads.successful).toHaveLength(2);
      expect(result.uploads.failed).toHaveLength(0);
      expect(result.deletions.successful).toHaveLength(1);
      expect(result.deletions.failed).toHaveLength(0);
      expect(mockClient.vectorStores.files.delete).toHaveBeenCalledWith(
        "modified-file-id",
        { vector_store_identifier: "test-store" }
      );
      expect(mockUploadFile).toHaveBeenCalledTimes(2);
    });

    it("should skip empty files during sync execution", async () => {
      mockFs({
        "content.txt": "Real content",
        "empty.txt": "",
      });

      const analysis = {
        added: [
          {
            path: require("path").resolve("content.txt"),
            type: "added" as const,
            size: 12,
          },
          {
            path: require("path").resolve("empty.txt"),
            type: "added" as const,
            size: 0,
          },
        ],
        modified: [],
        deleted: [],
        unchanged: 0,
        totalFiles: 2,
        totalSize: 12,
      };

      mockUploadFile.mockResolvedValue();

      const result = await executeSyncChanges(
        mockClient as unknown as Mixedbread,
        "test-store",
        analysis,
        {
          strategy: "fast",
          contextualization: false,
          parallel: 2,
        }
      );

      expect(result.uploads.successful).toHaveLength(1);
      expect(result.uploads.failed).toHaveLength(1); // Empty file marked as failed but skipped
      expect(result.uploads.failed[0].skipped).toBe(true);
      expect(mockUploadFile).toHaveBeenCalledTimes(1);
      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        "test-store",
        expect.stringMatching(/content\.txt$/),
        expect.any(Object)
      );
    });

    it("should handle mixed files with empty files during sync", async () => {
      mockFs({
        "success.txt": "Success content",
        "empty.txt": "",
        "modified.txt": "Modified content",
      });

      const analysis = {
        added: [
          {
            path: require("path").resolve("success.txt"),
            type: "added" as const,
            size: 15,
          },
          {
            path: require("path").resolve("empty.txt"),
            type: "added" as const,
            size: 0,
          },
        ],
        modified: [
          {
            path: require("path").resolve("modified.txt"),
            type: "modified" as const,
            size: 16,
            fileId: "modified-file-id",
          },
        ],
        deleted: [],
        unchanged: 0,
        totalFiles: 3,
        totalSize: 31,
      };

      mockClient.vectorStores.files.delete.mockResolvedValue({});
      mockUploadFile.mockResolvedValue();

      const result = await executeSyncChanges(
        mockClient as unknown as Mixedbread,
        "test-store",
        analysis,
        {
          strategy: "fast",
          contextualization: false,
          parallel: 3,
        }
      );

      expect(result.uploads.successful).toHaveLength(2);
      expect(result.uploads.failed).toHaveLength(1); // Empty file
      expect(result.uploads.failed[0].skipped).toBe(true);
      expect(result.deletions.successful).toHaveLength(1);
      expect(mockClient.vectorStores.files.delete).toHaveBeenCalledWith(
        "modified-file-id",
        { vector_store_identifier: "test-store" }
      );
      expect(mockUploadFile).toHaveBeenCalledTimes(2);
    });
  });

  afterAll(() => {
    // Restore original console.warn
    console.warn = originalConsoleWarn;
  });
});
