import { statSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type Mixedbread from "@mixedbread/sdk";
import type { FileCreateParams } from "@mixedbread/sdk/resources/stores";
import chalk from "chalk";
import { glob } from "glob";
import ora from "ora";
import pLimit from "p-limit";
import { getChangedFiles, normalizeGitPatterns } from "./git";
import { calculateFileHash, hashesMatch } from "./hash";
import { formatBytes, formatCountWithSuffix } from "./output";
import { buildFileSyncMetadata, type SyncedFileByPath } from "./sync-state";
import { uploadFile } from "./upload";

interface FileChange {
  path: string;
  type: "added" | "modified" | "deleted";
  size?: number;
  localHash?: string;
  remoteHash?: string;
  fileId?: string;
  remoteExternalId?: string;
}

interface SyncAnalysis {
  added: FileChange[];
  modified: FileChange[];
  deleted: FileChange[];
  unchanged: number;
  totalFiles: number;
  totalSize: number;
}

interface SyncResult {
  file: FileChange;
  success: boolean;
  skipped?: boolean;
  error?: Error;
}

interface SyncResults {
  deletions: {
    successful: SyncResult[];
    failed: SyncResult[];
  };
  uploads: {
    successful: SyncResult[];
    failed: SyncResult[];
  };
}

function buildSyncPlan(analysis: SyncAnalysis): {
  filesToUpload: FileChange[];
  filesToDelete: FileChange[];
} {
  const filesToUpload = [...analysis.added, ...analysis.modified];
  // Clean up files previously uploaded without external id
  const modifiedWithoutExternalId = analysis.modified.filter(
    (f) => !f.remoteExternalId
  );
  // Exclude Git-detected deletions that may not have been uploaded before
  const deleted = analysis.deleted.filter((f) => f.fileId);
  const filesToDelete = [...modifiedWithoutExternalId, ...deleted];

  return { filesToUpload, filesToDelete };
}

interface AnalyzeChangesParams {
  patterns: string[];
  syncedFiles: SyncedFileByPath;
  gitInfo: { commit: string; branch: string; isRepo: boolean };
  fromGit?: string;
  forceUpload?: boolean;
}

export async function analyzeChanges(
  params: AnalyzeChangesParams
): Promise<SyncAnalysis> {
  const { patterns, syncedFiles, gitInfo, fromGit, forceUpload } = params;

  const analysis: SyncAnalysis = {
    added: [],
    modified: [],
    deleted: [],
    unchanged: 0,
    totalFiles: 0,
    totalSize: 0,
  };

  // Get all local files matching patterns
  const localFiles = new Set<string>();
  for (const pattern of patterns) {
    const matches = await glob(pattern, { nodir: true });
    matches.forEach((file) => localFiles.add(path.resolve(file)));
  }

  // Only use git detection if --from-git is explicitly provided
  let gitChanges: Map<string, "added" | "modified" | "deleted"> | null = null;
  if (fromGit && gitInfo.isRepo) {
    const normalizedPatterns = await normalizeGitPatterns(patterns);
    const changes = await getChangedFiles(fromGit, normalizedPatterns);
    gitChanges = new Map(changes.map((c) => [path.resolve(c.path), c.status]));
  }

  // When using --from-git, only process files that git detected as changed
  // Otherwise, process all local files matching patterns (default behavior)
  const filesToProcess = fromGit
    ? new Set(gitChanges?.keys() || [])
    : localFiles;

  analysis.totalFiles = filesToProcess.size;

  // Process files
  for (const filePath of filesToProcess) {
    const syncedFile = syncedFiles.get(filePath);

    // Check if file exists locally
    let stats: { size: number } | null = null;
    try {
      stats = await fs.stat(filePath);
    } catch {
      // File doesn't exist locally (might be deleted)
      stats = null;
    }

    if (!stats) continue;

    if (!syncedFile) {
      // New file - only add if it exists locally
      analysis.added.push({
        path: filePath,
        type: "added",
        size: stats.size,
      });
      analysis.totalSize += stats.size;
    } else {
      // Check if modified
      let isModified = false;
      let localHash: string | undefined;

      if (forceUpload) {
        // When --force-upload is set, treat all existing files as modified
        isModified = true;
        localHash = await calculateFileHash(filePath);
      } else if (fromGit && gitChanges && gitChanges.has(filePath)) {
        // When using --from-git, trust git detection
        const gitStatus = gitChanges.get(filePath);
        isModified = gitStatus === "modified" || gitStatus === "added";
      } else {
        // Default behavior: use hash comparison
        localHash = await calculateFileHash(filePath);
        isModified = !hashesMatch(localHash, syncedFile.metadata.file_hash);
      }

      if (isModified) {
        analysis.modified.push({
          path: filePath,
          type: "modified",
          size: stats.size,
          localHash,
          remoteHash: syncedFile.metadata.file_hash,
          fileId: syncedFile.fileId,
          remoteExternalId: syncedFile.externalId,
        });
        analysis.totalSize += stats.size;
      } else {
        analysis.unchanged++;
      }
    }
  }

  // Check for deleted files
  if (fromGit && gitChanges) {
    // When using --from-git, only process git-detected deletions
    for (const [filePath, gitStatus] of gitChanges) {
      if (gitStatus === "deleted") {
        const syncedFile = syncedFiles.get(filePath);
        if (syncedFile) {
          // File was deleted in git and exists in store - mark for deletion
          analysis.deleted.push({
            path: filePath,
            type: "deleted",
            fileId: syncedFile.fileId,
          });
        }
      }
    }
  } else {
    // Default behavior: check for files that were previously synced but no longer exist locally
    for (const [filePath, syncedFile] of syncedFiles) {
      if (!localFiles.has(filePath)) {
        analysis.deleted.push({
          path: filePath,
          type: "deleted",
          fileId: syncedFile.fileId,
        });
      }
    }
  }

  return analysis;
}

export function formatChangeSummary(analysis: SyncAnalysis): string {
  const lines: string[] = [];

  lines.push(chalk.bold("\nChanges to apply:"));

  if (analysis.modified.length > 0) {
    lines.push(
      `  ${chalk.yellow("Updated:")} (${formatCountWithSuffix(analysis.modified.length, "file")})`
    );
    analysis.modified.forEach((file) => {
      const size = file.size ? ` (${formatBytes(file.size)})` : "";
      lines.push(`    • ${path.relative(process.cwd(), file.path)}${size}`);
    });
    lines.push("");
  }

  if (analysis.added.length > 0) {
    lines.push(
      `  ${chalk.green("New:")} (${formatCountWithSuffix(analysis.added.length, "file")})`
    );
    analysis.added.forEach((file) => {
      const size =
        typeof file.size === "number" ? ` (${formatBytes(file.size)})` : "";
      lines.push(`    • ${path.relative(process.cwd(), file.path)}${size}`);
    });
    lines.push("");
  }

  if (analysis.deleted.length > 0) {
    lines.push(
      `  ${chalk.red("Deleted:")} (${formatCountWithSuffix(analysis.deleted.length, "file")})`
    );
    analysis.deleted.forEach((file) => {
      lines.push(`    • ${path.relative(process.cwd(), file.path)}`);
    });
    lines.push("");
  }

  const { filesToUpload, filesToDelete } = buildSyncPlan(analysis);
  const totalUploads = filesToUpload.length;
  const totalDeletes = filesToDelete.length;
  const totalChanges = totalUploads + totalDeletes;

  lines.push(
    `Total: ${formatCountWithSuffix(totalChanges, "change")} (${formatCountWithSuffix(
      totalUploads,
      "file"
    )} to upload, ${formatCountWithSuffix(totalDeletes, "file")} to delete)`
  );
  lines.push(`Upload size: ${formatBytes(analysis.totalSize)}`);

  return lines.join("\n");
}

export async function executeSyncChanges(
  client: Mixedbread,
  storeIdentifier: string,
  analysis: SyncAnalysis,
  options: {
    strategy?: FileCreateParams.Config["parsing_strategy"];
    metadata?: Record<string, unknown>;
    gitInfo?: { commit: string; branch: string };
    parallel?: number;
  }
): Promise<SyncResults> {
  const parallel = options.parallel ?? 100;
  const limit = pLimit(parallel);
  const { filesToUpload, filesToDelete } = buildSyncPlan(analysis);
  const totalOperations = filesToUpload.length + filesToDelete.length;
  let completed = 0;

  console.log(chalk.bold("\nSyncing changes..."));

  const results: SyncResults = {
    deletions: { successful: [], failed: [] },
    uploads: { successful: [], failed: [] },
  };

  // Delete legacy modified files and removed files
  if (filesToDelete.length > 0) {
    console.log(
      chalk.yellow(
        `\nDeleting ${formatCountWithSuffix(filesToDelete.length, "file")}...`
      )
    );

    const deletePromises: Promise<SyncResult>[] = filesToDelete.map((file) =>
      limit(async () => {
        const deleteSpinner = ora(
          `Deleting ${path.relative(process.cwd(), file.path)}`
        ).start();
        try {
          await client.stores.files.delete(file.fileId!, {
            store_identifier: storeIdentifier,
          });
          completed++;
          deleteSpinner.succeed(
            `[${completed}/${totalOperations}] Deleted ${path.relative(process.cwd(), file.path)}`
          );
          return { file, success: true };
        } catch (error) {
          completed++;
          deleteSpinner.fail(
            `[${completed}/${totalOperations}] Failed to delete ${path.relative(process.cwd(), file.path)}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          return {
            file,
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      })
    );

    const deleteResults = await Promise.allSettled(deletePromises);
    deleteResults.forEach((result) => {
      if (result.status === "fulfilled") {
        const syncResult = result.value;
        if (syncResult.success) {
          results.deletions.successful.push(syncResult);
        } else {
          results.deletions.failed.push(syncResult);
        }
      }
    });
  }

  // Upload new and modified files
  if (filesToUpload.length > 0) {
    console.log(
      chalk.blue(
        `\nUploading ${formatCountWithSuffix(filesToUpload.length, "file")}...`
      )
    );

    const uploadPromises: Promise<SyncResult>[] = filesToUpload.map((file) =>
      limit(async () => {
        const uploadSpinner = ora(
          `Uploading ${path.relative(process.cwd(), file.path)}`
        ).start();
        try {
          // Calculate hash if not already done
          const fileHash =
            file.localHash || (await calculateFileHash(file.path));

          // Build sync metadata
          const syncMetadata = buildFileSyncMetadata(
            file.path,
            fileHash,
            options.gitInfo
          );

          // Merge with user-provided metadata
          const finalMetadata = {
            ...options.metadata,
            ...syncMetadata,
          };

          // Check if file is empty
          const stats = statSync(file.path);
          if (stats.size === 0) {
            completed++;
            uploadSpinner.warn(
              `[${completed}/${totalOperations}] Skipped empty file ${path.relative(process.cwd(), file.path)}`
            );
            return { file, success: false, skipped: true };
          }

          // Upload file
          await uploadFile(client, storeIdentifier, file.path, {
            metadata: finalMetadata,
            strategy: options.strategy,
            externalId: file.path,
          });

          completed++;
          uploadSpinner.succeed(
            `[${completed}/${totalOperations}] Uploaded ${path.relative(process.cwd(), file.path)}`
          );
          return { file, success: true };
        } catch (error) {
          completed++;
          uploadSpinner.fail(
            `[${completed}/${totalOperations}] Failed to upload ${path.relative(process.cwd(), file.path)}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          return {
            file,
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      })
    );

    const uploadResults = await Promise.allSettled(uploadPromises);
    uploadResults.forEach((result) => {
      if (result.status === "fulfilled") {
        const syncResult = result.value;
        if (syncResult.success) {
          results.uploads.successful.push(syncResult);
        } else {
          results.uploads.failed.push(syncResult);
        }
      }
    });
  }

  return results;
}

export function displaySyncResultsSummary(
  syncResults: SyncResults,
  gitInfo: { commit: string; branch: string; isRepo: boolean },
  fromGit?: string,
  uploadOptions?: {
    strategy?: FileCreateParams.Config["parsing_strategy"];
  }
): void {
  console.log(chalk.bold("\nSummary:"));

  // Upload summary
  const successfulUploads = syncResults.uploads.successful.length;
  const failedUploads = syncResults.uploads.failed.filter(
    (f) => !f.skipped
  ).length;
  const skippedUploads = syncResults.uploads.failed.filter(
    (f) => f.skipped
  ).length;

  if (successfulUploads > 0) {
    console.log(
      chalk.green("✓"),
      `${formatCountWithSuffix(successfulUploads, "file")} uploaded successfully`
    );
  }

  if (skippedUploads > 0) {
    console.log(
      chalk.yellow("⚠"),
      `${formatCountWithSuffix(skippedUploads, "file")} skipped`
    );
  }

  if (failedUploads > 0) {
    console.log(
      chalk.red("✗"),
      `${formatCountWithSuffix(failedUploads, "file")} failed to upload`
    );
  }

  // Deletion summary
  const successfulDeletions = syncResults.deletions.successful.length;
  const failedDeletions = syncResults.deletions.failed.length;

  if (successfulDeletions > 0) {
    console.log(
      chalk.green("✓"),
      `${formatCountWithSuffix(successfulDeletions, "file")} deleted successfully`
    );
  }

  if (failedDeletions > 0) {
    console.log(
      chalk.red("✗"),
      `${formatCountWithSuffix(failedDeletions, "file")} failed to delete`
    );
  }

  if (successfulUploads > 0 && uploadOptions) {
    const strategy = uploadOptions.strategy ?? "fast";
    console.log(chalk.gray(`Strategy: ${strategy}`));
  }

  const hasFailures = failedUploads > 0 || failedDeletions > 0;

  if (hasFailures) {
    console.log(chalk.yellow("\n⚠ Sync completed with errors"));
  } else {
    console.log(chalk.green("\n✓ Store is now in sync"));
  }

  if (fromGit && gitInfo.isRepo) {
    console.log(
      chalk.green("✓"),
      `Sync state saved (commit: ${gitInfo.commit.substring(0, 7)})`
    );
  }
}
