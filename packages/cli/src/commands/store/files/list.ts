import type { StoreFile } from "@mixedbread/sdk/resources/stores";
import { Command } from "commander";
import { z } from "zod";
import { createClient } from "../../../utils/client";
import {
  addGlobalOptions,
  extendGlobalOptions,
  parseOptions,
} from "../../../utils/global-options";
import { log, spinner } from "../../../utils/logger";
import {
  formatBytes,
  formatCountWithSuffix,
  formatOutput,
} from "../../../utils/output";
import { resolveStore } from "../../../utils/store";

const ListFilesSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { error: '"name-or-id" is required' }),
  status: z
    .enum(["all", "completed", "in_progress", "failed"], {
      error: '"status" must be one of: all, completed, in_progress, failed',
    })
    .optional(),
  limit: z.coerce
    .number({ error: '"limit" must be a number' })
    .int({ error: '"limit" must be an integer' })
    .positive({ error: '"limit" must be positive' })
    .max(100, { error: '"limit" must be less than or equal to 100' })
    .optional(),
});

export function createListCommand(): Command {
  const listCommand = addGlobalOptions(
    new Command("list")
      .alias("ls")
      .description("List files in a store")
      .argument("<name-or-id>", "Name or ID of the store")
      .option(
        "--status <status>",
        "Filter by status (pending|in_progress|cancelled|completed|failed)",
        "all"
      )
      .option("--limit <n>", "Maximum number of results", "10")
  );

  listCommand.action(async (nameOrId: string) => {
    const listSpinner = spinner();

    try {
      const mergedOptions = listCommand.optsWithGlobals();
      const parsedOptions = parseOptions(ListFilesSchema, {
        ...mergedOptions,
        nameOrId,
      });

      const client = createClient(parsedOptions);
      listSpinner.start("Loading files...");
      const store = await resolveStore(client, parsedOptions.nameOrId);

      const response = await client.stores.files.list(store.id, {
        limit: parsedOptions.limit || 10,
      });

      let files = response.data;

      // Apply status filter
      if (parsedOptions.status && parsedOptions.status !== "all") {
        files = files.filter(
          (file: StoreFile) => file.status === parsedOptions.status
        );
      }

      if (files.length === 0) {
        listSpinner.stop();
        log.info("No files found.");
        return;
      }

      listSpinner.stop(`Found ${formatCountWithSuffix(files.length, "file")}`);

      // Format data for output
      const formattedData = files.map((file) => ({
        id: file.id,
        name: file.filename,
        status: file.status,
        size: formatBytes(file.usage_bytes),
        metadata:
          parsedOptions.format === "table"
            ? JSON.stringify(file.metadata, null, 2)
            : file.metadata,
        created: new Date(file.created_at).toLocaleDateString(),
      }));

      formatOutput(formattedData, parsedOptions.format);
    } catch (error) {
      listSpinner.stop();
      log.error(
        error instanceof Error ? error.message : "Failed to list files"
      );
      process.exit(1);
    }
  });

  return listCommand;
}
