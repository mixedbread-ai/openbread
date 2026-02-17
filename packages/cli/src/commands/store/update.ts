import { log, spinner } from "@clack/prompts";
import type { StoreUpdateParams } from "@mixedbread/sdk/resources/index";
import { Command } from "commander";
import { z } from "zod";
import { createClient } from "../../utils/client";
import {
  getCurrentKeyName,
  updateCacheAfterUpdate,
} from "../../utils/completion-cache";
import {
  addGlobalOptions,
  extendGlobalOptions,
  type GlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../../utils/global-options";
import { validateMetadata } from "../../utils/metadata";
import { formatOutput } from "../../utils/output";
import { parsePublicFlag, resolveStore } from "../../utils/store";

const UpdateStoreSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { error: '"name-or-id" is required' }),
  name: z.string().optional(),
  description: z.string().optional(),
  public: z.union([z.boolean(), z.string()]).optional(),
  expiresAfter: z.coerce
    .number({ error: '"expires-after" must be a number' })
    .int({ error: '"expires-after" must be an integer' })
    .positive({ error: '"expires-after" must be positive' })
    .optional(),
  metadata: z.string().optional(),
});

interface UpdateOptions extends GlobalOptions {
  name?: string;
  description?: string;
  public?: boolean | string;
  expiresAfter?: number;
  metadata?: string;
}

export function createUpdateCommand(): Command {
  const command = addGlobalOptions(
    new Command("update")
      .description("Update a store")
      .argument("<name-or-id>", "Name or ID of the store")
      .option("--name <name>", "New name for the store")
      .option("--description <desc>", "New description for the store")
      .option(
        "--public [value]",
        "Make store publicly accessible, the requestor pays for the usage, not the store owner"
      )
      .option("--expires-after <days>", "Expire after number of days")
      .option(
        "--metadata <json>",
        "New metadata as JSON string (replaces existing)"
      )
  );

  command.action(async (nameOrId: string, options: UpdateOptions) => {
    const updateSpinner = spinner();

    try {
      const mergedOptions = mergeCommandOptions(command, options);

      const parsedOptions = parseOptions(UpdateStoreSchema, {
        ...mergedOptions,
        nameOrId,
      });

      const client = createClient(parsedOptions);
      const store = await resolveStore(client, parsedOptions.nameOrId);

      // Parse metadata if provided
      const metadata = validateMetadata(parsedOptions.metadata);

      const updateData: StoreUpdateParams = {};
      if (parsedOptions.name) updateData.name = parsedOptions.name;
      if (parsedOptions.description !== undefined)
        updateData.description = parsedOptions.description;
      const isPublic = parsePublicFlag(parsedOptions.public);
      if (isPublic !== undefined) updateData.is_public = isPublic;
      if (metadata !== undefined) updateData.metadata = metadata;
      if (parsedOptions.expiresAfter !== undefined)
        updateData.expires_after = {
          anchor: "last_active_at",
          days: parsedOptions.expiresAfter,
        };

      if (Object.keys(updateData).length === 0) {
        log.error(
          "No update fields provided. Use --name, --description, --public, or --metadata"
        );
        process.exit(1);
      }

      updateSpinner.start("Updating store...");

      const updatedStore = await client.stores.update(store.id, updateData);

      updateSpinner.stop(`Store "${store.name}" updated successfully`);

      formatOutput(
        {
          id: updatedStore.id,
          name: updatedStore.name,
          description: updatedStore.description,
          is_public: updatedStore.is_public,
          expires_after: updatedStore.expires_after,
          metadata:
            parsedOptions.format === "table"
              ? JSON.stringify(updatedStore.metadata, null, 2)
              : updatedStore.metadata,
          file_counts: updatedStore.file_counts,
          status: updatedStore.status,
          created_at: updatedStore.created_at,
          updated_at: updatedStore.updated_at,
          last_active_at: updatedStore.last_active_at,
          usage_bytes: updatedStore.usage_bytes,
          expires_at: updatedStore.expires_at,
        },
        parsedOptions.format
      );

      // Update completion cache if the name was changed
      if (store.name !== updatedStore.name) {
        const keyName = getCurrentKeyName();
        if (keyName) {
          updateCacheAfterUpdate(keyName, store.name, updatedStore.name);
        }
      }
    } catch (error) {
      updateSpinner.stop();
      log.error(
        error instanceof Error ? error.message : "Failed to update store"
      );
      process.exit(1);
    }
  });

  return command;
}
