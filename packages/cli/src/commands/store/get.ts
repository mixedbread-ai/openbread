import chalk from "chalk";
import { Command } from "commander";
import ora, { type Ora } from "ora";
import { z } from "zod";
import { createClient } from "../../utils/client";
import {
  addGlobalOptions,
  extendGlobalOptions,
  type GlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../../utils/global-options";
import { formatBytes, formatOutput } from "../../utils/output";
import { resolveStore } from "../../utils/store";

const GetStoreSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { error: '"name-or-id" is required' }),
});

interface GetOptions extends GlobalOptions {}

export function createGetCommand(): Command {
  const command = addGlobalOptions(
    new Command("get")
      .description("Get store details")
      .argument("<name-or-id>", "Name or ID of the store")
  );

  command.action(async (nameOrId: string, options: GetOptions) => {
    let spinner: Ora;

    try {
      const mergedOptions = mergeCommandOptions(command, options);

      const parsedOptions = parseOptions(GetStoreSchema, {
        ...mergedOptions,
        nameOrId,
      });

      const client = createClient(parsedOptions);
      spinner = ora("Loading store details...").start();
      const store = await resolveStore(client, parsedOptions.nameOrId);

      spinner.succeed("Store details loaded");

      const formattedData = {
        name: store.name,
        id: store.id,
        description: store.description || "N/A",
        status:
          store.expires_at && new Date(store.expires_at) < new Date()
            ? "expired"
            : "active",
        "total files": store.file_counts?.total || 0,
        "completed files": store.file_counts?.completed || 0,
        "processing files": store.file_counts?.in_progress || 0,
        "failed files": store.file_counts?.failed || 0,
        usage: formatBytes(store.usage_bytes || 0),
        "created at": new Date(store.created_at).toLocaleString(),
        "expires at": store.expires_at
          ? new Date(store.expires_at).toLocaleString()
          : "Never",
        metadata:
          parsedOptions.format === "table"
            ? JSON.stringify(store.metadata, null, 2)
            : store.metadata,
      };

      formatOutput(formattedData, parsedOptions.format);
    } catch (error) {
      spinner?.fail("Failed to load store details");
      if (error instanceof Error) {
        console.error(chalk.red("\n✗"), error.message);
      } else {
        console.error(chalk.red("\n✗"), "Failed to get store details");
      }
      process.exit(1);
    }
  });

  return command;
}
