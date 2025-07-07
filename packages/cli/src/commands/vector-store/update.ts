import type { VectorStoreUpdateParams } from "@mixedbread/sdk/resources/index";
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
import { validateMetadata } from "../../utils/metadata";
import { formatOutput } from "../../utils/output";
import { resolveVectorStore } from "../../utils/vector-store";

const UpdateVectorStoreSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { message: '"name-or-id" is required' }),
  name: z.string().optional(),
  description: z.string().optional(),
  expiresAfter: z.coerce
    .number({ message: '"expires-after" must be a number' })
    .int({ message: '"expires-after" must be an integer' })
    .positive({ message: '"expires-after" must be positive' })
    .optional(),
  metadata: z.string().optional(),
});

interface UpdateOptions extends GlobalOptions {
  name?: string;
  description?: string;
  expiresAfter?: number;
  metadata?: string;
}

export function createUpdateCommand(): Command {
  const command = addGlobalOptions(
    new Command("update")
      .description("Update a vector store")
      .argument("<name-or-id>", "Name or ID of the vector store")
      .option("--name <name>", "New name for the vector store")
      .option("--description <desc>", "New description for the vector store")
      .option("--expires-after <days>", "Expire after number of days")
      .option(
        "--metadata <json>",
        "New metadata as JSON string (replaces existing)"
      )
  );

  command.action(async (nameOrId: string, options: UpdateOptions) => {
    let spinner: Ora;

    try {
      const mergedOptions = mergeCommandOptions(command, options);

      const parsedOptions = parseOptions(UpdateVectorStoreSchema, {
        ...mergedOptions,
        nameOrId,
      });

      const client = createClient(parsedOptions);
      const vectorStore = await resolveVectorStore(
        client,
        parsedOptions.nameOrId
      );

      // Parse metadata if provided
      const metadata = validateMetadata(parsedOptions.metadata);

      const updateData: VectorStoreUpdateParams = {};
      if (parsedOptions.name) updateData.name = parsedOptions.name;
      if (parsedOptions.description !== undefined)
        updateData.description = parsedOptions.description;
      if (metadata !== undefined) updateData.metadata = metadata;
      if (parsedOptions.expiresAfter !== undefined)
        updateData.expires_after = {
          anchor: "last_active_at",
          days: parsedOptions.expiresAfter,
        };

      if (Object.keys(updateData).length === 0) {
        console.error(
          chalk.red("✗"),
          "No update fields provided. Use --name, --description, or --metadata"
        );
        process.exit(1);
      }

      spinner = ora("Updating vector store...").start();

      const updatedVectorStore = await client.vectorStores.update(
        vectorStore.id,
        updateData
      );

      spinner.succeed(
        `Vector store "${vectorStore.name}" updated successfully`
      );

      formatOutput(
        {
          id: updatedVectorStore.id,
          name: updatedVectorStore.name,
          description: updatedVectorStore.description,
          expires_after: updatedVectorStore.expires_after,
          metadata:
            parsedOptions.format === "table"
              ? JSON.stringify(updatedVectorStore.metadata, null, 2)
              : updatedVectorStore.metadata,
          file_counts: updatedVectorStore.file_counts,
          status: updatedVectorStore.status,
          created_at: updatedVectorStore.created_at,
          updated_at: updatedVectorStore.updated_at,
          last_active_at: updatedVectorStore.last_active_at,
          usage_bytes: updatedVectorStore.usage_bytes,
          expires_at: updatedVectorStore.expires_at,
        },
        parsedOptions.format
      );
    } catch (error) {
      spinner?.fail("Failed to update vector store");
      if (error instanceof Error) {
        console.error(chalk.red("\n✗"), error.message);
      } else {
        console.error(chalk.red("\n✗"), "Failed to update vector store");
      }
      process.exit(1);
    }
  });

  return command;
}
