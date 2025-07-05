import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import chalk from "chalk";
import { z } from "zod";

export const UploadDefaultsSchema = z.object({
  strategy: z
    .enum(["fast", "high_quality"], {
      message: 'Must be "fast" or "high_quality"',
    })
    .optional(),
  contextualization: z
    .preprocess(
      (val) => {
        if (val === "true" || val === true) return true;
        if (val === "false" || val === false) return false;
        throw new Error('Must be "true" or "false"');
      },
      z.boolean({ message: 'Must be "true" or "false"' })
    )
    .optional(),
  parallel: z.coerce
    .number({ message: "Must be a number" })
    .int({ message: "Must be an integer" })
    .positive({ message: "Must be a positive number" })
    .optional(),
});

export const SearchDefaultsSchema = z.object({
  top_k: z.coerce
    .number({ message: "Must be a number" })
    .int({ message: "Must be an integer" })
    .positive({ message: "Must be a positive number" })
    .optional(),
  rerank: z
    .preprocess(
      (val) => {
        if (val === "true" || val === true) return true;
        if (val === "false" || val === false) return false;
        throw new Error('Must be "true" or "false"');
      },
      z.boolean({ message: 'Must be "true" or "false"' })
    )
    .optional(),
});

export const DefaultsSchema = z.object({
  upload: UploadDefaultsSchema.optional(),
  search: SearchDefaultsSchema.optional(),
  api_key: z.string().optional(),
});

export const CliConfigSchema = z.object({
  version: z.string(),
  api_key: z
    .string()
    .startsWith("mxb_", 'API key must start with "mxb_"')
    .optional(),
  api_keys: z
    .record(
      z.string().min(1, "API key name cannot be empty"),
      z.string().startsWith("mxb_", 'API key must start with "mxb_"')
    )
    .optional(),
  base_url: z.string().url("Base URL must be a valid URL").optional(),
  defaults: DefaultsSchema.optional(),
  aliases: z.record(z.string(), z.string()).optional(),
});

export type CLIConfig = z.infer<typeof CliConfigSchema>;

function getConfigDir(): string {
  if (process.env.MXBAI_CONFIG_PATH) {
    return process.env.MXBAI_CONFIG_PATH;
  }

  const home = homedir();
  const os = platform();

  switch (os) {
    case "win32":
      // Windows: %APPDATA%\mixedbread
      return process.env.APPDATA
        ? join(process.env.APPDATA, "mixedbread")
        : join(home, "AppData", "Roaming", "mixedbread");

    case "darwin":
      // macOS: ~/Library/Application Support/mixedbread
      return join(home, "Library", "Application Support", "mixedbread");

    default:
      // Linux and others: ~/.config/mixedbread
      return process.env.XDG_CONFIG_HOME
        ? join(process.env.XDG_CONFIG_HOME, "mixedbread")
        : join(home, ".config", "mixedbread");
  }
}

const CONFIG_DIR = getConfigDir();
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: CLIConfig = {
  version: "1.0",
  api_keys: {},
  defaults: {
    upload: {
      strategy: "fast",
      contextualization: false,
      parallel: 5,
    },
    search: {
      top_k: 10,
      rerank: false,
    },
    api_key: null,
  },
  aliases: {},
};

export function loadConfig(): CLIConfig {
  if (!existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(CONFIG_FILE, "utf-8");
    const rawConfig = JSON.parse(content);

    // Validate with Zod
    const parseResult = CliConfigSchema.safeParse(rawConfig);
    if (parseResult.success) {
      return { ...DEFAULT_CONFIG, ...parseResult.data };
    } else {
      console.warn(
        chalk.yellow("Warning:"),
        "Invalid config file format, using defaults."
      );
      console.warn(
        chalk.gray("Validation errors:"),
        parseResult.error.issues.map((i) => i.message).join(", ")
      );
      return DEFAULT_CONFIG;
    }
  } catch (_error) {
    console.warn(
      chalk.yellow("Warning:"),
      "Failed to load config file, using defaults"
    );
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: CLIConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getApiKey(options?: { apiKey?: string }): string {
  // Priority: 1. Command line flag, 2. Environment variable, 3. Config file
  if (options?.apiKey) {
    return resolveApiKey(options.apiKey);
  }

  if (process.env.MXBAI_API_KEY) {
    return process.env.MXBAI_API_KEY;
  }

  const config = loadConfig();

  // Check for old format and prompt for migration
  if (config.api_key && Object.keys(config.api_keys).length === 0) {
    console.log(chalk.yellow("\n\n⚠  Migration Required"));
    console.log(
      "The API key storage format has changed. Please migrate your existing API key:"
    );
    console.log(
      chalk.cyan("  mxbai config keys add <your-current-key> <name>")
    );
    console.log("\nYour current key will not work until migrated.\n");
    process.exit(1);
  }

  // Get default API key from new format
  const defaultKeyName = config.defaults?.api_key;
  if (defaultKeyName && config.api_keys?.[defaultKeyName]) {
    return config.api_keys[defaultKeyName];
  }

  // If no default but keys exist, show available keys
  if (config.api_keys && Object.keys(config.api_keys).length > 0) {
    console.log(chalk.red("\n\n✗"), "No default API key set.\n");
    console.log("Available API keys:");
    outputAvailableKeys(config);
    console.log("\nSet a default API key:");
    console.log(chalk.cyan("  mxbai config keys set-default <name>\n"));
    process.exit(1);
  }

  console.log(chalk.red("\n\n✗"), "No API key found.\n");
  console.log("Please add an API key using:");
  console.log("  1. Command flag: --api-key <name>");
  console.log("  2. Environment variable: export MXBAI_API_KEY=mxb_xxxxx");
  console.log("  3. Config file: mxbai config keys add <key> <name>\n");
  console.log(
    "Get your API key at: https://www.platform.mixedbread.com/platform?next=api-keys"
  );
  process.exit(1);
}

function resolveApiKey(nameOrKey: string): string {
  const config = loadConfig();

  // If it's already a valid API key, return it
  if (nameOrKey.startsWith("mxb_")) {
    return nameOrKey;
  }

  // Otherwise, try to resolve it as a name
  if (config.api_keys?.[nameOrKey]) {
    return config.api_keys[nameOrKey];
  }

  console.log(chalk.red("✗"), `No API key found with name "${nameOrKey}"`);

  if (config.api_keys && Object.keys(config.api_keys).length > 0) {
    console.log("\nAvailable API keys:");
    outputAvailableKeys(config);
  }

  process.exit(1);
}

export function getBaseURL(options?: { baseURL?: string }): string {
  return (
    options?.baseURL || process.env.MXBAI_BASE_URL || loadConfig().base_url
  );
}

export function resolveVectorStoreName(nameOrAlias: string): string {
  const config = loadConfig();
  return config.aliases?.[nameOrAlias] || nameOrAlias;
}

// Helper to resolve nested schema paths
function resolveSchemaPath(
  schema: z.ZodSchema,
  path: string[]
): z.ZodSchema | null {
  if (path.length === 0) return schema;

  const [head, ...tail] = path;

  // Handle ZodObject
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    if (head in shape) {
      return resolveSchemaPath(shape[head], tail);
    }
  }

  // Handle ZodRecord (for dynamic keys like aliases)
  if (schema instanceof z.ZodRecord) {
    return resolveSchemaPath(schema._def.valueType, tail);
  }

  // Handle ZodOptional
  if (schema instanceof z.ZodOptional) {
    return resolveSchemaPath(schema._def.innerType, path);
  }

  return null;
}

export function parseConfigValue(key: string, value: string) {
  const pathSegments = key.split(".");

  // Try to resolve the schema for this key path
  const targetSchema = resolveSchemaPath(CliConfigSchema, pathSegments);

  if (!targetSchema) {
    console.error(
      chalk.red("Error:"),
      `Unknown config key: ${key}. Use 'mxbai config --help' to see available options.`
    );
    process.exit(1);
    return; // This won't be reached in normal execution, but helps with testing
  }

  const parsed = targetSchema.safeParse(value);

  if (!parsed.success) {
    console.error(
      chalk.red("Error:"),
      `Invalid value for ${key}:`,
      parsed.error.issues.map((i) => i.message).join(", ")
    );
    process.exit(1);
    return; // This won't be reached in normal execution, but helps with testing
  }

  return parsed.data;
}

export function outputAvailableKeys(config?: CLIConfig) {
  if (!config) {
    config = loadConfig();
  }

  Object.keys(config.api_keys).forEach((name) => {
    const isDefault = config.defaults?.api_key === name;
    console.log(
      `  ${isDefault ? "*" : " "} ${name}${isDefault ? " (default)" : ""}`
    );
  });
}
