import { confirm, isCancel } from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { z } from "zod";
import { createClient } from "../../utils/client";
import { warnContextualizationDeprecated } from "../../utils/deprecation";
import { getGitInfo } from "../../utils/git";
import {
  addGlobalOptions,
  extendGlobalOptions,
  parseOptions,
} from "../../utils/global-options";
import { log, spinner } from "../../utils/logger";
import { validateMetadata } from "../../utils/metadata";
import { formatBytes, formatCountWithSuffix } from "../../utils/output";
import { resolveStore } from "../../utils/store";
import {
  analyzeChanges,
  displaySyncResultsSummary,
  executeSyncChanges,
  formatChangeSummary,
} from "../../utils/sync";
import { getSyncedFiles } from "../../utils/sync-state";

const SyncStoreSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { error: '"name-or-id" is required' }),
  patterns: z
    .array(z.string())
    .min(1, { error: "At least one pattern is required" }),
  strategy: z.enum(["fast", "high_quality"]).optional(),
  contextualization: z
    .boolean({ error: '"contextualization" must be a boolean' })
    .optional(),
  fromGit: z.string().optional(),
  dryRun: z.boolean().optional(),
  yes: z.boolean().optional(),
  force: z.boolean().optional(),
  metadata: z.string().optional(),
  parallel: z.coerce
    .number({ error: '"parallel" must be a number' })
    .int({ error: '"parallel" must be an integer' })
    .min(1, { error: '"parallel" must be at least 1' })
    .max(200, { error: '"parallel" must be less than or equal to 200' })
    .optional()
    .default(100),
});

export function createSyncCommand(): Command {
  const command = addGlobalOptions(
    new Command("sync")
      .description("Sync files with store (intelligent change detection)")
      .argument("<name-or-id>", "Name or ID of the store")
      .argument(
        "<patterns...>",
        "File patterns, folders, or paths to sync (supports ./** and folder names)"
      )
      .option("--strategy <strategy>", "Upload strategy (fast|high_quality)")
      .option(
        "--contextualization",
        "Deprecated (ignored): contextualization is now configured at the store level"
      )
      .option(
        "--from-git <ref>",
        "Only sync files changed since git ref (default: last sync)"
      )
      .option("--dry-run", "Show what would change without making changes")
      .option("-y, --yes", "Skip confirmation prompt")
      .option(
        "-f, --force",
        "Force re-upload all files, ignoring change detection"
      )
      .option("--metadata <json>", "Additional metadata for files")
      .option("--parallel <n>", "Number of concurrent operations (1-200)")
  );

  command.action(async (nameOrId: string, patterns: string[]) => {
    try {
      const mergedOptions = command.optsWithGlobals();
      const parsedOptions = parseOptions(SyncStoreSchema, {
        ...mergedOptions,
        nameOrId,
        patterns,
      });

      const client = createClient(parsedOptions);

      console.log(chalk.bold.blue("🔄 Starting Store Sync"));

      if (parsedOptions.contextualization) {
        warnContextualizationDeprecated("store sync");
      }

      // Step 0: Resolve store
      const resolveSpinner = spinner();
      resolveSpinner.start(`Looking up store "${parsedOptions.nameOrId}"...`);
      const store = await resolveStore(client, parsedOptions.nameOrId);
      resolveSpinner.stop(`Found store: ${store.name}`);

      // Parse metadata if provided
      const additionalMetadata = validateMetadata(parsedOptions.metadata);

      // Get git info
      const gitInfo = await getGitInfo();

      const loadSpinner = spinner();
      loadSpinner.start("Loading existing files from store...");

      const syncedFiles = await getSyncedFiles(client, store.id);

      loadSpinner.stop(
        `Found ${formatCountWithSuffix(syncedFiles.size, "existing file")} in store`
      );

      const fromGit = parsedOptions.fromGit;

      if (parsedOptions.force) {
        log.success("Force upload enabled - all files will be re-uploaded");
      } else if (fromGit && gitInfo.isRepo) {
        log.success(
          `Git-based detection enabled (from commit ${fromGit.substring(0, 7)})`
        );
      } else if (fromGit && !gitInfo.isRepo) {
        log.error("--from-git specified but not in a git repository");
        process.exit(1);
      } else {
        log.success("Hash-based detection enabled (comparing file contents)");
      }

      const analyzeSpinner = spinner();
      analyzeSpinner.start("Scanning files and detecting changes...");
      const analysis = await analyzeChanges({
        patterns,
        syncedFiles,
        gitInfo,
        fromGit,
        forceUpload: parsedOptions.force,
      });

      analyzeSpinner.stop("Change analysis complete");

      const totalChanges =
        analysis.added.length +
        analysis.modified.length +
        analysis.deleted.length;

      if (totalChanges === 0) {
        log.success("Store is already in sync - no changes needed!");
        return;
      }

      // Show summary
      if (parsedOptions.force) {
        console.log(chalk.bold("\n--force enabled"));
        console.log(
          `All ${formatCountWithSuffix(analysis.totalFiles, "file")} will be re-uploaded to the store.`
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
        const proceed = await confirm({
          message: "Apply these changes to the store?",
        });

        if (isCancel(proceed) || !proceed) {
          log.warn("Sync cancelled by user");
          return;
        }
      } else if (parsedOptions.yes) {
        log.success("Auto-proceeding with --yes flag");
      }

      // Execute changes
      const syncResults = await executeSyncChanges(client, store.id, analysis, {
        strategy: parsedOptions.strategy,
        metadata: additionalMetadata,
        gitInfo: gitInfo.isRepo ? gitInfo : undefined,
        parallel: parsedOptions.parallel,
      });

      // Display summary
      displaySyncResultsSummary(syncResults, gitInfo, fromGit, {
        strategy: parsedOptions.strategy,
      });
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("Failed to sync store");
      }
      process.exit(1);
    }
  });

  return command;
}
