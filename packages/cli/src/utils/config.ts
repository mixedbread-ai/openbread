import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import chalk from "chalk";
import { z } from "zod";

export const UploadDefaultsSchema = z.object({
  strategy: z
    .enum(["fast", "high_quality"], {
      error: 'Must be "fast" or "high_quality"',
    })
    .optional(),
  parallel: z.coerce
    .number({ error: "Must be a number" })
    .int({ error: "Must be an integer" })
    .positive({ error: "Must be a positive number" })
    .max(200, { error: "Must be less than or equal to 200" })
    .optional(),
});

export const SearchDefaultsSchema = z.object({
  top_k: z.coerce
    .number({ error: "Must be a number" })
    .int({ error: "Must be an integer" })
    .positive({ error: "Must be a positive number" })
    .optional(),
  rerank: z
    .preprocess(
      (val) => {
        if (val === "true" || val === true) return true;
        if (val === "false" || val === false) return false;
        throw new Error('Must be "true" or "false"');
      },
      z.boolean({ error: 'Must be "true" or "false"' })
    )
    .optional(),
});

export const DefaultsSchema = z.object({
  upload: UploadDefaultsSchema.optional(),
  search: SearchDefaultsSchema.optional(),
  api_key: z.string().optional(),
});

export const CLIConfigSchema = z.object({
  version: z.string(),
  api_keys: z
    .record(
      z.string().min(1, "API key name cannot be empty"),
      z.string().startsWith("mxb_", 'API key must start with "mxb_"')
    )
    .optional(),
  base_url: z.url("Base URL must be a valid URL").optional(),
  defaults: DefaultsSchema.optional(),
  aliases: z.record(z.string(), z.string()).optional(),
});

export type CLIConfig = z.infer<typeof CLIConfigSchema>;

export function getConfigDir(): string {
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
      parallel: 100,
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
    const parseResult = CLIConfigSchema.safeParse(rawConfig);
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

function formatAvailableKeys(config: CLIConfig): string {
  return Object.keys(config.api_keys)
    .map((name) => {
      const isDefault = config.defaults?.api_key === name;
      return `  ${isDefault ? "*" : " "} ${name}${isDefault ? " (default)" : ""}`;
    })
    .join("\n");
}

export function getApiKey(options?: {
  apiKey?: string;
  savedKey?: string;
}): string {
  // Priority: 1. Command line flags, 2. Environment variable, 3. Config file

  // Handle --api-key (actual API key)
  if (options?.apiKey) {
    if (!isMxbaiAPIKey(options.apiKey)) {
      throw new Error(
        "Invalid API key format. API keys must start with 'mxb_'."
      );
    }
    displayApiKeyUsage(options.apiKey, "from --api-key");
    return options.apiKey;
  }

  // Handle --saved-key (key name from config)
  if (options?.savedKey) {
    const config = loadConfig();
    if (!config.api_keys?.[options.savedKey]) {
      let message = `No saved API key found with name "${options.savedKey}".`;
      if (config.api_keys && Object.keys(config.api_keys).length > 0) {
        message += `\n\nAvailable saved keys:\n${formatAvailableKeys(config)}`;
      } else {
        message += `\n\nNo saved keys found. Add one with: ${chalk.cyan("mxbai config keys add <key> <name>")}`;
      }
      throw new Error(message);
    }
    const resolvedKey = config.api_keys[options.savedKey];
    displayApiKeyUsage(resolvedKey, "from --saved-key", options.savedKey);
    return resolvedKey;
  }

  if (process.env.MXBAI_API_KEY) {
    displayApiKeyUsage(process.env.MXBAI_API_KEY, "from MXBAI_API_KEY");
    return process.env.MXBAI_API_KEY;
  }

  const config = loadConfig();

  // Check for old format and prompt for migration
  if (existsSync(CONFIG_FILE)) {
    let rawConfig: Record<string, unknown> | undefined;
    try {
      rawConfig = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    } catch {
      // If we can't read the config file, continue with normal flow
    }
    if (
      rawConfig?.api_key &&
      Object.keys(rawConfig.api_keys || {}).length === 0
    ) {
      throw new Error(
        `${chalk.yellow("Migration Required")}\n` +
          "The API key storage format has changed. Please migrate your existing API key:\n" +
          `  ${chalk.cyan("  mxbai config keys add <your-current-key> <name>")}\n\n` +
          "Your current key will not work until migrated."
      );
    }
  }

  // Get default API key from new format
  const defaultKeyName = config.defaults?.api_key;
  if (defaultKeyName && config.api_keys?.[defaultKeyName]) {
    const apiKey = config.api_keys[defaultKeyName];
    displayApiKeyUsage(apiKey, "from config", defaultKeyName);
    return apiKey;
  }

  // If no default but keys exist, show available keys
  if (config.api_keys && Object.keys(config.api_keys).length > 0) {
    throw new Error(
      "No default API key set.\n\n" +
        "Available API keys:\n" +
        formatAvailableKeys(config) +
        "\n\nSet a default API key:\n" +
        `  ${chalk.cyan("  mxbai config keys set-default <name>")}`
    );
  }

  throw new Error(
    "No API key found.\n\n" +
      "Please add an API key using:\n" +
      "  1. Command flag: --api-key <key> or --saved-key <name>\n" +
      "  2. Environment variable: export MXBAI_API_KEY=mxb_xxxxx\n" +
      "  3. Config file: mxbai config keys add <key> <name>\n\n" +
      "Get your API key at: https://www.platform.mixedbread.com/platform?next=api-keys"
  );
}

export function isMxbaiAPIKey(key: string): boolean {
  return key.startsWith("mxb_");
}

export function getBaseURL(options?: { baseUrl?: string }): string {
  return (
    options?.baseUrl || process.env.MXBAI_BASE_URL || loadConfig().base_url
  );
}

export function resolveStoreName(nameOrAlias: string): string {
  const config = loadConfig();
  return config.aliases?.[nameOrAlias] || nameOrAlias;
}

// Helper to resolve nested schema paths
function resolveSchemaPath(
  schema: z.ZodType,
  path: string[]
): z.ZodType | null {
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
    return resolveSchemaPath(schema._zod.def.valueType as z.ZodType, tail);
  }

  // Handle ZodOptional
  if (schema instanceof z.ZodOptional) {
    return resolveSchemaPath(schema._zod.def.innerType as z.ZodType, path);
  }

  return null;
}

export function parseConfigValue(key: string, value: string) {
  const pathSegments = key.split(".");

  // Try to resolve the schema for this key path
  const targetSchema = resolveSchemaPath(CLIConfigSchema, pathSegments);

  if (!targetSchema) {
    throw new Error(
      `Unknown config key: ${key}. Use 'mxbai config --help' to see available options.`
    );
  }

  const parsed = targetSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(
      `Invalid value for ${key}: ${parsed.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  return parsed.data;
}

export function outputAvailableKeys(config?: CLIConfig) {
  console.log(formatAvailableKeys(config ?? loadConfig()));
}

function truncateApiKey(apiKey: string): string {
  if (apiKey.length <= 11) return apiKey;
  return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
}

function displayApiKeyUsage(apiKey: string, source: string, keyName?: string) {
  let message = "[Using API key: ";

  if (keyName) {
    message += `${chalk.bold.cyan(keyName)} (${truncateApiKey(apiKey)}) `;
  } else {
    message += `${chalk.bold.cyan(truncateApiKey(apiKey))} `;
  }

  message += `${source}]`;
  console.log(message);
}
