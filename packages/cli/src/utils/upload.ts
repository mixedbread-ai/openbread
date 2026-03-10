import { closeSync, openAsBlob, openSync, readSync } from "node:fs";
import { stat } from "node:fs/promises";
import { cpus, freemem } from "node:os";
import { basename, relative } from "node:path";
import type Mixedbread from "@mixedbread/sdk";
import type { FileCreateParams } from "@mixedbread/sdk/resources/stores";
import chalk from "chalk";
import { lookup } from "mime-types";
import pLimit from "p-limit";
import { log, spinner } from "./logger";
import { formatBytes, formatCountWithSuffix } from "./output";

export const UPLOAD_TIMEOUT = 1000 * 60 * 10; // 10 minutes

const MB = 1024 * 1024;
const MIN_PART_SIZE = 5 * MB;
const MAX_PARTS = 10_000;

/**
 * Maximum file size for which `openAsBlob` reports the correct size.
 * Node.js truncates the blob size to uint32, so files above 4 GiB
 * get a wrong `.size` value.
 */
const MAX_OPEN_AS_BLOB_SAFE_SIZE = 4 * 1024 * 1024 * 1024; // 4 GiB

/**
 * File subclass that reads data from disk on demand.
 *
 * Works around two Node.js limitations for very large files:
 *  1. `readFile` fails for files > ~2 GB (Buffer size limit).
 *  2. `openAsBlob` truncates `.size` to uint32, breaking files > 4 GB.
 *
 * The SDK only calls `.size` and `.slice(start, end)` during multipart
 * uploads, so on-demand sync reads of individual parts are fine.
 */
class LazyFile extends File {
  #path: string;
  #realSize: number;

  constructor(path: string, name: string, size: number, type: string) {
    super([], name, { type });
    this.#path = path;
    this.#realSize = size;
  }

  override get size(): number {
    return this.#realSize;
  }

  override slice(start?: number, end?: number, contentType?: string): Blob {
    const s = start ?? 0;
    const e = Math.min(end ?? this.#realSize, this.#realSize);
    const fd = openSync(this.#path, "r");
    try {
      const buf = Buffer.alloc(e - s);
      readSync(fd, buf, 0, buf.length, s);
      return new Blob([buf], { type: contentType ?? this.type });
    } finally {
      closeSync(fd);
    }
  }
}

export interface MultipartUploadOptions {
  threshold?: number;
  partSize?: number;
  concurrency?: number;
}

/**
 * Compute multipart config based on file size and system resources.
 * User-provided overrides take precedence.
 */
export function resolveMultipartConfig(
  fileSize: number,
  overrides?: MultipartUploadOptions
): { threshold: number; partSize: number; concurrency: number } {
  // Part size: smaller parts = more granular progress
  let partSize: number;
  if (fileSize < 200 * MB) {
    partSize = 10 * MB;
  } else if (fileSize < 1024 * MB) {
    partSize = 20 * MB;
  } else if (fileSize < 5 * 1024 * MB) {
    partSize = 50 * MB;
  } else {
    partSize = 100 * MB;
  }

  // Ensure we don't exceed the 10,000 parts limit
  if (Math.ceil(fileSize / partSize) > MAX_PARTS) {
    partSize = Math.ceil(fileSize / MAX_PARTS);
  }

  partSize = Math.max(partSize, MIN_PART_SIZE);

  // Apply user override, then re-enforce the MAX_PARTS guard so a small
  // user-specified part size can't produce more parts than the backend allows.
  let finalPartSize = overrides?.partSize ?? partSize;
  if (fileSize > 0 && Math.ceil(fileSize / finalPartSize) > MAX_PARTS) {
    finalPartSize = Math.ceil(fileSize / MAX_PARTS);
  }
  finalPartSize = Math.max(finalPartSize, MIN_PART_SIZE);

  // Concurrency: bounded by CPU cores and available memory
  const cores = cpus().length;
  // Reserve 25% of free memory for other work; each concurrent part holds ~partSize in memory
  const memoryBudget = Math.floor(freemem() * 0.75);
  const maxByMemory = Math.max(1, Math.floor(memoryBudget / finalPartSize));
  const concurrency = Math.min(cores, maxByMemory, 10);

  return {
    threshold: overrides?.threshold ?? 50 * MB,
    partSize: finalPartSize,
    concurrency: overrides?.concurrency ?? Math.max(concurrency, 2),
  };
}

export interface UploadProgress {
  fileName: string;
  partsCompleted: number;
  totalParts: number;
  uploadedBytes: number;
  totalBytes: number;
}

export interface UploadFileOptions {
  metadata?: Record<string, unknown>;
  strategy?: FileCreateParams.Config["parsing_strategy"];
  externalId?: string;
  multipartUpload?: MultipartUploadOptions;
  onProgress?: (progress: UploadProgress) => void;
}

export interface FileToUpload {
  path: string;
  strategy: FileCreateParams.Config["parsing_strategy"];
  metadata: Record<string, unknown>;
}

export interface UploadResults {
  uploaded: number;
  updated: number;
  skipped: number;
  failed: number;
  successfulSize: number;
}

/**
 * Return the corrected MIME type for commonly misidentified extensions.
 */
function correctMimeType(fileName: string, mimeType: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".ts") && mimeType === "video/mp2t") {
    return "text/typescript";
  }
  if (lower.endsWith(".py") && mimeType !== "text/x-python") {
    return "text/x-python";
  }
  if (lower.endsWith(".mdx") && mimeType !== "text/mdx") {
    return "text/mdx";
  }
  return mimeType;
}

/**
 * Fix MIME types for files that are commonly misidentified
 */
function fixMimeTypes(file: File): File {
  const correctedType = correctMimeType(file.name, file.type);
  if (correctedType !== file.type) {
    return new File([file], file.name, {
      type: correctedType,
      lastModified: file.lastModified,
    });
  }
  return file;
}

/**
 * Upload a single file to a store
 */
export async function uploadFile(
  client: Mixedbread,
  storeIdentifier: string,
  filePath: string,
  options: UploadFileOptions = {}
): Promise<void> {
  const {
    metadata = {},
    strategy,
    externalId,
    multipartUpload,
    onProgress,
  } = options;

  const fileStats = await stat(filePath);
  const totalFileBytes = fileStats.size;
  const fileName = basename(filePath);
  const mimeType = correctMimeType(
    fileName,
    lookup(filePath) || "application/octet-stream"
  );

  // openAsBlob truncates .size to uint32 for files > 4 GiB; use a LazyFile
  // that reads parts from disk on demand instead.
  let file: File;
  if (totalFileBytes > MAX_OPEN_AS_BLOB_SAFE_SIZE) {
    file = new LazyFile(filePath, fileName, totalFileBytes, mimeType);
  } else {
    const blob = await openAsBlob(filePath);
    file = fixMimeTypes(new File([blob], fileName, { type: mimeType }));
  }

  const mpConfig = resolveMultipartConfig(totalFileBytes, multipartUpload);

  if (totalFileBytes >= mpConfig.threshold) {
    const expectedParts = Math.ceil(totalFileBytes / mpConfig.partSize);
    const zeroProgress: UploadProgress = {
      fileName,
      partsCompleted: 0,
      totalParts: expectedParts,
      uploadedBytes: 0,
      totalBytes: totalFileBytes,
    };
    if (onProgress) {
      onProgress(zeroProgress);
    } else {
      log.info(
        `${fileName}: 0/${expectedParts} parts — ${formatBytes(0)}/${formatBytes(totalFileBytes)}`
      );
    }
  }

  let partsCompleted = 0;
  await client.stores.files.upload({
    storeIdentifier,
    file,
    body: {
      metadata,
      config: {
        parsing_strategy: strategy,
      },
      ...(externalId ? { external_id: externalId } : {}),
    },
    options: { timeout: UPLOAD_TIMEOUT },
    multipartUpload: {
      ...mpConfig,
      onPartUpload: (event) => {
        partsCompleted++;
        const progress: UploadProgress = {
          fileName,
          partsCompleted,
          totalParts: event.totalParts,
          uploadedBytes: event.uploadedBytes,
          totalBytes: event.totalBytes,
        };
        if (onProgress) {
          onProgress(progress);
        } else {
          log.info(
            `${fileName}: part ${partsCompleted}/${event.totalParts} — ${formatBytes(event.uploadedBytes)}/${formatBytes(event.totalBytes)}`
          );
        }
      },
    },
  });
}

/**
 * Upload multiple files to a store with batch processing
 */
export async function uploadFilesInBatch(
  client: Mixedbread,
  storeIdentifier: string,
  files: FileToUpload[],
  options: {
    unique: boolean;
    existingFiles: Map<string, string>;
    parallel: number;
    showStrategyPerFile?: boolean;
    multipartUpload?: MultipartUploadOptions;
  }
): Promise<UploadResults> {
  const {
    unique,
    existingFiles,
    parallel,
    showStrategyPerFile = false,
    multipartUpload,
  } = options;

  console.log(
    `\nUploading ${formatCountWithSuffix(files.length, "file")} to store...`
  );

  const results: UploadResults = {
    uploaded: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    successfulSize: 0,
  };

  const configParts = [`${formatCountWithSuffix(parallel, "file")} at a time`];
  const threshold = multipartUpload?.threshold ?? 50 * MB;
  configParts.push(`multipart above ${formatBytes(threshold)}`);
  if (multipartUpload?.partSize) {
    configParts.push(`part size ${formatBytes(multipartUpload.partSize)}`);
  }
  if (multipartUpload?.concurrency) {
    configParts.push(`${multipartUpload.concurrency} concurrent part uploads`);
  }
  console.log(chalk.gray(`Processing ${configParts.join(", ")}...`));

  // Process files with sliding-window concurrency
  const total = files.length;
  let completed = 0;
  const uploadSpinner = spinner();
  uploadSpinner.start(`Uploading 0/${formatCountWithSuffix(total, "file")}...`);

  const limit = pLimit(parallel);
  await Promise.allSettled(
    files.map((file) =>
      limit(async () => {
        const relativePath = relative(process.cwd(), file.path);

        try {
          // Delete existing file if using --unique
          if (unique && existingFiles.has(relativePath)) {
            const existingFileId = existingFiles.get(relativePath);
            await client.stores.files.delete(existingFileId, {
              store_identifier: storeIdentifier,
            });
          }

          const fileMetadata = {
            file_path: relativePath,
            uploaded_at: new Date().toISOString(),
            ...file.metadata,
          };

          // Check if file is empty
          const stats = await stat(file.path);
          if (stats.size === 0) {
            completed++;
            uploadSpinner.message(
              `Uploading ${completed}/${formatCountWithSuffix(total, "file")}...`
            );
            results.skipped++;
            return;
          }

          const fileName = basename(file.path);
          const mimeType = correctMimeType(
            fileName,
            lookup(file.path) || "application/octet-stream"
          );

          let fileToUpload: File;
          if (stats.size > MAX_OPEN_AS_BLOB_SAFE_SIZE) {
            fileToUpload = new LazyFile(
              file.path,
              fileName,
              stats.size,
              mimeType
            );
          } else {
            const blob = await openAsBlob(file.path);
            fileToUpload = fixMimeTypes(
              new File([blob], fileName, { type: mimeType })
            );
          }

          const mpConfig = resolveMultipartConfig(
            stats.size,
            multipartUpload
          );
          const totalFileBytes = stats.size;

          if (totalFileBytes >= mpConfig.threshold) {
            const expectedParts = Math.ceil(totalFileBytes / mpConfig.partSize);
            uploadSpinner.message(
              `Uploading ${completed}/${formatCountWithSuffix(total, "file")}... (${fileName}: 0/${expectedParts} parts, ${formatBytes(0)}/${formatBytes(totalFileBytes)})`
            );
          }

          let partsCompleted = 0;
          await client.stores.files.upload({
            storeIdentifier,
            file: fileToUpload,
            body: {
              metadata: fileMetadata,
              config: {
                parsing_strategy: file.strategy,
              },
            },
            options: { timeout: UPLOAD_TIMEOUT },
            multipartUpload: {
              ...mpConfig,
              onPartUpload: (event) => {
                partsCompleted++;
                uploadSpinner.message(
                  `Uploading ${completed}/${formatCountWithSuffix(total, "file")}... (${fileName}: part ${partsCompleted}/${event.totalParts}, ${formatBytes(event.uploadedBytes)}/${formatBytes(event.totalBytes)})`
                );
              },
            },
          });

          if (unique && existingFiles.has(relativePath)) {
            results.updated++;
          } else {
            results.uploaded++;
          }

          results.successfulSize += stats.size;
          completed++;
          uploadSpinner.message(
            `Uploading ${completed}/${formatCountWithSuffix(total, "file")}...`
          );
        } catch (error) {
          results.failed++;
          completed++;
          uploadSpinner.message(
            `Uploading ${completed}/${formatCountWithSuffix(total, "file")}...`
          );
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          log.error(`${relativePath} - ${errorMsg}`);
        }
      })
    )
  );

  const successCount = results.uploaded + results.updated;
  uploadSpinner.stop(
    successCount === total
      ? `Uploaded ${formatCountWithSuffix(total, "file")}`
      : `Uploaded ${successCount}/${formatCountWithSuffix(total, "file")} (${results.failed} failed, ${results.skipped} skipped)`
  );

  // Summary
  console.log(`\n${chalk.bold("Upload Summary:")}`);
  if (results.uploaded > 0) {
    console.log(
      chalk.green("✓"),
      `${formatCountWithSuffix(results.uploaded, "file")} uploaded successfully`
    );
  }
  if (results.updated > 0) {
    console.log(
      chalk.blue(`↻ ${formatCountWithSuffix(results.updated, "file")} updated`)
    );
  }
  if (results.skipped > 0) {
    console.log(
      chalk.yellow("⚠"),
      `${formatCountWithSuffix(results.skipped, "file")} skipped`
    );
  }
  if (results.failed > 0) {
    console.log(
      chalk.red("✗"),
      `${formatCountWithSuffix(results.failed, "file")} failed`
    );
  }

  if (showStrategyPerFile && files.length > 0) {
    const strategyCounts = new Map<string, number>();
    for (const file of files) {
      const s = file.strategy ?? "default";
      strategyCounts.set(s, (strategyCounts.get(s) ?? 0) + 1);
    }
    const parts = Array.from(strategyCounts.entries()).map(
      ([s, count]) => `${s} (${count})`
    );
    console.log(chalk.gray(`Strategies: ${parts.join(", ")}`));
  } else if (files.length > 0) {
    const firstFile = files[0];
    console.log(chalk.gray(`Strategy: ${firstFile.strategy}`));
  }

  console.log(chalk.gray(`Total size: ${formatBytes(results.successfulSize)}`));

  return results;
}
