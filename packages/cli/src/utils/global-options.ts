import type { Command } from "commander";
import { z } from "zod";

export interface GlobalOptions {
  apiKey?: string;
  savedKey?: string;
  format?: "table" | "json" | "csv";
  baseUrl?: string;
  debug?: boolean;
}

const BaseGlobalOptionsSchema = z.object({
  apiKey: z.string().optional(),
  savedKey: z.string().optional(),
  baseUrl: z.url('"base-url" must be a valid URL').optional(),
  format: z
    .enum(["table", "json", "csv"], {
      error: '"format" must be either "table", "json", or "csv"',
    })
    .optional(),
  debug: z.boolean({ error: '"debug" must be "true" or "false"' }).optional(),
});

export const GlobalOptionsSchema = BaseGlobalOptionsSchema.refine(
  (data) => !(data.apiKey && data.savedKey),
  {
    error: "Cannot specify both --api-key and --saved-key options",
    path: ["apiKey"],
  }
);

// Helper function to extend global options while preserving mutual exclusivity validation
export const extendGlobalOptions = <T extends z.ZodRawShape>(extension: T) => {
  return BaseGlobalOptionsSchema.and(z.object(extension)).refine(
    (data) => !(data.apiKey && data.savedKey),
    {
      error: "Cannot specify both --api-key and --saved-key options",
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

export function parseOptions<T>(
  schema: z.ZodSchema<T>,
  options: Record<string, unknown>
) {
  const parsed = schema.safeParse(options);

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  return parsed.data;
}
