import { log, spinner } from "@clack/prompts";
import { Command } from "commander";
import { z } from "zod";
import { createClient } from "../../../utils/client";
import {
  addGlobalOptions,
  extendGlobalOptions,
  type GlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../../../utils/global-options";
import { formatBytes, formatOutput } from "../../../utils/output";
import { resolveStore } from "../../../utils/store";

const GetFileSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { error: '"name-or-id" is required' }),
  fileId: z.string().min(1, { error: '"file-id" is required' }),
});

export function createGetCommand(): Command {
  const getCommand = addGlobalOptions(
    new Command("get")
      .description("Get file details")
      .argument("<name-or-id>", "Name or ID of the store")
      .argument("<file-id>", "ID of the file")
  );

  getCommand.action(
    async (nameOrId: string, fileId: string, options: GlobalOptions) => {
      const s = spinner();

      try {
        const mergedOptions = mergeCommandOptions(getCommand, options);

        const parsedOptions = parseOptions(GetFileSchema, {
          ...mergedOptions,
          nameOrId,
          fileId,
        });

        const client = createClient(parsedOptions);
        s.start("Loading file details...");
        const store = await resolveStore(client, parsedOptions.nameOrId);

        const file = await client.stores.files.retrieve(parsedOptions.fileId, {
          store_identifier: store.id,
        });

        s.stop("File details loaded");

        const formattedData = {
          id: file.id,
          name: file.filename,
          status: file.status,
          size: formatBytes(file.usage_bytes),
          "created at": new Date(file.created_at).toLocaleString(),
          metadata:
            parsedOptions.format === "table"
              ? JSON.stringify(file.metadata, null, 2)
              : file.metadata,
        };

        formatOutput(formattedData, parsedOptions.format);
      } catch (error) {
        s.stop();
        log.error(
          error instanceof Error ? error.message : "Failed to get file details"
        );
        process.exit(1);
      }
    }
  );

  return getCommand;
}
