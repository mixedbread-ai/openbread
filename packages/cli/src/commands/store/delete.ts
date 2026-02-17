import { confirm, isCancel, log, spinner } from "@clack/prompts";
import { Command } from "commander";
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
import { resolveStore } from "../../utils/store";

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
    const deleteSpinner = spinner();

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
        const confirmed = await confirm({
          message: `Are you sure you want to delete store "${store.name}" (${store.id})? This action cannot be undone.`,
          initialValue: false,
        });

        if (isCancel(confirmed) || !confirmed) {
          log.warn("Deletion cancelled.");
          return;
        }
      }

      deleteSpinner.start("Deleting store...");

      await client.stores.delete(store.id);

      deleteSpinner.stop(`Store "${store.name}" deleted successfully`);

      // Update completion cache by removing the deleted store
      const keyName = getCurrentKeyName();
      if (keyName) {
        updateCacheAfterDelete(keyName, store.name);
      }
    } catch (error) {
      deleteSpinner.stop();
      log.error(
        error instanceof Error ? error.message : "Failed to delete store"
      );
      process.exit(1);
    }
  });

  return command;
}
