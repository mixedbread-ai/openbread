import { readFileSync, statSync } from "node:fs";
import { log, spinner } from "@clack/prompts";
import type { Mixedbread } from "@mixedbread/sdk";
import chalk from "chalk";
import { glob } from "glob";
import { parse } from "yaml";
import { z } from "zod";
import type { UploadOptions } from "../commands/store/upload";
import { loadConfig } from "./config";
import { warnContextualizationDeprecated } from "./deprecation";
import { validateMetadata } from "./metadata";
import { formatBytes, formatCountWithSuffix } from "./output";
import { getStoreFiles } from "./store";
import { type FileToUpload, uploadFilesInBatch } from "./upload";

// Manifest file schema
const ManifestFileEntrySchema = z.object({
  path: z.string().min(1, { error: "File path is required" }),
  strategy: z.enum(["fast", "high_quality"]).optional(),
  contextualization: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const ManifestSchema = z.object({
  version: z.string().optional().default("1.0"),
  defaults: z
    .object({
      strategy: z.enum(["fast", "high_quality"]).optional(),
      contextualization: z.boolean().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  files: z
    .array(ManifestFileEntrySchema)
    .min(1, { error: "At least one file entry is required" }),
});

type ManifestFile = z.infer<typeof ManifestSchema>;

export async function uploadFromManifest(
  client: Mixedbread,
  storeIdentifier: string,
  manifestPath: string,
  options: UploadOptions
) {
  console.log(chalk.bold(`Loading manifest from: ${manifestPath}`));

  try {
    const config = loadConfig();
    // Read and parse manifest file
    const manifestContent = readFileSync(manifestPath, "utf-8");
    let manifestData: ManifestFile | null = null;

    try {
      // Try JSON first
      manifestData = JSON.parse(manifestContent);
    } catch {
      try {
        // Try YAML if JSON fails
        manifestData = parse(manifestContent);
      } catch {
        throw new Error("Manifest file must be valid JSON or YAML");
      }
    }

    // Validate manifest structure
    const manifest = ManifestSchema.parse(manifestData);
    console.log(chalk.gray(`Manifest version: ${manifest.version}`));
    console.log(
      chalk.gray(
        `Found ${manifest.files.length} file ${manifest.files.length === 1 ? "entry" : "entries"}`
      )
    );

    // Resolve all files from manifest entries
    const resolvedFiles: FileToUpload[] = [];

    const defaults = manifest.defaults || {};
    const optionsMetadata = validateMetadata(options.metadata);

    if (
      defaults.contextualization ||
      manifest.files.some((f) => f.contextualization)
    ) {
      warnContextualizationDeprecated("manifest upload");
    }

    for (const entry of manifest.files) {
      console.log(chalk.gray(`Resolving: ${entry.path}`));

      // Resolve glob patterns
      const matchedFiles = await glob(entry.path, {
        nodir: true,
        absolute: false,
      });

      if (matchedFiles.length === 0) {
        console.warn(
          chalk.yellow(`Warning: No files found for pattern: ${entry.path}`)
        );
        continue;
      }

      // Add each matched file with its configuration
      for (const filePath of matchedFiles) {
        // Precedence for file-specific: command-line > entry-specific > manifest defaults > config defaults > built-in defaults
        const fileStrategy =
          options.strategy ??
          entry.strategy ??
          defaults.strategy ??
          config.defaults.upload.strategy ??
          "fast";

        // Merge metadata: command-line (highest) > entry-specific > manifest defaults
        const fileMetadata = {
          ...defaults.metadata,
          ...entry.metadata,
          ...optionsMetadata,
          manifest_entry: true,
        };

        resolvedFiles.push({
          path: filePath,
          strategy: fileStrategy,
          metadata: fileMetadata,
        });
      }
    }

    if (resolvedFiles.length === 0) {
      log.warn("No files found matching manifest patterns.");
      return;
    }

    // Remove duplicates (same file with potentially different configs - last wins)
    const uniqueFilesMap = new Map<string, FileToUpload>();
    for (const file of resolvedFiles) {
      uniqueFilesMap.set(file.path, file);
    }
    const uniqueFiles = Array.from(uniqueFilesMap.values());

    const totalSize = uniqueFiles.reduce((sum, file) => {
      try {
        return sum + statSync(file.path).size;
      } catch {
        return sum;
      }
    }, 0);

    console.log(
      `Found ${formatCountWithSuffix(uniqueFiles.length, "file")} matching the patterns (${formatBytes(totalSize)})`
    );

    if (options.dryRun) {
      console.log(chalk.blue("\nDry run - files that would be uploaded:"));
      uniqueFiles.forEach((file) => {
        try {
          const stats = statSync(file.path);
          console.log(`  \n${file.path} (${formatBytes(stats.size)})`);
          console.log(`    Strategy: ${file.strategy}`);

          if (Object.keys(file.metadata).length > 0) {
            console.log(`    Metadata: ${JSON.stringify(file.metadata)}`);
          }
        } catch (_error) {
          console.log(`  ${file.path} (${chalk.red("✗ File not found")})`);
        }
      });
      return;
    }

    // Handle --unique flag: check for existing files
    let existingFiles: Map<string, string> = new Map();
    if (options.unique) {
      const s = spinner();
      s.start("Checking for existing files...");
      try {
        const storeFiles = await getStoreFiles(client, storeIdentifier);
        existingFiles = new Map(
          storeFiles
            .filter((f) =>
              uniqueFiles.some((file) => {
                const filePath =
                  typeof f.metadata === "object" &&
                  f.metadata &&
                  "file_path" in f.metadata &&
                  f.metadata.file_path;

                return filePath && filePath === file.path;
              })
            )
            .map((f) => [(f.metadata as { file_path: string }).file_path, f.id])
        );
        s.stop(
          `Found ${formatCountWithSuffix(existingFiles.size, "existing file")}`
        );
      } catch (error) {
        s.stop();
        log.error("Failed to check existing files");
        throw error;
      }
    }

    // Upload files
    await uploadFilesInBatch(client, storeIdentifier, uniqueFiles, {
      unique: options.unique || false,
      existingFiles,
      parallel: options.parallel ?? config.defaults.upload.parallel ?? 100,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.error("Invalid manifest file format:");
      error.issues.forEach((err) => {
        console.error(chalk.red(`  - ${err.path.join(".")}: ${err.message}`));
      });
    } else if (error instanceof Error) {
      log.error(error.message);
    } else {
      log.error("Failed to process manifest file");
    }
    process.exit(1);
  }
}
