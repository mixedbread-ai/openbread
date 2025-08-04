import { readFileSync, statSync } from "node:fs";
import { basename, relative } from "node:path";
import type Mixedbread from "@mixedbread/sdk";
import type { FileCreateParams } from "@mixedbread/sdk/resources/vector-stores";
import chalk from "chalk";
import { lookup } from "mime-types";
import ora from "ora";
import { formatBytes, formatCountWithSuffix } from "./output";

export interface UploadFileOptions {
  metadata?: Record<string, unknown>;
  strategy?: FileCreateParams.Experimental["parsing_strategy"];
  contextualization?: boolean;
}

export interface FileToUpload {
  path: string;
  strategy: FileCreateParams.Experimental["parsing_strategy"];
  contextualization: boolean;
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
 * Upload a single file to a vector store
 */
export async function uploadFile(
  client: Mixedbread,
  vectorStoreIdentifier: string,
  filePath: string,
  options: UploadFileOptions = {}
): Promise<void> {
  const { metadata = {}, strategy, contextualization } = options;

  // Read file content
  const fileContent = readFileSync(filePath);
  const fileName = basename(filePath);
  const mimeType = lookup(filePath) || "application/octet-stream";
  const file = fixMimeTypes(
    new File([fileContent], fileName, { type: mimeType })
  );

  // Upload the file
  await client.vectorStores.files.upload(vectorStoreIdentifier, file, {
    metadata,
    experimental: {
      parsing_strategy: strategy,
      contextualization,
    },
  });
}

/**
 * Upload multiple files to a vector store with batch processing
 */
export async function uploadFilesInBatch(
  client: Mixedbread,
  vectorStoreIdentifier: string,
  files: FileToUpload[],
  options: {
    unique: boolean;
    existingFiles: Map<string, string>;
    parallel: number;
  }
): Promise<UploadResults> {
  const { unique, existingFiles, parallel } = options;

  // Detect if this is a manifest upload
  const isManifestUpload = files.some(
    (file) => file.metadata?.manifest_entry === true
  );

  console.log(
    `\nUploading ${formatCountWithSuffix(files.length, "file")} to vector store...`
  );

  const results: UploadResults = {
    uploaded: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    successfulSize: 0,
  };

  const totalBatches = Math.ceil(files.length / parallel);

  console.log(
    chalk.gray(
      `Processing ${totalBatches} batch${totalBatches > 1 ? "es" : ""} (${formatCountWithSuffix(parallel, "file")} per batch)...`
    )
  );

  // Process files in batches
  for (let i = 0; i < files.length; i += parallel) {
    const batch = files.slice(i, i + parallel);
    const promises = batch.map(async (file) => {
      const spinner = ora(
        `Uploading ${relative(process.cwd(), file.path)}...`
      ).start();

      try {
        // Delete existing file if using --unique
        const relativePath = relative(process.cwd(), file.path);
        if (unique && existingFiles.has(relativePath)) {
          const existingFileId = existingFiles.get(relativePath);
          await client.vectorStores.files.delete(existingFileId, {
            vector_store_identifier: vectorStoreIdentifier,
          });
        }

        const fileMetadata = {
          file_path: relativePath,
          uploaded_at: new Date().toISOString(),
          ...file.metadata,
        };

        // Check if file is empty
        const stats = statSync(file.path);
        if (stats.size === 0) {
          spinner.warn(
            `${relative(process.cwd(), file.path)} - Empty file skipped`
          );
          results.skipped++;
          return;
        }

        const fileContent = readFileSync(file.path);
        const fileName = basename(file.path);
        const mimeType = lookup(file.path) || "application/octet-stream";
        const fileToUpload = fixMimeTypes(
          new File([fileContent], fileName, {
            type: mimeType,
          })
        );

        await client.vectorStores.files.upload(
          vectorStoreIdentifier,
          fileToUpload,
          {
            metadata: fileMetadata,
            experimental: {
              parsing_strategy: file.strategy,
              contextualization: file.contextualization,
            },
          }
        );

        if (unique && existingFiles.has(relativePath)) {
          results.updated++;
        } else {
          results.uploaded++;
        }

        results.successfulSize += stats.size;

        let successMessage = `${relative(process.cwd(), file.path)} (${formatBytes(stats.size)})`;

        if (isManifestUpload) {
          const contextText = file.contextualization
            ? "contextualized"
            : "no-context";
          successMessage += ` [${file.strategy}, ${contextText}]`;
        }

        spinner.succeed(successMessage);
      } catch (error) {
        results.failed++;
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        spinner.fail(`${relative(process.cwd(), file.path)} - ${errorMsg}`);
      }
    });

    await Promise.all(promises);
  }

  // Summary
  console.log(`\n${chalk.bold("Upload Summary:")}`);
  if (results.uploaded > 0) {
    console.log(
      chalk.green(
        `✓ ${formatCountWithSuffix(results.uploaded, "file")} uploaded successfully`
      )
    );
  }
  if (results.updated > 0) {
    console.log(
      chalk.blue(`↻ ${formatCountWithSuffix(results.updated, "file")} updated`)
    );
  }
  if (results.skipped > 0) {
    console.log(
      chalk.yellow(
        `⚠ ${formatCountWithSuffix(results.skipped, "file")} skipped`
      )
    );
  }
  if (results.failed > 0) {
    console.log(
      chalk.red(`✗ ${formatCountWithSuffix(results.failed, "file")} failed`)
    );
  }

  if (!isManifestUpload && files.length > 0) {
    const firstFile = files[0];
    const contextText = firstFile.contextualization ? "enabled" : "disabled";
    console.log(chalk.gray(`Strategy: ${firstFile.strategy}`));
    console.log(chalk.gray(`Contextualization: ${contextText}`));
  }

  console.log(chalk.gray(`Total size: ${formatBytes(results.successfulSize)}`));

  return results;
}
