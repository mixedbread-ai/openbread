import type { VectorStoreFile } from "@mixedbread/sdk/resources/vector-stores";
import chalk from "chalk";
import { Command } from "commander";
import ora, { type Ora } from "ora";
import { z } from "zod";
import { createClient } from "../../../utils/client";
import {
  addGlobalOptions,
  extendGlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../../../utils/global-options";
import {
  formatBytes,
  formatCountWithSuffix,
  formatOutput,
} from "../../../utils/output";
import { resolveVectorStore } from "../../../utils/vector-store";
import type { FilesOptions } from ".";

const ListFilesSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { message: '"name-or-id" is required' }),
  status: z
    .enum(["all", "completed", "in_progress", "failed"], {
      message: '"status" must be one of: all, completed, in_progress, failed',
    })
    .optional(),
  limit: z.coerce
    .number({ message: '"limit" must be a number' })
    .int({ message: '"limit" must be an integer' })
    .positive({ message: '"limit" must be positive' })
    .max(100, { message: '"limit" must be less than or equal to 100' })
    .optional(),
});

export function createListCommand(): Command {
  const listCommand = addGlobalOptions(
    new Command("list")
      .alias("ls")
      .description("List files in a vector store")
      .argument("<name-or-id>", "Name or ID of the vector store")
      .option(
        "--status <status>",
        "Filter by status (pending|in_progress|cancelled|completed|failed)",
        "all"
      )
      .option("--limit <n>", "Maximum number of results", "10")
  );

  listCommand.action(async (nameOrId: string, options: FilesOptions) => {
    let spinner: Ora;

    try {
      const mergedOptions = mergeCommandOptions(listCommand, options);
      const parsedOptions = parseOptions(ListFilesSchema, {
        ...mergedOptions,
        nameOrId,
      });

      const client = createClient(parsedOptions);
      spinner = ora("Loading files...").start();
      const vectorStore = await resolveVectorStore(
        client,
        parsedOptions.nameOrId
      );

      const response = await client.vectorStores.files.list(vectorStore.id, {
        limit: parsedOptions.limit || 10,
      });

      let files = response.data;

      // Apply status filter
      if (parsedOptions.status && parsedOptions.status !== "all") {
        files = files.filter(
          (file: VectorStoreFile) => file.status === parsedOptions.status
        );
      }

      if (files.length === 0) {
        spinner.info("No files found.");
        return;
      }

      spinner.succeed(`Found ${formatCountWithSuffix(files.length, "file")}`);

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
      spinner.fail("Failed to load files");
      if (error instanceof Error) {
        console.error(chalk.red("\n✗"), error.message);
      } else {
        console.error(chalk.red("\n✗"), "Failed to list files");
      }
      process.exit(1);
    }
  });

  return listCommand;
}
