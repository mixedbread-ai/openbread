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

      expect(console.log).toHaveBeenCalledWith(
        "✗",
        expect.stringContaining("required")
      );
    });
  });
});
