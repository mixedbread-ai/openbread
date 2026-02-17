import { Command } from "commander";
import { z } from "zod";
import { createClient } from "../../utils/client";
import {
  getCurrentKeyName,
  updateCacheAfterCreate,
} from "../../utils/completion-cache";
import {
  addGlobalOptions,
  extendGlobalOptions,
  parseOptions,
} from "../../utils/global-options";
import { log, spinner } from "../../utils/logger";
import { validateMetadata } from "../../utils/metadata";
import { formatOutput } from "../../utils/output";
import { buildStoreConfig, parsePublicFlag } from "../../utils/store";

const CreateStoreSchema = extendGlobalOptions({
  name: z.string().min(1, { error: '"name" is required' }),
  description: z.string().optional(),
  public: z.union([z.boolean(), z.string()]).optional(),
  contextualization: z.union([z.boolean(), z.string()]).optional(),
  expiresAfter: z.coerce
    .number({ error: '"expires-after" must be a number' })
    .int({ error: '"expires-after" must be an integer' })
    .positive({ error: '"expires-after" must be positive' })
    .optional(),
  metadata: z.string().optional(),
});

export function createCreateCommand(): Command {
  const command = addGlobalOptions(
    new Command("create")
      .description("Create a new store")
      .argument("<name>", "Name of the store")
      .option("--description <desc>", "Description of the store")
      .option(
        "--public [value]",
        "Make store publicly accessible, the requestor pays for the usage, not the store owner"
      )
      .option(
        "--contextualization [fields]",
        "Enable contextualization, optionally with specific metadata fields (comma-separated)"
      )
      .option("--expires-after <days>", "Expire after number of days")
      .option("--metadata <json>", "Additional metadata as JSON string")
  );

  command.action(async (name: string) => {
    const createSpinner = spinner();

    try {
      const mergedOptions = command.optsWithGlobals();
      const client = createClient(mergedOptions);

      const parsedOptions = parseOptions(CreateStoreSchema, {
        ...mergedOptions,
        name,
      });

      const metadata = validateMetadata(parsedOptions.metadata);

      createSpinner.start("Creating store...");

      const store = await client.stores.create({
        name: parsedOptions.name,
        description: parsedOptions.description,
        is_public: parsePublicFlag(parsedOptions.public),
        config: buildStoreConfig(parsedOptions.contextualization),
        expires_after: parsedOptions.expiresAfter
          ? {
              anchor: "last_active_at",
              days: parsedOptions.expiresAfter,
            }
          : undefined,
        metadata,
      });

      createSpinner.stop(`Store "${name}" created successfully`);

      formatOutput(
        {
          id: store.id,
          name: store.name,
          description: store.description,
          is_public: store.is_public,
          config: store.config,
          expires_after: store.expires_after,
          metadata:
            parsedOptions.format === "table"
              ? JSON.stringify(store.metadata, null, 2)
              : store.metadata,
        },
        parsedOptions.format
      );

      // Update completion cache with the new store
      const keyName = getCurrentKeyName();
      if (keyName) {
        updateCacheAfterCreate(keyName, store.name);
      }
    } catch (error) {
      createSpinner.stop();
      log.error(
        error instanceof Error ? error.message : "Failed to create store"
      );
      process.exit(1);
    }
  });

  return command;
}
