import { readFileSync, statSync } from "node:fs";
import type { Mixedbread } from "@mixedbread/sdk";
import chalk from "chalk";
import { glob } from "glob";
import ora from "ora";
import { parse } from "yaml";
import { z } from "zod";
import type { UploadOptions } from "../commands/vector-store/upload";
import { loadConfig } from "./config";
import { validateMetadata } from "./metadata";
import { formatBytes, formatCountWithSuffix } from "./output";
import { type FileToUpload, uploadFilesInBatch } from "./upload";
import { getVectorStoreFiles } from "./vector-store";

// Manifest file schema
const ManifestFileEntrySchema = z.object({
  path: z.string().min(1, { message: "File path is required" }),
  strategy: z.enum(["fast", "high_quality"]).optional(),
  contextualization: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const ManifestSchema = z.object({
  version: z.string().optional().default("1.0"),
  defaults: z
    .object({
      strategy: z.enum(["fast", "high_quality"]).optional(),
      contextualization: z.boolean().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .optional(),
  files: z
    .array(ManifestFileEntrySchema)
    .min(1, { message: "At least one file entry is required" }),
});

type ManifestFile = z.infer<typeof ManifestSchema>;

export async function uploadFromManifest(
  client: Mixedbread,
  vectorStoreId: string,
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
        const fileContextualization =
          options.contextualization ??
          entry.contextualization ??
          defaults.contextualization ??
          config.defaults.upload.contextualization ??
          false;

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
          contextualization: fileContextualization,
          metadata: fileMetadata,
        });
      }
    }

    if (resolvedFiles.length === 0) {
      console.log(chalk.yellow("No files found matching manifest patterns."));
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

    // Dry run preview
    if (options.dryRun) {
      console.log(chalk.blue("\nDry run - files that would be uploaded:"));
      uniqueFiles.forEach((file) => {
        try {
          const stats = statSync(file.path);
          console.log(`  ${file.path} (${formatBytes(stats.size)})`);
          console.log(
            `    Strategy: ${file.strategy}, Contextualization: ${file.contextualization}`
          );
          if (Object.keys(file.metadata).length > 0) {
            console.log(`    Metadata: ${JSON.stringify(file.metadata)}`);
          }
        } catch (_error) {
          console.log(`  ${file.path} (${chalk.red("Error: File not found")})`);
        }
      });
      return;
    }

    // Handle --unique flag: check for existing files
    let existingFiles: Map<string, string> = new Map();
    if (options.unique) {
      const spinner = ora("Checking for existing files...").start();
      try {
        const vectorStoreFiles = await getVectorStoreFiles(
          client,
          vectorStoreId
        );
        existingFiles = new Map(
          vectorStoreFiles
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
        spinner.succeed(
          `Found ${formatCountWithSuffix(existingFiles.size, "existing file")}`
        );
      } catch (error) {
        spinner.fail("Failed to check existing files");
        throw error;
      }
    }

    // Upload files
    await uploadFilesInBatch(client, vectorStoreId, uniqueFiles, {
      unique: options.unique || false,
      existingFiles,
      parallel: options.parallel ?? config.defaults.upload.parallel ?? 5,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(chalk.red("Error:"), "Invalid manifest file format:");
      error.errors.forEach((err) => {
        console.error(chalk.red(`  - ${err.path.join(".")}: ${err.message}`));
      });
    } else if (error instanceof Error) {
      console.error(chalk.red("Error:"), error.message);
    } else {
      console.error(chalk.red("Error:"), "Failed to process manifest file");
    }
    process.exit(1);
  }
}
