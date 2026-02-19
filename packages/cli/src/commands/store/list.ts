import { Command } from "commander";
import { z } from "zod";
import { createClient } from "../../utils/client";
import {
  getCurrentKeyName,
  refreshCacheForKey,
} from "../../utils/completion-cache";
import {
  addGlobalOptions,
  extendGlobalOptions,
  parseOptions,
} from "../../utils/global-options";
import { log, spinner } from "../../utils/logger";
import {
  formatBytes,
  formatCountWithSuffix,
  formatOutput,
} from "../../utils/output";

const ListStoreSchema = extendGlobalOptions({
  filter: z.string().optional(),
  limit: z.coerce
    .number({ error: '"limit" must be a number' })
    .int({ error: '"limit" must be an integer' })
    .positive({ error: '"limit" must be positive' })
    .max(100, { error: '"limit" must be less than or equal to 100' })
    .optional(),
});

export function createListCommand(): Command {
  const command = addGlobalOptions(
    new Command("list")
      .description("List stores")
      .option("--filter <name>", "Filter by name pattern")
      .option("--limit <n>", "Maximum number of results", "100")
  );

  command.action(async () => {
    const listSpinner = spinner();

    try {
      const mergedOptions = command.optsWithGlobals();
      const parsedOptions = parseOptions(
        ListStoreSchema,
        mergedOptions as Record<string, unknown>
      );

      const client = createClient(parsedOptions);
      listSpinner.start("Loading stores...");
      const response = await client.stores.list({
        limit: parsedOptions.limit || 100,
      });

      let stores = response.data;

      // Apply filter if provided
      if (parsedOptions.filter) {
        const filterPattern = parsedOptions.filter.toLowerCase();
        stores = stores.filter((store) =>
          store.name.toLowerCase().includes(filterPattern)
        );
      }

      if (stores.length === 0) {
        listSpinner.stop();
        log.info("No stores found.");
        return;
      }

      // Format data for output
      const formattedData = stores.map((store) => ({
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

      listSpinner.stop(
        `Found ${formatCountWithSuffix(stores.length, "store")}`
      );
      formatOutput(formattedData, parsedOptions.format);

      // Update completion cache with the fetched stores
      const keyName = getCurrentKeyName();
      if (keyName) {
        refreshCacheForKey(keyName, client);
      }
    } catch (error) {
      listSpinner.stop();
      log.error(
        error instanceof Error ? error.message : "Failed to list stores"
      );
      process.exit(1);
    }
  });

  return command;
}
