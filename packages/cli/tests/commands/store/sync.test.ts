import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type Mixedbread from "@mixedbread/sdk";
import type { Command } from "commander";
import mockFs from "mock-fs";
import { createSyncCommand } from "../../../src/commands/store/sync";
import * as clientUtils from "../../../src/utils/client";
import * as storeUtils from "../../../src/utils/store";
import * as syncUtils from "../../../src/utils/sync";
import * as syncStateUtils from "../../../src/utils/sync-state";

// Mock dependencies
jest.mock("../../../src/utils/client");
jest.mock("../../../src/utils/sync");
jest.mock("../../../src/utils/sync-state");
jest.mock("../../../src/utils/store");

// Explicit mock definitions
const mockCreateClient = clientUtils.createClient as jest.MockedFunction<
  typeof clientUtils.createClient
>;
const mockAnalyzeChanges = syncUtils.analyzeChanges as jest.MockedFunction<
  typeof syncUtils.analyzeChanges
>;
const mockExecuteSyncChanges =
  syncUtils.executeSyncChanges as jest.MockedFunction<
    typeof syncUtils.executeSyncChanges
  >;
const mockGetSyncedFiles = syncStateUtils.getSyncedFiles as jest.MockedFunction<
  typeof syncStateUtils.getSyncedFiles
>;
const mockResolveStore = storeUtils.resolveStore as jest.MockedFunction<
  typeof storeUtils.resolveStore
>;

describe("Store Sync Command", () => {
  let command: Command;
  let mockClient: {
    stores: {
      create: jest.MockedFunction<Mixedbread["stores"]["create"]>;
    };
  };

  beforeEach(() => {
    command = createSyncCommand();

    // Setup mock client
    mockClient = {
      stores: {
        create: jest.fn(),
      },
    };

    // Setup default mocks
    mockCreateClient.mockReturnValue(mockClient as unknown as Mixedbread);
    mockResolveStore.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440040",
      name: "test-store",
      created_at: "2021-01-01",
      updated_at: "2021-01-01",
    });
    mockGetSyncedFiles.mockResolvedValue(new Map());
    mockAnalyzeChanges.mockResolvedValue({
      added: [],
      modified: [],
      deleted: [],
      unchanged: 0,
      totalFiles: 0,
      totalSize: 0,
    });
    mockExecuteSyncChanges.mockResolvedValue({
      deletions: { successful: [], failed: [] },
      uploads: { successful: [], failed: [] },
    });

    // Mock fs for file operations
    mockFs({
      "test.txt": "test content",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockFs.restore();
  });

  describe("Force upload option", () => {
    it("should support --force flag", async () => {
      await command.parseAsync([
        "node",
        "sync",
        "test-store",
        "*.txt",
        "--force",
      ]);

      expect(mockAnalyzeChanges).toHaveBeenCalledWith({
        patterns: ["*.txt"],
        syncedFiles: expect.any(Map),
        gitInfo: expect.any(Object),
        forceUpload: true,
      });
    });

    it("should support -f flag", async () => {
      await command.parseAsync(["node", "sync", "test-store", "*.txt", "-f"]);

      expect(mockAnalyzeChanges).toHaveBeenCalledWith({
        patterns: ["*.txt"],
        syncedFiles: expect.any(Map),
        gitInfo: expect.any(Object),
        forceUpload: true,
      });
    });

    it("should not set forceUpload when neither --force nor -f is used", async () => {
      await command.parseAsync(["node", "sync", "test-store", "*.txt"]);

      expect(mockAnalyzeChanges).toHaveBeenCalledWith({
        patterns: ["*.txt"],
        syncedFiles: expect.any(Map),
        gitInfo: expect.any(Object),
        forceUpload: undefined,
      });
    });

    it("should work with other options when using --force", async () => {
      await command.parseAsync([
        "node",
        "sync",
        "test-store",
        "*.txt",
        "--force",
        "--yes",
        "--strategy",
        "high_quality",
      ]);

      expect(mockAnalyzeChanges).toHaveBeenCalledWith({
        patterns: ["*.txt"],
        syncedFiles: expect.any(Map),
        gitInfo: expect.any(Object),
        forceUpload: true,
      });
    });

    it("should work with other options when using -f", async () => {
      await command.parseAsync([
        "node",
        "sync",
        "test-store",
        "*.txt",
        "-f",
        "-y",
        "--parallel",
        "8",
      ]);

      expect(mockAnalyzeChanges).toHaveBeenCalledWith({
        patterns: ["*.txt"],
        syncedFiles: expect.any(Map),
        gitInfo: expect.any(Object),
        forceUpload: true,
      });
    });
  });

  describe("Command validation", () => {
    it("should validate required arguments", async () => {
      await command.parseAsync(["node", "sync"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("required")
      );
    });
  });

  describe("Per-file metadata", () => {
    beforeEach(() => {
      mockFs({
        "file1.txt": "content1",
        "file2.txt": "content2",
        "metadata.json": JSON.stringify({
          "file1.txt": { title: "File One", priority: 1 },
          "file2.txt": { title: "File Two", priority: 2 },
        }),
      });
    });

    it("should pass metadata file to analyzeChanges", async () => {
      await command.parseAsync([
        "node",
        "sync",
        "test-store",
        "*.txt",
        "--metadata-file",
        "metadata.json",
        "-y",
      ]);

      expect(mockAnalyzeChanges).toHaveBeenCalledWith(
        expect.objectContaining({
          metadataMap: expect.any(Map),
        })
      );

      // Verify the metadata map was loaded
      const call = mockAnalyzeChanges.mock.calls[0][0];
      expect(call.metadataMap?.size).toBe(2);
      expect(call.metadataMap?.get("file1.txt")).toEqual({
        title: "File One",
        priority: 1,
      });
    });

    it("should pass metadata file to executeSyncChanges", async () => {
      mockAnalyzeChanges.mockResolvedValue({
        added: [
          {
            path: "file1.txt",
            type: "added",
            size: 100,
          },
        ],
        modified: [],
        deleted: [],
        unchanged: 0,
        totalFiles: 1,
        totalSize: 100,
      });

      await command.parseAsync([
        "node",
        "sync",
        "test-store",
        "*.txt",
        "--metadata-file",
        "metadata.json",
        "-y",
      ]);

      expect(mockExecuteSyncChanges).toHaveBeenCalledWith(
        expect.any(Object),
        "550e8400-e29b-41d4-a716-446655440040",
        expect.any(Object),
        expect.objectContaining({
          metadataMap: expect.any(Map),
        })
      );
    });

    it("should handle invalid metadata file", async () => {
      mockFs({
        "file1.txt": "content1",
        "metadata.json": "invalid json {{{",
      });

      await command.parseAsync([
        "node",
        "sync",
        "test-store",
        "*.txt",
        "--metadata-file",
        "metadata.json",
        "-y",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Failed to load metadata file")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle non-existent metadata file", async () => {
      mockFs({
        "file1.txt": "content1",
      });

      await command.parseAsync([
        "node",
        "sync",
        "test-store",
        "*.txt",
        "--metadata-file",
        "nonexistent.json",
        "-y",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Failed to load metadata file")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
