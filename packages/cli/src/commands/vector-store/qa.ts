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
import { formatOutput } from "../../utils/output";
import { resolveStore } from "../../utils/vector-store";

const QAStoreSchema = extendGlobalOptions({
  nameOrId: z.string().min(1, { error: '"name-or-id" is required' }),
  question: z.string().min(1, { error: '"question" is required' }),
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
  cite: z.boolean().optional(),
  multimodal: z.boolean().optional(),
  returnMetadata: z.boolean().optional(),
});

interface QAOptions extends GlobalOptions {
  topK?: number;
  threshold?: number;
  cite?: boolean;
  multimodal?: boolean;
  returnMetadata?: boolean;
}

export function createQACommand(): Command {
  const command = addGlobalOptions(
    new Command("qa")
      .description("Ask questions about store content")
      .argument("<name-or-id>", "Name or ID of the store")
      .argument("<question>", "Question to ask")
      .option("--top-k <n>", "Number of sources to consider")
      .option("--threshold <score>", "Minimum score threshold for sources")
      .option("--return-metadata", "Return source metadata")
  );

  command.action(
    async (nameOrId: string, question: string, options: QAOptions) => {
      let spinner: Ora;

      try {
        const mergedOptions = mergeCommandOptions(command, options);
        const parsedOptions = parseOptions(QAStoreSchema, {
          ...mergedOptions,
          nameOrId,
          question,
        });

        const client = createClient(parsedOptions);
        spinner = ora("Processing question...").start();
        const store = await resolveStore(client, parsedOptions.nameOrId);
        const config = loadConfig();

        // Get default values from config
        const topK = parsedOptions.topK || config.defaults?.search?.top_k || 10;

        const response = await client.stores.questionAnswering({
          query: parsedOptions.question,
          store_identifiers: [store.id],
          top_k: topK,
          search_options: {
            score_threshold: parsedOptions.threshold
              ? parsedOptions.threshold
              : undefined,
            return_metadata: parsedOptions.returnMetadata
              ? parsedOptions.returnMetadata
              : undefined,
          },
        });

        spinner.succeed("Question processed");

        // Display the answer
        console.log(chalk.bold(chalk.blue("Answer:")));
        console.log(response.answer);

        // Display sources if available
        if (response.sources && response.sources.length > 0) {
          console.log(chalk.bold(chalk.blue("\nSources:")));

          const sources = response.sources.map((source) => {
            const metadata =
              parsedOptions.format === "table"
                ? JSON.stringify(source.metadata, null, 2)
                : source.metadata;

            const output: Record<string, unknown> = {
              filename: source.filename,
              score: source.score.toFixed(2),
              chunk_index: source.chunk_index,
            };

            if (parsedOptions.returnMetadata) {
              output.metadata = metadata;
            }

            return output;
          });

          formatOutput(sources, parsedOptions.format);
        }
      } catch (error) {
        spinner?.fail("Failed to process question");
        if (error instanceof Error) {
          console.error(chalk.red("\n✗"), error.message);
        } else {
          console.error(chalk.red("\n✗"), "Failed to process question");
        }
        process.exit(1);
      }
    }
  );

  return command;
}
