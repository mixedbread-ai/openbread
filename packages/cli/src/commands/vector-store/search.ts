import type Mixedbread from "@mixedbread/sdk";
import chalk from "chalk";
import { Command } from "commander";
import ora, { type Ora } from "ora";
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
import { resolveVectorStore } from "../../utils/vector-store";

const SearchVectorStoreSchema = extendGlobalOptions({
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

type ParsedSearchOptions = z.infer<typeof SearchVectorStoreSchema> & {
  vectorStoreIdentifier: string;
};

async function searchVectorStoreFiles(
  client: Mixedbread,
  parsedOptions: ParsedSearchOptions
) {
  return await client.vectorStores.files.search({
    query: parsedOptions.query,
    vector_store_identifiers: [parsedOptions.vectorStoreIdentifier],
    top_k: parsedOptions.topK,
    search_options: {
      return_metadata: parsedOptions.returnMetadata,
      score_threshold: parsedOptions.threshold,
      rerank: parsedOptions.rerank,
    },
  });
}

async function searchVectorStoreChunks(
  client: Mixedbread,
  parsedOptions: ParsedSearchOptions
) {
  return await client.vectorStores.search({
    query: parsedOptions.query,
    vector_store_identifiers: [parsedOptions.vectorStoreIdentifier],
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
      .description("Search within a vector store")
      .argument("<name-or-id>", "Name or ID of the vector store")
      .argument("<query>", "Search query")
      .option("--top-k <n>", "Number of results to return")
      .option("--threshold <score>", "Minimum score threshold")
      .option("--return-metadata", "Return metadata")
      .option("--rerank", "Enable reranking")
      .option("--file-search", "Search files instead of chunks", false)
  );

  command.action(
    async (nameOrId: string, query: string, options: SearchOptions) => {
      let spinner: Ora;

      try {
        const mergedOptions = mergeCommandOptions(command, options);
        const parsedOptions = parseOptions(SearchVectorStoreSchema, {
          ...mergedOptions,
          nameOrId,
          query,
        });

        const client = createClient(parsedOptions);
        spinner = ora("Searching vector store...").start();
        const vectorStore = await resolveVectorStore(
          client,
          parsedOptions.nameOrId
        );
        const config = loadConfig();

        // Get default values from config
        const topK = parsedOptions.topK || config.defaults?.search?.top_k || 10;
        const rerank =
          parsedOptions.rerank ?? config.defaults?.search?.rerank ?? false;

        const results = parsedOptions.fileSearch
          ? await searchVectorStoreFiles(client, {
              ...parsedOptions,
              vectorStoreIdentifier: vectorStore.id,
              topK,
              rerank,
            })
          : await searchVectorStoreChunks(client, {
              ...parsedOptions,
              vectorStoreIdentifier: vectorStore.id,
              topK,
              rerank,
            });

        if (!results.data || results.data.length === 0) {
          spinner.info("No results found.");
          return;
        }

        spinner.succeed(
          `Found ${formatCountWithSuffix(results.data.length, "result")}`
        );

        const output = results.data.map((result) => {
          const metadata =
            parsedOptions.format === "table"
              ? JSON.stringify(result.metadata, null, 2)
              : result.metadata;

          const output: Record<string, unknown> = {
            filename: result.filename,
            score: result.score.toFixed(2),
            vector_store_id: result.vector_store_id,
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
        spinner?.fail("Search failed");
        if (error instanceof Error) {
          console.error(chalk.red("\n✗"), error.message);
        } else {
          console.error(chalk.red("\n✗"), "Failed to search vector store");
        }
        process.exit(1);
      }
    }
  );

  return command;
}
