import { log, spinner } from "@clack/prompts";
import type Mixedbread from "@mixedbread/sdk";
import { Command } from "commander";
import { z } from "zod";
import { createClient } from "../../utils/client";
import { loadConfig } from "../../utils/config";
import {
  addGlobalOptions,
  extendGlobalOptions,
  type GlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../../utils/global-options";
import { formatCountWithSuffix, formatOutput } from "../../utils/output";
import { resolveStore } from "../../utils/store";

const SearchStoreSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { error: '"name-or-id" is required' }),
  query: z.string().min(1, { error: '"query" is required' }),
  topK: z.coerce
    .number({ error: '"top-k" must be a number' })
    .int({ error: '"top-k" must be an integer' })
    .positive({ error: '"top-k" must be positive' })
    .max(100, { error: '"top-k" must be less than or equal to 100' })
    .optional(),
  threshold: z.coerce
    .number({ error: '"threshold" must be a number' })
    .min(0, { error: '"threshold" must be greater than or equal to 0' })
    .max(1, { error: '"threshold" must be less than or equal to 1' })
    .optional(),
  returnMetadata: z.boolean().optional(),
  rerank: z.boolean().optional(),
  fileSearch: z.boolean().optional(),
});

type ParsedSearchOptions = z.infer<typeof SearchStoreSchema> & {
  storeIdentifier: string;
};

async function searchStoreFiles(
  client: Mixedbread,
  parsedOptions: ParsedSearchOptions
) {
  return await client.stores.files.search({
    query: parsedOptions.query,
    store_identifiers: [parsedOptions.storeIdentifier],
    top_k: parsedOptions.topK,
    search_options: {
      return_metadata: parsedOptions.returnMetadata,
      score_threshold: parsedOptions.threshold,
      rerank: parsedOptions.rerank,
    },
  });
}

async function searchStoreChunks(
  client: Mixedbread,
  parsedOptions: ParsedSearchOptions
) {
  return await client.stores.search({
    query: parsedOptions.query,
    store_identifiers: [parsedOptions.storeIdentifier],
    top_k: parsedOptions.topK,
    search_options: {
      return_metadata: parsedOptions.returnMetadata,
      score_threshold: parsedOptions.threshold,
      rerank: parsedOptions.rerank,
    },
  });
}

interface SearchOptions extends GlobalOptions {
  topK?: number;
  threshold?: number;
  returnMetadata?: boolean;
  rerank?: boolean;
  fileSearch?: boolean;
}

export function createSearchCommand(): Command {
  const command = addGlobalOptions(
    new Command("search")
      .description("Search within a store")
      .argument("<name-or-id>", "Name or ID of the store")
      .argument("<query>", "Search query")
      .option("--top-k <n>", "Number of results to return")
      .option("--threshold <score>", "Minimum score threshold")
      .option("--return-metadata", "Return metadata")
      .option("--rerank", "Enable reranking")
      .option("--file-search", "Search files instead of chunks", false)
  );

  command.action(
    async (nameOrId: string, query: string, options: SearchOptions) => {
      const searchSpinner = spinner();

      try {
        const mergedOptions = mergeCommandOptions(command, options);
        const parsedOptions = parseOptions(SearchStoreSchema, {
          ...mergedOptions,
          nameOrId,
          query,
        });

        const client = createClient(parsedOptions);
        searchSpinner.start("Searching store...");
        const store = await resolveStore(client, parsedOptions.nameOrId);
        const config = loadConfig();

        // Get default values from config
        const topK = parsedOptions.topK || config.defaults?.search?.top_k || 10;
        const rerank =
          parsedOptions.rerank ?? config.defaults?.search?.rerank ?? false;

        const results = parsedOptions.fileSearch
          ? await searchStoreFiles(client, {
              ...parsedOptions,
              storeIdentifier: store.id,
              topK,
              rerank,
            })
          : await searchStoreChunks(client, {
              ...parsedOptions,
              storeIdentifier: store.id,
              topK,
              rerank,
            });

        if (!results.data || results.data.length === 0) {
          searchSpinner.stop();
          log.info("No results found.");
          return;
        }

        searchSpinner.stop(`Found ${formatCountWithSuffix(results.data.length, "result")}`);

        const output = results.data.map((result) => {
          const metadata =
            parsedOptions.format === "table"
              ? JSON.stringify(result.metadata, null, 2)
              : result.metadata;

          const output: Record<string, unknown> = {
            filename: result.filename,
            score: result.score.toFixed(2),
            store_id: result.store_id,
          };

          if (!parsedOptions.fileSearch) {
            output.chunk_index = result.chunk_index;
          }

          if (parsedOptions.returnMetadata) {
            output.metadata = metadata;
          }

          return output;
        });

        formatOutput(output, parsedOptions.format);
      } catch (error) {
        searchSpinner.stop();
        log.error(
          error instanceof Error ? error.message : "Failed to search store"
        );
        process.exit(1);
      }
    }
  );

  return command;
}
