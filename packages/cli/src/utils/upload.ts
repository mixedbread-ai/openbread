import { readFile, stat } from "node:fs/promises";
import { basename, relative } from "node:path";
import { cpus, freemem } from "node:os";
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
 * Fix MIME types for files that are commonly misidentified
 */
function fixMimeTypes(file: File): File {
  const fileName = file.name.toLowerCase();
  let correctedType = file.type;

  // Fix .ts files that are detected as video/mp2t
  if (fileName.endsWith(".ts") && file.type === "video/mp2t") {
    correctedType = "text/typescript";
  }
  // Fix .py files that might be detected incorrectly
  else if (fileName.endsWith(".py") && file.type !== "text/x-python") {
    correctedType = "text/x-python";
  }
  // Fix .mdx files that are detected as text/x-markdown
  else if (fileName.endsWith(".mdx") && file.type !== "text/mdx") {
    correctedType = "text/mdx";
  }

  if (correctedType !== file.type) {
    // Only create a new File object if we need to correct the type
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
  const { metadata = {}, strategy, externalId, multipartUpload, onProgress } =
    options;

  // Read file content
  const fileContent = await readFile(filePath);
  const fileName = basename(filePath);
  const mimeType = lookup(filePath) || "application/octet-stream";
  const file = fixMimeTypes(
    new File([fileContent], fileName, { type: mimeType })
  );

  const mpConfig = resolveMultipartConfig(fileContent.length, multipartUpload);
  const totalFileBytes = fileContent.length;

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
            uploadSpinner.message(`Uploading ${completed}/${formatCountWithSuffix(total, "file")}...`);
            results.skipped++;
            return;
          }

          const fileContent = await readFile(file.path);
          const fileName = basename(file.path);
          const mimeType = lookup(file.path) || "application/octet-stream";
          const fileToUpload = fixMimeTypes(
            new File([fileContent], fileName, {
              type: mimeType,
            })
          );

          const mpConfig = resolveMultipartConfig(
            fileContent.length,
            multipartUpload
          );
          const totalFileBytes = fileContent.length;

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
          uploadSpinner.message(`Uploading ${completed}/${formatCountWithSuffix(total, "file")}...`);
        } catch (error) {
          results.failed++;
          completed++;
          uploadSpinner.message(`Uploading ${completed}/${formatCountWithSuffix(total, "file")}...`);
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
