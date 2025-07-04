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
import mockFs from "mock-fs";
import { uploadFile, uploadFilesInBatch } from "../../src/utils/upload";
import { createMockClient, type FlexibleMock } from "../helpers/test-utils";

// Mock console.warn since we're testing warning behavior
const mockConsoleWarn = jest.fn();
const originalConsoleWarn = console.warn;

describe("Upload Utils", () => {
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
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
    mockConsoleWarn.mockClear();
  });

  describe("uploadFile", () => {
    it("should upload a regular file successfully", async () => {
      mockFs({
        "test.txt": "Hello world",
      });

      mockClient.vectorStores.files.upload.mockResolvedValue({});

      await uploadFile(
        mockClient as unknown as Mixedbread,
        "test-store",
        "test.txt"
      );

      expect(mockClient.vectorStores.files.upload).toHaveBeenCalledWith(
        "test-store",
        expect.any(File),
        expect.objectContaining({
          experimental: {
            parsing_strategy: undefined,
            contextualization: undefined,
          },
        })
      );
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it("should upload empty files without warning", async () => {
      mockFs({
        "empty.txt": "",
      });

      await uploadFile(
        mockClient as unknown as Mixedbread,
        "test-store",
        "empty.txt"
      );

      // uploadFile doesn't have empty file checking, so it will upload
      expect(mockClient.vectorStores.files.upload).toHaveBeenCalledWith(
        "test-store",
        expect.any(File),
        expect.objectContaining({
          experimental: {
            parsing_strategy: undefined,
            contextualization: undefined,
          },
        })
      );
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it("should handle file with options", async () => {
      mockFs({
        "test.md": "# Test Document",
      });

      mockClient.vectorStores.files.upload.mockResolvedValue({});

      await uploadFile(
        mockClient as unknown as Mixedbread,
        "test-store",
        "test.md",
        {
          metadata: { author: "test" },
          strategy: "high_quality",
          contextualization: true,
        }
      );

      expect(mockClient.vectorStores.files.upload).toHaveBeenCalledWith(
        "test-store",
        expect.any(File),
        expect.objectContaining({
          metadata: { author: "test" },
          experimental: {
            parsing_strategy: "high_quality",
            contextualization: true,
          },
        })
      );
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });

  describe("uploadFilesInBatch", () => {
    it("should upload multiple files successfully", async () => {
      mockFs({
        "file1.txt": "Content 1",
        "file2.txt": "Content 2",
      });

      mockClient.vectorStores.files.upload.mockResolvedValue({});

      const files = [
        {
          path: "file1.txt",
          strategy: "fast" as const,
          contextualization: false,
          metadata: {},
        },
        {
          path: "file2.txt",
          strategy: "fast" as const,
          contextualization: false,
          metadata: {},
        },
      ];

      const result = await uploadFilesInBatch(
        mockClient as unknown as Mixedbread,
        "test-store",
        files,
        {
          unique: false,
          existingFiles: new Map(),
          parallel: 2,
        }
      );

      expect(result).toEqual({
        uploaded: 2,
        updated: 0,
        skipped: 0,
        failed: 0,
        successfulSize: 18, // "Content 1" + "Content 2" = 9 + 9 = 18
      });
      expect(mockClient.vectorStores.files.upload).toHaveBeenCalledTimes(2);
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it("should skip empty files and update counters", async () => {
      mockFs({
        "content.txt": "Real content",
        "empty1.txt": "",
        "empty2.txt": "",
      });

      mockClient.vectorStores.files.upload.mockResolvedValue({});

      const files = [
        {
          path: "content.txt",
          strategy: "fast" as const,
          contextualization: false,
          metadata: {},
        },
        {
          path: "empty1.txt",
          strategy: "fast" as const,
          contextualization: false,
          metadata: {},
        },
        {
          path: "empty2.txt",
          strategy: "fast" as const,
          contextualization: false,
          metadata: {},
        },
      ];

      const result = await uploadFilesInBatch(
        mockClient as unknown as Mixedbread,
        "test-store",
        files,
        {
          unique: false,
          existingFiles: new Map(),
          parallel: 3,
        }
      );

      expect(result).toEqual({
        uploaded: 1,
        updated: 0,
        skipped: 2,
        failed: 0,
        successfulSize: 12, // Only "Real content" = 12 bytes
      });
      expect(mockClient.vectorStores.files.upload).toHaveBeenCalledTimes(1);
      expect(mockConsoleWarn).not.toHaveBeenCalled(); // Warning is shown via spinner.warn
    });

    it("should handle mixed success, failure, and skipped files", async () => {
      mockFs({
        "success.txt": "Success content",
        "empty.txt": "",
        "failure.txt": "Failure content",
      });

      // Mock upload to fail for failure.txt
      mockClient.vectorStores.files.upload
        .mockResolvedValueOnce({}) // success.txt
        .mockRejectedValueOnce(new Error("Upload failed")); // failure.txt

      const files = [
        {
          path: "success.txt",
          strategy: "fast" as const,
          contextualization: false,
          metadata: {},
        },
        {
          path: "empty.txt",
          strategy: "fast" as const,
          contextualization: false,
          metadata: {},
        },
        {
          path: "failure.txt",
          strategy: "fast" as const,
          contextualization: false,
          metadata: {},
        },
      ];

      const result = await uploadFilesInBatch(
        mockClient as unknown as Mixedbread,
        "test-store",
        files,
        {
          unique: false,
          existingFiles: new Map(),
          parallel: 3,
        }
      );

      expect(result).toEqual({
        uploaded: 1,
        updated: 0,
        skipped: 1,
        failed: 1,
        successfulSize: 15, // Only "Success content" = 15 bytes
      });
      expect(mockClient.vectorStores.files.upload).toHaveBeenCalledTimes(2);
    });

    it("should handle unique flag with empty files", async () => {
      mockFs({
        "existing.txt": "Existing content",
        "empty.txt": "",
      });

      mockClient.vectorStores.files.upload.mockResolvedValue({});
      mockClient.vectorStores.files.delete.mockResolvedValue({});

      const existingFiles = new Map([["existing.txt", "existing-file-id"]]);

      const files = [
        {
          path: "existing.txt",
          strategy: "fast" as const,
          contextualization: false,
          metadata: {},
        },
        {
          path: "empty.txt",
          strategy: "fast" as const,
          contextualization: false,
          metadata: {},
        },
      ];

      const result = await uploadFilesInBatch(
        mockClient as unknown as Mixedbread,
        "test-store",
        files,
        {
          unique: true,
          existingFiles,
          parallel: 2,
        }
      );

      expect(result).toEqual({
        uploaded: 0,
        updated: 1,
        skipped: 1,
        failed: 0,
        successfulSize: 16, // "Existing content" = 16 bytes
      });
      expect(mockClient.vectorStores.files.delete).toHaveBeenCalledWith(
        "existing-file-id",
        { vector_store_identifier: "test-store" }
      );
      expect(mockClient.vectorStores.files.upload).toHaveBeenCalledTimes(1);
    });
  });

  afterAll(() => {
    // Restore original console.warn
    console.warn = originalConsoleWarn;
  });
});
