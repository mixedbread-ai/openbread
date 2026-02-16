import { statSync } from "node:fs";
import { log, spinner } from "@clack/prompts";
import type { FileCreateParams } from "@mixedbread/sdk/resources/stores";
import chalk from "chalk";
import { Command } from "commander";
import { glob } from "glob";
import { z } from "zod";
import { createClient } from "../../utils/client";
import { loadConfig } from "../../utils/config";
import { warnContextualizationDeprecated } from "../../utils/deprecation";
import {
  addGlobalOptions,
  extendGlobalOptions,
  type GlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../../utils/global-options";
import { uploadFromManifest } from "../../utils/manifest";
import { validateMetadata } from "../../utils/metadata";
import { formatBytes, formatCountWithSuffix } from "../../utils/output";
import { getStoreFiles, resolveStore } from "../../utils/store";
import { type FileToUpload, uploadFilesInBatch } from "../../utils/upload";

const UploadStoreSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { error: '"name-or-id" is required' }),
  patterns: z.array(z.string()).optional(),
  strategy: z
    .enum(["fast", "high_quality"], {
      error: '"strategy" must be either "fast" or "high_quality"',
    })
    .optional(),
  contextualization: z
    .boolean({ error: '"contextualization" must be a boolean' })
    .optional(),
  metadata: z.string().optional(),
  dryRun: z.boolean().optional(),
  parallel: z.coerce
    .number({ error: '"parallel" must be a number' })
    .int({ error: '"parallel" must be an integer' })
    .min(1, { error: '"parallel" must be at least 1' })
    .max(200, { error: '"parallel" must be less than or equal to 200' })
    .optional(),
  unique: z.boolean().optional(),
  manifest: z.string().optional(),
});

export interface UploadOptions extends GlobalOptions {
  strategy?: FileCreateParams.Experimental["parsing_strategy"];
  contextualization?: boolean;
  metadata?: string;
  dryRun?: boolean;
  parallel?: number;
  unique?: boolean;
  manifest?: string;
}

export function createUploadCommand(): Command {
  const command = addGlobalOptions(
    new Command("upload")
      .description("Upload files to a store")
      .argument("<name-or-id>", "Name or ID of the store")
      .argument(
        "[patterns...]",
        'File patterns to upload (e.g., "*.md", "docs/**/*.pdf")'
      )
      .option("--strategy <strategy>", "Processing strategy")
      .option(
        "--contextualization",
        "Deprecated (ignored): contextualization is now configured at the store level"
      )
      .option("--metadata <json>", "Additional metadata as JSON string")
      .option("--dry-run", "Preview what would be uploaded", false)
      .option("--parallel <n>", "Number of concurrent uploads (1-200)")
      .option(
        "--unique",
        "Update existing files instead of creating duplicates",
        false
      )
      .option("--manifest <file>", "Upload using manifest file")
  );

  command.action(
    async (nameOrId: string, patterns: string[], options: UploadOptions) => {
      try {
        const mergedOptions = mergeCommandOptions(command, options);

        const parsedOptions = parseOptions(UploadStoreSchema, {
          ...mergedOptions,
          nameOrId,
          patterns,
        });

        if (parsedOptions.contextualization) {
          warnContextualizationDeprecated("store upload");
        }

        const client = createClient(parsedOptions);
        const initializeSpinner = spinner();
        initializeSpinner.start("Initializing upload...");
        const store = await resolveStore(client, parsedOptions.nameOrId);
        const config = loadConfig();

        initializeSpinner.stop("Upload initialized");

        // Handle manifest file upload
        if (parsedOptions.manifest) {
          return await uploadFromManifest(
            client,
            store.id,
            parsedOptions.manifest,
            parsedOptions
          );
        }

        if (!parsedOptions.patterns || parsedOptions.patterns.length === 0) {
          log.error(
            "No file patterns provided. Use --manifest for manifest-based uploads."
          );
          process.exit(1);
        }

        // Get configuration values with precedence: command-line > config defaults > built-in defaults
        const strategy =
          parsedOptions.strategy ?? config.defaults?.upload?.strategy ?? "fast";
        const parallel =
          parsedOptions.parallel ?? config.defaults?.upload?.parallel ?? 100;

        const metadata = validateMetadata(parsedOptions.metadata);

        // Collect all files matching patterns
        const files: string[] = [];
        for (const pattern of parsedOptions.patterns) {
          const matches = await glob(pattern, {
            nodir: true,
            absolute: false,
          });
          files.push(...matches);
        }
        // Remove duplicates
        const uniqueFiles = [...new Set(files)];

        if (parsedOptions.patterns) {
          if (uniqueFiles.length === 0) {
            log.warn("No files found matching the patterns.");
            return;
          }

          const totalSize = uniqueFiles.reduce((sum, file) => {
            try {
              return sum + statSync(file).size;
            } catch {
              return sum;
            }
          }, 0);

          console.log(
            `Found ${formatCountWithSuffix(uniqueFiles.length, "file")} matching the ${
              patterns.length > 1 ? "patterns" : "pattern"
            } (${formatBytes(totalSize)})`
          );
        }

        if (parsedOptions.dryRun) {
          console.log(chalk.blue("Dry run - files that would be uploaded:"));
          uniqueFiles.forEach((file) => {
            try {
              const stats = statSync(file);
              console.log(`  \n${file} (${formatBytes(stats.size)})`);
              console.log(`    Strategy: ${strategy}`);

              if (metadata && Object.keys(metadata).length > 0) {
                console.log(`    Metadata: ${JSON.stringify(metadata)}`);
              }
            } catch (_error) {
              console.log(`  ${file} (${chalk.red("✗ File not found")})`);
            }
          });
          return;
        }

        // Handle --unique flag: check for existing files
        let existingFiles: Map<string, string> = new Map();
        if (parsedOptions.unique) {
          const uniqueSpinner = spinner();
          uniqueSpinner.start("Checking for existing files...");
          try {
            const storeFiles = await getStoreFiles(client, store.id);
            existingFiles = new Map(
              storeFiles
                .filter((f) => {
                  const filePath =
                    typeof f.metadata === "object" &&
                    f.metadata &&
                    "file_path" in f.metadata &&
                    (f.metadata.file_path as string);

                  return filePath && files.includes(filePath);
                })
                .map((f) => [
                  (f.metadata as { file_path: string }).file_path,
                  f.id,
                ])
            );
            uniqueSpinner.stop(
              `Found ${formatCountWithSuffix(existingFiles.size, "existing file")}`
            );
          } catch (error) {
            uniqueSpinner.stop();
            log.error("Failed to check existing files");
            throw error;
          }
        }

        // Transform files to shared format
        const filesToUpload: FileToUpload[] = uniqueFiles.map((filePath) => ({
          path: filePath,
          strategy,
          metadata,
        }));

        // Upload files with progress tracking
        await uploadFilesInBatch(client, store.id, filesToUpload, {
          unique: parsedOptions.unique || false,
          existingFiles,
          parallel,
        });
      } catch (error) {
        if (error instanceof Error) {
          log.error(error.message);
        } else {
          log.error("Failed to upload files");
        }
        process.exit(1);
      }
    }
  );

  return command;
}
