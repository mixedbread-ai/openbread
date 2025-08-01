import chalk from "chalk";
import type { Command } from "commander";
import { z } from "zod";

export interface GlobalOptions {
  apiKey?: string;
  savedKey?: string;
  format?: "table" | "json" | "csv";
  baseURL?: string;
  debug?: boolean;
}

const BaseGlobalOptionsSchema = z.object({
  apiKey: z.string().optional(),
  savedKey: z.string().optional(),
  baseURL: z.string().url('"base-url" must be a valid URL').optional(),
  format: z
    .enum(["table", "json", "csv"], {
      message: '"format" must be either "table", "json", or "csv"',
    })
    .optional(),
  debug: z.boolean({ message: '"debug" must be "true" or "false"' }).optional(),
});

export const GlobalOptionsSchema = BaseGlobalOptionsSchema.refine(
  (data) => !(data.apiKey && data.savedKey),
  {
    message: "Cannot specify both --api-key and --saved-key options",
    path: ["apiKey"],
  }
);

// Helper function to extend global options while preserving mutual exclusivity validation
export const extendGlobalOptions = <T extends z.ZodRawShape>(extension: T) => {
  return BaseGlobalOptionsSchema.extend(extension).refine(
    (data) => !(data.apiKey && data.savedKey),
    {
      message: "Cannot specify both --api-key and --saved-key options",
      path: ["apiKey"],
    }
  );
};

export { BaseGlobalOptionsSchema };

export function setupGlobalOptions(program: Command): void {
  program
    .option("--api-key <key>", "Actual API key for authentication")
    .option("--saved-key <name>", "Name of saved API key from config")
    .option("--base-url <url>", "Base URL for the API")
    .option("--format <format>", "Output format", "table")
    .option("--debug", "Enable debug output", false)
    .hook("preAction", (thisCommand) => {
      // Set debug mode from environment or flag
      if (thisCommand.opts().debug || process.env.MXBAI_DEBUG === "true") {
        process.env.MXBAI_DEBUG = "true";
      }
    });
}

export function addGlobalOptions(command: Command): Command {
  return command
    .option("--api-key <key>", "Actual API key for authentication")
    .option("--saved-key <name>", "Name of saved API key from config")
    .option("--base-url <url>", "Base URL for the API")
    .option("--format <format>", "Output format (table|json|csv)");
}

export function mergeCommandOptions<T>(command: Command, options: T): T {
  // Traverse up the command hierarchy to collect all options
  const allOptions: T[] = [];
  let currentCommand: Command | null = command;

  // Collect options from all parent commands up to the root
  while (currentCommand) {
    if (currentCommand.parent) {
      allOptions.unshift(currentCommand.parent.opts());
    }
    currentCommand = currentCommand.parent;
  }

  // Add the current command's options last (highest priority)
  allOptions.push(options);

  // Merge all options, with later options taking priority
  const merged = Object.assign({}, ...allOptions);

  if (process.env.MXBAI_DEBUG === "true") {
    console.log("\nCommand hierarchy options:", allOptions);
    console.log("Merged options:", merged);
  }

  return merged;
}

export function parseOptions<T>(
  schema: z.ZodSchema<T>,
  options: Record<string, unknown>
) {
  const parsed = schema.safeParse(options);

  if (!parsed.success) {
    console.error(
      chalk.red("\n✗"),
      parsed.error.issues.map((i) => i.message).join(", ")
    );
    process.exit(1);
  }

  return parsed.data;
}
