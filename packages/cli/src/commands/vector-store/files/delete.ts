import chalk from "chalk";
import { Command } from "commander";
import inquirer from "inquirer";
import ora, { type Ora } from "ora";
import z from "zod";
import { createClient } from "../../../utils/client";
import {
  addGlobalOptions,
  extendGlobalOptions,
  type GlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../../../utils/global-options";
import { resolveVectorStore } from "../../../utils/vector-store";

const DeleteFileSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { error: '"name-or-id" is required' }),
  fileId: z.string().min(1, { error: '"file-id" is required' }),
  yes: z.boolean().optional(),
});

export function createDeleteCommand(): Command {
  const deleteCommand = addGlobalOptions(
    new Command("delete")
      .alias("rm")
      .description("Delete a file from store")
      .argument("<name-or-id>", "Name or ID of the store")
      .argument("<file-id>", "ID of the file")
      .option("-y, --yes", "Skip confirmation prompt")
  );

  deleteCommand.action(
    async (nameOrId: string, fileId: string, options: GlobalOptions) => {
      let spinner: Ora;
      try {
        const mergedOptions = mergeCommandOptions(deleteCommand, options);

        const parsedOptions = parseOptions(DeleteFileSchema, {
          ...mergedOptions,
          nameOrId,
          fileId,
        });

        const client = createClient(parsedOptions);
        const vectorStore = await resolveVectorStore(
          client,
          parsedOptions.nameOrId
        );

        // Confirmation prompt unless --yes is used
        if (!parsedOptions.yes) {
          const { confirmed } = await inquirer.prompt([
            {
              type: "confirm",
              name: "confirmed",
              message: `Are you sure you want to delete file "${parsedOptions.fileId}" from store "${vectorStore.name}" (${vectorStore.id})? This action cannot be undone.`,
              default: false,
            },
          ]);

          if (!confirmed) {
            console.log(chalk.yellow("Deletion cancelled."));
            return;
          }
        }

        spinner = ora("Deleting file...").start();

        await client.vectorStores.files.delete(parsedOptions.fileId, {
          vector_store_identifier: vectorStore.id,
        });

        spinner.succeed(`File ${parsedOptions.fileId} deleted successfully`);
      } catch (error) {
        spinner?.fail("Failed to delete file");
        if (error instanceof Error) {
          console.error(chalk.red("\n✗"), error.message);
        } else {
          console.error(chalk.red("\n✗"), "Failed to delete file");
        }
        process.exit(1);
      }
    }
  );

  return deleteCommand;
}
