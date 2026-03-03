import { readFile, stat } from "node:fs/promises";
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
export const DEFAULT_MULTIPART_THRESHOLD = 50 * MB; // 50 MB
export const DEFAULT_MULTIPART_PART_SIZE = 20 * MB; // 20 MB
export const DEFAULT_MULTIPART_CONCURRENCY = 5;

export interface MultipartUploadOptions {
  threshold?: number;
  partSize?: number;
  concurrency?: number;
}

export interface UploadFileOptions {
  metadata?: Record<string, unknown>;
  strategy?: FileCreateParams.Config["parsing_strategy"];
  externalId?: string;
  multipartUpload?: MultipartUploadOptions;
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
  const { metadata = {}, strategy, externalId, multipartUpload } = options;

  // Read file content
  const fileContent = await readFile(filePath);
  const fileName = basename(filePath);
  const mimeType = lookup(filePath) || "application/octet-stream";
  const file = fixMimeTypes(
    new File([fileContent], fileName, { type: mimeType })
  );

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
      threshold: DEFAULT_MULTIPART_THRESHOLD,
      partSize: DEFAULT_MULTIPART_PART_SIZE,
      concurrency: DEFAULT_MULTIPART_CONCURRENCY,
      ...multipartUpload,
      onPartUpload: (event) => {
        partsCompleted++;
        const pct = Math.round(
          (partsCompleted / event.totalParts) * 100
        );
        log.info(
          `${fileName}: Uploaded part ${partsCompleted}/${event.totalParts} (${pct}%)`
        );
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

  const configParts = [`${parallel} files at a time`];
  if (multipartUpload?.threshold) {
    configParts.push(`multipart threshold ${formatBytes(multipartUpload.threshold)}`);
  }
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
  uploadSpinner.start(`Uploading 0/${total} files...`);

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
            uploadSpinner.message(`Uploading ${completed}/${total} files...`);
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
              threshold: DEFAULT_MULTIPART_THRESHOLD,
              partSize: DEFAULT_MULTIPART_PART_SIZE,
              concurrency: DEFAULT_MULTIPART_CONCURRENCY,
              ...multipartUpload,
              onPartUpload: (event) => {
                partsCompleted++;
                const pct = Math.round(
                  (partsCompleted / event.totalParts) * 100
                );
                uploadSpinner.message(
                  `Uploading ${completed}/${total} files... (${fileName}: part ${partsCompleted}/${event.totalParts}, ${pct}%)`
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
          uploadSpinner.message(`Uploading ${completed}/${total} files...`);
        } catch (error) {
          results.failed++;
          completed++;
          uploadSpinner.message(`Uploading ${completed}/${total} files...`);
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          log.error(`${relativePath} - ${errorMsg}`);
        }
      })
    )
  );

  uploadSpinner.stop(`Uploaded ${total} files`);

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

  if (!showStrategyPerFile && files.length > 0) {
    const firstFile = files[0];
    console.log(chalk.gray(`Strategy: ${firstFile.strategy}`));
  }

  console.log(chalk.gray(`Total size: ${formatBytes(results.successfulSize)}`));

  return results;
}
