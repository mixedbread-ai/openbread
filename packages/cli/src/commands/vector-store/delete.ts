import chalk from "chalk";
import { Command } from "commander";
import inquirer from "inquirer";
import ora, { type Ora } from "ora";
import { z } from "zod";
import { createClient } from "../../utils/client";
import {
  getCurrentKeyName,
  updateCacheAfterDelete,
} from "../../utils/completion-cache";
import {
  addGlobalOptions,
  extendGlobalOptions,
  type GlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../../utils/global-options";
import { resolveStore } from "../../utils/vector-store";

const DeleteStoreSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { error: '"name-or-id" is required' }),
  yes: z.boolean().optional(),
});

interface DeleteOptions extends GlobalOptions {
  yes?: boolean;
}

export function createDeleteCommand(): Command {
  const command = addGlobalOptions(
    new Command("delete")
      .alias("rm")
      .description("Delete a store")
      .argument("<name-or-id>", "Name or ID of the store")
      .option("-y, --yes", "Skip confirmation prompt")
  );

  command.action(async (nameOrId: string, options: DeleteOptions) => {
    let spinner: Ora;

    try {
      const mergedOptions = mergeCommandOptions(command, options);

      const parsedOptions = parseOptions(DeleteStoreSchema, {
        ...mergedOptions,
        nameOrId,
      });

      const client = createClient(parsedOptions);
      const store = await resolveStore(client, parsedOptions.nameOrId);

      // Confirmation prompt unless --yes is used
      if (!parsedOptions.yes) {
        const { confirmed } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmed",
            message: `Are you sure you want to delete store "${store.name}" (${store.id})? This action cannot be undone.`,
            default: false,
          },
        ]);

        if (!confirmed) {
          console.log(chalk.yellow("Deletion cancelled."));
          return;
        }
      }

      spinner = ora("Deleting store...").start();

      await client.stores.delete(store.id);

      spinner.succeed(`Store "${store.name}" deleted successfully`);

      // Update completion cache by removing the deleted store
      const keyName = getCurrentKeyName();
      if (keyName) {
        updateCacheAfterDelete(keyName, store.name);
      }
    } catch (error) {
      spinner?.fail("Failed to delete store");
      if (error instanceof Error) {
        console.error(chalk.red("\n✗"), error.message);
      } else {
        console.error(chalk.red("\n✗"), "Failed to delete store");
      }
      process.exit(1);
    }
  });

  return command;
}
