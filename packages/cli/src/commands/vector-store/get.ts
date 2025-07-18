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
import { resolveVectorStore } from "../../utils/vector-store";

const GetVectorStoreSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { message: '"name-or-id" is required' }),
});

interface GetOptions extends GlobalOptions {}

export function createGetCommand(): Command {
  const command = addGlobalOptions(
    new Command("get")
      .description("Get vector store details")
      .argument("<name-or-id>", "Name or ID of the vector store")
  );

  command.action(async (nameOrId: string, options: GetOptions) => {
    let spinner: Ora;

    try {
      const mergedOptions = mergeCommandOptions(command, options);

      const parsedOptions = parseOptions(GetVectorStoreSchema, {
        ...mergedOptions,
        nameOrId,
      });

      const client = createClient(parsedOptions);
      spinner = ora("Loading vector store details...").start();
      const vectorStore = await resolveVectorStore(
        client,
        parsedOptions.nameOrId
      );

      spinner.succeed("Vector store details loaded");

      const formattedData = {
        name: vectorStore.name,
        id: vectorStore.id,
        description: vectorStore.description || "N/A",
        status:
          vectorStore.expires_at &&
          new Date(vectorStore.expires_at) < new Date()
            ? "expired"
            : "active",
        "total files": vectorStore.file_counts?.total || 0,
        "completed files": vectorStore.file_counts?.completed || 0,
        "processing files": vectorStore.file_counts?.in_progress || 0,
        "failed files": vectorStore.file_counts?.failed || 0,
        usage: formatBytes(vectorStore.usage_bytes || 0),
        "created at": new Date(vectorStore.created_at).toLocaleString(),
        "expires at": vectorStore.expires_at
          ? new Date(vectorStore.expires_at).toLocaleString()
          : "Never",
        metadata:
          parsedOptions.format === "table"
            ? JSON.stringify(vectorStore.metadata, null, 2)
            : vectorStore.metadata,
      };

      formatOutput(formattedData, parsedOptions.format);
    } catch (error) {
      spinner?.fail("Failed to load vector store details");
      if (error instanceof Error) {
        console.error(chalk.red("\n✗"), error.message);
      } else {
        console.error(chalk.red("\n✗"), "Failed to get vector store details");
      }
      process.exit(1);
    }
  });

  return command;
}
