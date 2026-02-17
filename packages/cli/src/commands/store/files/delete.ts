import { confirm, isCancel, log, spinner } from "@clack/prompts";
import { Command } from "commander";
import z from "zod";
import { createClient } from "../../../utils/client";
import {
  addGlobalOptions,
  extendGlobalOptions,
  type GlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../../../utils/global-options";
import { resolveStore } from "../../../utils/store";

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
      const deleteSpinner = spinner();
      try {
        const mergedOptions = mergeCommandOptions(deleteCommand, options);

        const parsedOptions = parseOptions(DeleteFileSchema, {
          ...mergedOptions,
          nameOrId,
          fileId,
        });

        const client = createClient(parsedOptions);
        const store = await resolveStore(client, parsedOptions.nameOrId);

        // Confirmation prompt unless --yes is used
        if (!parsedOptions.yes) {
          const confirmed = await confirm({
            message: `Are you sure you want to delete file "${parsedOptions.fileId}" from store "${store.name}" (${store.id})? This action cannot be undone.`,
            initialValue: false,
          });

          if (isCancel(confirmed) || !confirmed) {
            log.warn("Deletion cancelled.");
            return;
          }
        }

        deleteSpinner.start("Deleting file...");

        await client.stores.files.delete(parsedOptions.fileId, {
          store_identifier: store.id,
        });

        deleteSpinner.stop(`File ${parsedOptions.fileId} deleted successfully`);
      } catch (error) {
        deleteSpinner.stop();
        log.error(
          error instanceof Error ? error.message : "Failed to delete file"
        );
        process.exit(1);
      }
    }
  );

  return deleteCommand;
}
