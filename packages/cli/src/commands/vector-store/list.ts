import chalk from "chalk";
import { Command } from "commander";
import ora, { type Ora } from "ora";
import { z } from "zod";
import { createClient } from "../../utils/client";
import {
  getCurrentKeyName,
  refreshCacheForKey,
} from "../../utils/completion-cache";
import {
  addGlobalOptions,
  extendGlobalOptions,
  type GlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../../utils/global-options";
import {
  formatBytes,
  formatCountWithSuffix,
  formatOutput,
} from "../../utils/output";

const ListVectorStoreSchema = extendGlobalOptions({
  filter: z.string().optional(),
  limit: z.coerce
    .number({ error: '"limit" must be a number' })
    .int({ error: '"limit" must be an integer' })
    .positive({ error: '"limit" must be positive' })
    .max(100, { error: '"limit" must be less than or equal to 100' })
    .optional(),
});

interface ListOptions extends GlobalOptions {
  filter?: string;
  limit?: number;
}

export function createListCommand(): Command {
  const command = addGlobalOptions(
    new Command("list")
      .description("List stores")
      .option("--filter <name>", "Filter by name pattern")
      .option("--limit <n>", "Maximum number of results", "10")
  );

  command.action(async (options: ListOptions) => {
    let spinner: Ora;

    try {
      const mergedOptions = mergeCommandOptions(command, options);
      const parsedOptions = parseOptions(
        ListVectorStoreSchema,
        mergedOptions as Record<string, unknown>
      );

      const client = createClient(parsedOptions);
      spinner = ora("Loading stores...").start();
      const response = await client.vectorStores.list({
        limit: parsedOptions.limit || 10,
      });

      let vectorStores = response.data;

      // Apply filter if provided
      if (parsedOptions.filter) {
        const filterPattern = parsedOptions.filter.toLowerCase();
        vectorStores = vectorStores.filter((store) =>
          store.name.toLowerCase().includes(filterPattern)
        );
      }

      if (vectorStores.length === 0) {
        spinner.info("No stores found.");
        return;
      }

      // Format data for output
      const formattedData = vectorStores.map((store) => ({
        name: store.name,
        id: store.id,
        status:
          store.expires_at && new Date(store.expires_at) < new Date()
            ? "expired"
            : "active",
        files: store.file_counts?.total,
        usage: formatBytes(store.usage_bytes),
        created: new Date(store.created_at).toLocaleDateString(),
      }));

      spinner.succeed(
        `Found ${formatCountWithSuffix(vectorStores.length, "store")}`
      );
      formatOutput(formattedData, parsedOptions.format);

      // Update completion cache with the fetched stores
      const keyName = getCurrentKeyName();
      if (keyName) {
        refreshCacheForKey(keyName, client);
      }
    } catch (error) {
      spinner?.fail("Failed to load stores");
      if (error instanceof Error) {
        console.error(chalk.red("\n✗"), error.message);
      } else {
        console.error(chalk.red("\n✗"), "Failed to list stores");
      }
      process.exit(1);
    }
  });

  return command;
}
