import chalk from "chalk";
import { Command } from "commander";
import ora, { type Ora } from "ora";
import { z } from "zod";
import { createClient } from "../../utils/client";
import {
  getCurrentKeyName,
  updateCacheAfterCreate,
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

const CreateStoreSchema = extendGlobalOptions({
  name: z.string().min(1, { error: '"name" is required' }),
  description: z.string().optional(),
  expiresAfter: z.coerce
    .number({ error: '"expires-after" must be a number' })
    .int({ error: '"expires-after" must be an integer' })
    .positive({ error: '"expires-after" must be positive' })
    .optional(),
  metadata: z.string().optional(),
});

interface CreateOptions extends GlobalOptions {
  description?: string;
  expiresAfter?: number;
  metadata?: string;
}

export function createCreateCommand(): Command {
  const command = addGlobalOptions(
    new Command("create")
      .description("Create a new store")
      .argument("<name>", "Name of the store")
      .option("--description <desc>", "Description of the store")
      .option("--expires-after <days>", "Expire after number of days")
      .option("--metadata <json>", "Additional metadata as JSON string")
  );

  command.action(async (name: string, options: CreateOptions) => {
    let spinner: Ora;

    try {
      const mergedOptions = mergeCommandOptions(command, options);
      const client = createClient(mergedOptions);

      const parsedOptions = parseOptions(CreateStoreSchema, {
        ...mergedOptions,
        name,
      });

      const metadata = validateMetadata(parsedOptions.metadata);

      spinner = ora("Creating store...").start();

      const store = await client.stores.create({
        name: parsedOptions.name,
        description: parsedOptions.description,
        expires_after: parsedOptions.expiresAfter
          ? {
              anchor: "last_active_at",
              days: parsedOptions.expiresAfter,
            }
          : undefined,
        metadata,
      });

      spinner.succeed(`Store "${name}" created successfully`);

      formatOutput(
        {
          id: store.id,
          name: store.name,
          description: store.description,
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
      spinner?.fail("Failed to create store");
      if (error instanceof Error) {
        console.error(chalk.red("\n✗"), error.message);
      } else {
        console.error(chalk.red("\n✗"), "Failed to create store");
      }
      process.exit(1);
    }
  });

  return command;
}
