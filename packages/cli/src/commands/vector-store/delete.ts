import chalk from "chalk";
import { Command } from "commander";
import inquirer from "inquirer";
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
import { resolveVectorStore } from "../../utils/vector-store";

const DeleteVectorStoreSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { message: '"name-or-id" is required' }),
  force: z.boolean().optional(),
});

interface DeleteOptions extends GlobalOptions {
  force?: boolean;
}

export function createDeleteCommand(): Command {
  const command = addGlobalOptions(
    new Command("delete")
      .alias("rm")
      .description("Delete a vector store")
      .argument("<name-or-id>", "Name or ID of the vector store")
      .option("--force", "Skip confirmation prompt", false)
  );

  command.action(async (nameOrId: string, options: DeleteOptions) => {
    let spinner: Ora;

    try {
      const mergedOptions = mergeCommandOptions(command, options);

      const parsedOptions = parseOptions(DeleteVectorStoreSchema, {
        ...mergedOptions,
        nameOrId,
      });

      const client = createClient(parsedOptions);
      const vectorStore = await resolveVectorStore(
        client,
        parsedOptions.nameOrId
      );

      // Confirmation prompt unless --force is used
      if (!parsedOptions.force) {
        const { confirmed } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmed",
            message: `Are you sure you want to delete vector store "${vectorStore.name}" (${vectorStore.id})? This action cannot be undone.`,
            default: false,
          },
        ]);

        if (!confirmed) {
          console.log(chalk.yellow("Deletion cancelled."));
          return;
        }
      }

      spinner = ora("Deleting vector store...").start();

      await client.vectorStores.delete(vectorStore.id);

      spinner.succeed(
        `Vector store "${vectorStore.name}" deleted successfully`
      );
    } catch (error) {
      spinner?.fail("Failed to delete vector store");
      if (error instanceof Error) {
        console.error(chalk.red("\n✗"), error.message);
      } else {
        console.error(chalk.red("\n✗"), "Failed to delete vector store");
      }
      process.exit(1);
    }
  });

  return command;
}
