import type { FileCreateParams } from "@mixedbread/sdk/resources/vector-stores";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { z } from "zod";
import { createClient } from "../../utils/client";
import { getGitInfo } from "../../utils/git";
import {
  addGlobalOptions,
  extendGlobalOptions,
  type GlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../../utils/global-options";
import { validateMetadata } from "../../utils/metadata";
import { formatBytes, formatCountWithSuffix } from "../../utils/output";
import {
  analyzeChanges,
  displaySyncResultsSummary,
  executeSyncChanges,
  formatChangeSummary,
} from "../../utils/sync";
import { getSyncedFiles } from "../../utils/sync-state";
import { resolveVectorStore } from "../../utils/vector-store";

const SyncVectorStoreSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { message: '"name-or-id" is required' }),
  patterns: z
    .array(z.string())
    .min(1, { message: "At least one pattern is required" }),
  strategy: z.enum(["fast", "high_quality"]).optional(),
  contextualization: z
    .boolean({ message: '"contextualization" must be a boolean' })
    .optional(),
  fromGit: z.string().optional(),
  dryRun: z.boolean().optional(),
  yes: z.boolean().optional(),
  force: z.boolean().optional(),
  metadata: z.string().optional(),
  parallel: z.coerce
    .number({ message: '"parallel" must be a number' })
    .int({ message: '"parallel" must be an integer' })
    .min(1, { message: '"parallel" must be at least 1' })
    .max(20, { message: '"parallel" must be less than or equal to 20' })
    .optional()
    .default(5),
});

interface SyncOptions extends GlobalOptions {
  strategy?: FileCreateParams.Experimental["parsing_strategy"];
  contextualization?: boolean;
  fromGit?: string;
  dryRun?: boolean;
  yes?: boolean;
  force?: boolean;
  metadata?: string;
  parallel?: number;
}

export function createSyncCommand(): Command {
  const command = addGlobalOptions(
    new Command("sync")
      .description(
        "Sync files with vector store (intelligent change detection)"
      )
      .argument("<name-or-id>", "Name or ID of the vector store")
      .argument(
        "<patterns...>",
        "File patterns, folders, or paths to sync (supports ./** and folder names)"
      )
      .option("--strategy <strategy>", "Upload strategy (fast|high_quality)")
      .option("--contextualization", "Enable context preservation")
      .option(
        "--from-git <ref>",
        "Only sync files changed since git ref (default: last sync)"
      )
      .option("--dry-run", "Show what would change without making changes")
      .option("-y, --yes", "Skip confirmation prompt")
      .option("--force", "Force re-upload all files, ignoring change detection")
      .option("--metadata <json>", "Additional metadata for files")
      .option("--parallel <n>", "Number of concurrent operations (1-20)")
  );

  command.action(
    async (nameOrId: string, patterns: string[], options: SyncOptions) => {
      try {
        const mergedOptions = mergeCommandOptions(command, options);
        const parsedOptions = parseOptions(SyncVectorStoreSchema, {
          ...mergedOptions,
          nameOrId,
          patterns,
        });

        const client = createClient(parsedOptions);

        console.log(chalk.bold.blue("🔄 Starting Vector Store Sync\n"));

        // Step 0: Resolve vector store
        const resolveSpinner = ora(
          `Looking up vector store "${parsedOptions.nameOrId}"...`
        ).start();
        const vectorStore = await resolveVectorStore(
          client,
          parsedOptions.nameOrId
        );
        resolveSpinner.succeed(`Found vector store: ${vectorStore.name}`);

        // Parse metadata if provided
        const additionalMetadata = validateMetadata(parsedOptions.metadata);

        // Get git info
        const gitInfo = await getGitInfo();

        const spinner = ora(
          "Loading existing files from vector store..."
        ).start();

        const syncedFiles = await getSyncedFiles(client, vectorStore.id);

        spinner.succeed(
          `Found ${formatCountWithSuffix(syncedFiles.size, "existing file")} in vector store`
        );

        const fromGit = parsedOptions.fromGit;

        if (parsedOptions.force) {
          console.log(
            chalk.green(
              "✓ Force upload enabled - all files will be re-uploaded"
            )
          );
        } else if (fromGit && gitInfo.isRepo) {
          console.log(
            chalk.green(
              `✓ Git-based detection enabled (from commit ${fromGit.substring(0, 7)})`
            )
          );
        } else if (fromGit && !gitInfo.isRepo) {
          console.error(
            chalk.red("✗"),
            "--from-git specified but not in a git repository"
          );
          process.exit(1);
        } else {
          console.log(
            chalk.green(
              "✓ Hash-based detection enabled (comparing file contents)"
            )
          );
        }

        const analyzeSpinner = ora(
          "Scanning files and detecting changes..."
        ).start();
        const analysis = await analyzeChanges({
          patterns,
          syncedFiles,
          gitInfo,
          fromGit,
          forceUpload: parsedOptions.force,
        });

        analyzeSpinner.succeed("Change analysis complete");

        const totalChanges =
          analysis.added.length +
          analysis.modified.length +
          analysis.deleted.length;

        if (totalChanges === 0) {
          console.log(
            chalk.green(
              "✓ Vector store is already in sync - no changes needed!"
            )
          );
          return;
        }

        // Show summary
        if (parsedOptions.force) {
          console.log(chalk.bold("\n--force enabled"));
          console.log(
            `All ${formatCountWithSuffix(analysis.totalFiles, "file")} will be re-uploaded to the vector store.`
          );
          console.log(`Upload size: ${formatBytes(analysis.totalSize)}\n`);
        } else {
          console.log(`${formatChangeSummary(analysis)}\n`);
        }

        // Dry run mode - just show what would happen
        if (parsedOptions.dryRun) {
          console.log(chalk.yellow.bold("Dry Run Complete"));
          console.log(
            chalk.yellow(
              "No changes were made - this was a preview of what would happen."
            )
          );
          return;
        }

        // Confirm changes unless yes flag is set
        if (!parsedOptions.yes) {
          const { default: inquirer } = await import("inquirer");
          const { proceed } = await inquirer.prompt([
            {
              type: "confirm",
              name: "proceed",
              message: "Apply these changes to the vector store?",
              default: false,
            },
          ]);

          if (!proceed) {
            console.log(chalk.yellow("Sync cancelled by user"));
            return;
          }
        } else if (parsedOptions.yes) {
          console.log(chalk.green("✓ Auto-proceeding with --yes flag"));
        }

        // Execute changes
        const syncResults = await executeSyncChanges(
          client,
          vectorStore.id,
          analysis,
          {
            strategy: parsedOptions.strategy,
            contextualization: parsedOptions.contextualization,
            metadata: additionalMetadata,
            gitInfo: gitInfo.isRepo ? gitInfo : undefined,
            parallel: parsedOptions.parallel,
          }
        );

        // Display summary
        displaySyncResultsSummary(syncResults, gitInfo, fromGit, {
          strategy: parsedOptions.strategy,
          contextualization: parsedOptions.contextualization,
        });
      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red("\n✗"), error.message);
        } else {
          console.error(chalk.red("\n✗"), "Failed to sync vector store");
        }
        process.exit(1);
      }
    }
  );

  return command;
}
