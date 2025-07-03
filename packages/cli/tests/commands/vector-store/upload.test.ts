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
import { glob } from "glob";
import mockFs from "mock-fs";
import { createUploadCommand } from "../../../src/commands/vector-store/upload";
import * as clientUtils from "../../../src/utils/client";
import * as configUtils from "../../../src/utils/config";
import * as uploadUtils from "../../../src/utils/upload";
import * as vectorStoreUtils from "../../../src/utils/vector-store";

import {
  createMockConfig,
  createMockVectorStore,
  type FlexibleMock,
} from "../../helpers/test-utils";

// Mock dependencies
jest.mock("../../../src/utils/client");
jest.mock("../../../src/utils/vector-store");
jest.mock("../../../src/utils/config");
jest.mock("../../../src/utils/upload");
jest.mock("glob");
// ora is mocked globally in jest.config.ts

// Explicit mock definitions
const mockCreateClient = clientUtils.createClient as jest.MockedFunction<
  typeof clientUtils.createClient
>;
const mockResolveVectorStore =
  vectorStoreUtils.resolveVectorStore as jest.MockedFunction<
    typeof vectorStoreUtils.resolveVectorStore
  >;
const mockGetVectorStoreFiles =
  vectorStoreUtils.getVectorStoreFiles as jest.MockedFunction<
    typeof vectorStoreUtils.getVectorStoreFiles
  >;
const mockLoadConfig = configUtils.loadConfig as jest.MockedFunction<
  typeof configUtils.loadConfig
>;
const mockUploadFilesInBatch =
  uploadUtils.uploadFilesInBatch as jest.MockedFunction<
    typeof uploadUtils.uploadFilesInBatch
  >;

describe("Vector Store Upload Command", () => {
  let command: Command;
  let mockClient: {
    vectorStores: {
      files: {
        list: FlexibleMock;
        upload: FlexibleMock;
        delete: FlexibleMock;
      };
    };
  };

  beforeEach(() => {
    command = createUploadCommand();

    // Setup mock client
    mockClient = {
      vectorStores: {
        files: {
          upload: jest.fn(),
          list: jest.fn(),
          delete: jest.fn(),
        },
      },
    };

    // Setup default mocks
    mockCreateClient.mockReturnValue(mockClient as unknown as Mixedbread);
    mockResolveVectorStore.mockResolvedValue(
      createMockVectorStore({
        id: "550e8400-e29b-41d4-a716-446655440130",
        name: "test-store",
      })
    );
    mockLoadConfig.mockReturnValue(
      createMockConfig({
        defaults: {
          upload: {
            strategy: "fast",
            contextualization: false,
            parallel: 3,
          },
        },
      })
    );

    // Setup uploadFilesInBatch mock
    mockUploadFilesInBatch.mockResolvedValue({
      uploaded: 1,
      updated: 0,
      failed: 0,
      errors: [],
      successfulSize: 1024,
    });
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  describe("File discovery", () => {
    it("should find files matching patterns", async () => {
      mockFs({
        "docs/file1.md": "content1",
        "docs/file2.md": "content2",
        "docs/subdir/file3.md": "content3",
        "other.txt": "other",
      });

      (glob as unknown as jest.Mock).mockImplementation(async (pattern) => {
        if (pattern === "docs/**/*.md") {
          return ["docs/file1.md", "docs/file2.md", "docs/subdir/file3.md"];
        }
        return [];
      });

      await command.parseAsync([
        "node",
        "upload",
        "test-store",
        "docs/**/*.md",
      ]);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Found 3 files matching the pattern")
      );
      expect(mockUploadFilesInBatch).toHaveBeenCalled();
    });

    it("should handle multiple patterns", async () => {
      mockFs({
        "docs/file1.md": "content1",
        "images/pic1.png": Buffer.from("image"),
        "data/info.json": "{}",
      });

      jest
        .mocked(glob)
        .mockResolvedValueOnce(["docs/file1.md"])
        .mockResolvedValueOnce(["images/pic1.png"])
        .mockResolvedValueOnce(["data/info.json"]);

      await command.parseAsync([
        "node",
        "upload",
        "test-store",
        "*.md",
        "*.png",
        "*.json",
      ]);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Found 3 files matching the patterns")
      );
      expect(mockUploadFilesInBatch).toHaveBeenCalled();
    });

    it("should handle no files found", async () => {
      mockFs({});
      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue(
        []
      );

      await command.parseAsync([
        "node",
        "upload",
        "test-store",
        "*.nonexistent",
      ]);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("No files found matching the patterns")
      );
    });

    it("should error when no patterns provided", async () => {
      await command.parseAsync(["node", "upload", "test-store"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "No file patterns provided. Use --manifest for manifest-based uploads."
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Upload options", () => {
    beforeEach(() => {
      mockFs({
        "test.md": "test content",
      });
      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "test.md",
      ]);
    });

    it("should use custom strategy", async () => {
      await command.parseAsync([
        "node",
        "upload",
        "test-store",
        "test.md",
        "--strategy",
        "high_quality",
      ]);

      expect(mockUploadFilesInBatch).toHaveBeenCalledWith(
        expect.any(Object),
        "550e8400-e29b-41d4-a716-446655440130",
        expect.arrayContaining([
          expect.objectContaining({
            strategy: "high_quality",
          }),
        ]),
        expect.any(Object)
      );
    });

    it("should enable contextualization", async () => {
      await command.parseAsync([
        "node",
        "upload",
        "test-store",
        "test.md",
        "--contextualization",
      ]);

      expect(mockUploadFilesInBatch).toHaveBeenCalledWith(
        expect.any(Object),
        "550e8400-e29b-41d4-a716-446655440130",
        expect.arrayContaining([
          expect.objectContaining({
            contextualization: true,
          }),
        ]),
        expect.any(Object)
      );
    });

    it("should add custom metadata", async () => {
      await command.parseAsync([
        "node",
        "upload",
        "test-store",
        "test.md",
        "--metadata",
        '{"author":"john","version":"1.0"}',
      ]);

      expect(mockUploadFilesInBatch).toHaveBeenCalledWith(
        expect.any(Object),
        "550e8400-e29b-41d4-a716-446655440130",
        expect.arrayContaining([
          expect.objectContaining({
            metadata: expect.objectContaining({
              author: "john",
              version: "1.0",
            }),
          }),
        ]),
        expect.any(Object)
      );
    });

    it("should validate metadata JSON", async () => {
      await command.parseAsync([
        "node",
        "upload",
        "test-store",
        "test.md",
        "--metadata",
        "invalid-json",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Error:"),
        expect.stringContaining("Invalid JSON in metadata option")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate parallel option", async () => {
      await command.parseAsync([
        "node",
        "upload",
        "test-store",
        "test.md",
        "--parallel",
        "25",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"parallel" must be less than or equal to 20')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Dry run", () => {
    it("should preview files without uploading", async () => {
      mockFs({
        "file1.md": "content 1",
        "file2.md": "content 2",
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "file1.md",
        "file2.md",
      ]);

      await command.parseAsync([
        "node",
        "upload",
        "test-store",
        "*.md",
        "--dry-run",
      ]);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Dry run - files that would be uploaded:")
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("file1.md")
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("file2.md")
      );
      expect(mockUploadFilesInBatch).not.toHaveBeenCalled();
    });
  });

  describe("Unique flag", () => {
    it("should check for existing files when --unique", async () => {
      mockFs({
        "test.md": "test content",
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "test.md",
      ]);

      mockGetVectorStoreFiles.mockResolvedValue([
        {
          id: "existing_file_id",
          vector_store_id: "550e8400-e29b-41d4-a716-446655440130",
          created_at: "2021-02-18T12:00:00Z",
          metadata: { file_path: "test.md" },
        },
      ]);

      mockClient.vectorStores.files.delete.mockResolvedValue({});

      await command.parseAsync([
        "node",
        "upload",
        "test-store",
        "test.md",
        "--unique",
      ]);

      expect(mockGetVectorStoreFiles).toHaveBeenCalledWith(
        expect.any(Object),
        "550e8400-e29b-41d4-a716-446655440130"
      );
      expect(mockUploadFilesInBatch).toHaveBeenCalledWith(
        expect.any(Object),
        "550e8400-e29b-41d4-a716-446655440130",
        expect.any(Array),
        expect.objectContaining({
          unique: true,
          existingFiles: expect.any(Map),
        })
      );
    });

    it("should handle list errors with --unique", async () => {
      mockFs({
        "test.md": "test content",
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "test.md",
      ]);
      mockGetVectorStoreFiles.mockRejectedValue(new Error("List failed"));

      await command.parseAsync([
        "node",
        "upload",
        "test-store",
        "test.md",
        "--unique",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Error:"),
        expect.stringContaining("List failed")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("File upload", () => {
    it("should upload files with correct types", async () => {
      mockFs({
        "image.webp": Buffer.from("webp image"),
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "image.webp",
      ]);

      await command.parseAsync(["node", "upload", "test-store", "image.webp"]);

      expect(mockUploadFilesInBatch).toHaveBeenCalledWith(
        expect.any(Object),
        "550e8400-e29b-41d4-a716-446655440130",
        expect.arrayContaining([
          expect.objectContaining({
            path: "image.webp",
          }),
        ]),
        expect.any(Object)
      );
    });

    it("should include file metadata", async () => {
      mockFs({
        "test.md": "test content",
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "test.md",
      ]);

      await command.parseAsync(["node", "upload", "test-store", "test.md"]);

      expect(mockUploadFilesInBatch).toHaveBeenCalledWith(
        expect.any(Object),
        "550e8400-e29b-41d4-a716-446655440130",
        expect.arrayContaining([
          expect.objectContaining({
            path: "test.md",
            strategy: "fast",
            contextualization: false,
          }),
        ]),
        expect.any(Object)
      );
    });
  });

  describe("Error handling", () => {
    it("should handle upload failures", async () => {
      mockFs({
        "test.md": "test content",
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "test.md",
      ]);

      // Mock uploadFilesInBatch to return failure results
      mockUploadFilesInBatch.mockResolvedValue({
        uploaded: 0,
        updated: 0,
        failed: 1,
        errors: ["test.md: Upload failed"],
        successfulSize: 0,
      });

      await command.parseAsync(["node", "upload", "test-store", "test.md"]);

      expect(mockUploadFilesInBatch).toHaveBeenCalled();
    });

    it("should handle vector store resolution errors", async () => {
      mockResolveVectorStore.mockRejectedValue(
        new Error("Vector store not found")
      );

      await command.parseAsync(["node", "upload", "invalid-store", "*.md"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Vector store not found"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle file read errors gracefully", async () => {
      mockFs({
        "readable.md": "content",
        "unreadable.md": mockFs.file({
          content: "content",
          mode: 0o000, // No read permissions
        }),
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "readable.md",
        "unreadable.md",
      ]);

      // Mock uploadFilesInBatch to handle the unreadable file
      mockUploadFilesInBatch.mockResolvedValue({
        uploaded: 1,
        updated: 0,
        failed: 1,
        errors: ["unreadable.md: Permission denied"],
        successfulSize: 7,
      });

      await command.parseAsync(["node", "upload", "test-store", "*.md"]);

      expect(mockUploadFilesInBatch).toHaveBeenCalled();
    });
  });

  describe("Upload summary", () => {
    it("should show correct summary for successful uploads", async () => {
      mockFs({
        "file1.md": "content1",
        "file2.md": "content2",
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "file1.md",
        "file2.md",
      ]);

      // Mock uploadFilesInBatch to return successful results
      mockUploadFilesInBatch.mockResolvedValue({
        uploaded: 2,
        updated: 0,
        failed: 0,
        errors: [],
        successfulSize: 16,
      });

      await command.parseAsync(["node", "upload", "test-store", "*.md"]);

      expect(mockUploadFilesInBatch).toHaveBeenCalledWith(
        expect.any(Object),
        "550e8400-e29b-41d4-a716-446655440130",
        expect.arrayContaining([
          expect.objectContaining({ path: "file1.md" }),
          expect.objectContaining({ path: "file2.md" }),
        ]),
        expect.any(Object)
      );
    });

    it("should show correct summary for mixed results", async () => {
      mockFs({
        "file1.md": "content1",
        "file2.md": "content2",
        "file3.md": "content3",
      });

      (glob as unknown as jest.MockedFunction<typeof glob>).mockResolvedValue([
        "file1.md",
        "file2.md",
        "file3.md",
      ]);

      // Mock uploadFilesInBatch to return mixed results
      mockUploadFilesInBatch.mockResolvedValue({
        uploaded: 2,
        updated: 0,
        failed: 1,
        errors: ["file2.md: Upload failed"],
        successfulSize: 16,
      });

      await command.parseAsync(["node", "upload", "test-store", "*.md"]);

      expect(mockUploadFilesInBatch).toHaveBeenCalledWith(
        expect.any(Object),
        "550e8400-e29b-41d4-a716-446655440130",
        expect.arrayContaining([
          expect.objectContaining({ path: "file1.md" }),
          expect.objectContaining({ path: "file2.md" }),
          expect.objectContaining({ path: "file3.md" }),
        ]),
        expect.any(Object)
      );
    });
  });
});
