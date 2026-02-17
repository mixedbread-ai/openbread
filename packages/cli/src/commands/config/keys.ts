import { cancel, confirm, isCancel, log, text } from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { z } from "zod";
import { createClient } from "../../utils/client";
import {
  clearCacheForKey,
  refreshCacheForKey,
} from "../../utils/completion-cache";
import {
  isMxbaiAPIKey,
  loadConfig,
  outputAvailableKeys,
  saveConfig,
} from "../../utils/config";
import {
  addGlobalOptions,
  BaseGlobalOptionsSchema,
  type GlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../../utils/global-options";

const RemoveKeySchema = z.object({
  name: z.string().min(1, { error: '"name" is required' }),
  yes: z.boolean().optional(),
});

export function createKeysCommand(): Command {
  const keysCommand = addGlobalOptions(
    new Command("keys").description("Manage API keys")
  );

  keysCommand
    .command("add <key> [name]")
    .description("Add a new API key")
    .action(async (key: string, name?: string, options?: GlobalOptions) => {
      const mergedOptions = mergeCommandOptions(keysCommand, options);
      const parsedOptions = parseOptions(BaseGlobalOptionsSchema, {
        ...mergedOptions,
      });

      if (!isMxbaiAPIKey(key)) {
        log.error('API key must start with "mxb_"');
        return;
      }

      const config = loadConfig();

      // Prompt for name if not provided
      if (!name) {
        const nameResult = await text({
          message: "Enter a name for this API key (e.g., 'work', 'personal'):",
          validate: (input) => {
            if (!input.trim()) return "Name cannot be empty";
            if (config.api_keys?.[input.trim()]) {
              return `API key "${input.trim()}" already exists`;
            }
          },
        });
        if (isCancel(nameResult)) {
          cancel("Operation cancelled.");
          process.exit(0);
        }
        name = nameResult.trim();
      } else {
        // Validate name if provided
        if (!name.trim()) {
          log.error("Name cannot be empty");
          return;
        }
        if (config.api_keys?.[name]) {
          log.error(`API key "${name}" already exists`);
          return;
        }
      }

      // Add the API key
      if (!config.api_keys) {
        config.api_keys = {};
      }
      config.api_keys[name] = key;

      // Set as default
      if (!config.defaults) {
        config.defaults = {};
      }
      config.defaults.api_key = name;

      saveConfig(config);

      log.success(`API key "${name}" saved and set as default`);

      // Populate completion cache for the new key
      const client = createClient({
        apiKey: key,
        baseUrl: parsedOptions.baseUrl,
      });
      refreshCacheForKey(name, client);
    });

  keysCommand
    .command("list")
    .description("List all API keys")
    .action(() => {
      const config = loadConfig();

      if (!config.api_keys || Object.keys(config.api_keys).length === 0) {
        console.log("No API keys configured");
        console.log("\nAdd an API key:");
        console.log(chalk.cyan("  mxbai config keys add <key> <name>"));
        return;
      }

      console.log("API Keys:");
      outputAvailableKeys(config);
    });

  keysCommand
    .command("remove <name>")
    .description("Remove an API key")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(async (name: string, options: { yes?: boolean }) => {
      const parsedOptions = RemoveKeySchema.parse({
        name,
        yes: options.yes,
      });

      const config = loadConfig();

      if (!config.api_keys?.[parsedOptions.name]) {
        log.error(`No API key found with name "${parsedOptions.name}"`);

        if (config.api_keys && Object.keys(config.api_keys).length > 0) {
          console.log("\nAvailable API keys:");
          outputAvailableKeys(config);
        }
        return;
      }

      const isDefault = config.defaults?.api_key === parsedOptions.name;

      // Confirm removal unless yes flag is used
      if (!parsedOptions.yes) {
        const confirmed = await confirm({
          message: `Remove API key "${parsedOptions.name}"${isDefault ? " (currently default)" : ""}?`,
          initialValue: false,
        });

        if (isCancel(confirmed) || !confirmed) {
          log.warn("Removal cancelled.");
          return;
        }
      }

      // Remove the key
      delete config.api_keys[parsedOptions.name];

      // Clear completion cache for the removed key
      clearCacheForKey(parsedOptions.name);

      // If this was the default, clear it and warn
      if (isDefault) {
        if (config.defaults) {
          delete config.defaults.api_key;
        }

        saveConfig(config);
        log.success(`API key "${parsedOptions.name}" removed`);

        log.warn("No default API key set. Set a new default:");
        if (Object.keys(config.api_keys).length > 0) {
          Object.keys(config.api_keys).forEach((keyName) => {
            console.log(`    mxbai config keys set-default ${keyName}`);
          });
        } else {
          console.log(`    mxbai config keys set-default <name>`);
        }
      } else {
        saveConfig(config);
        log.success(`API key "${parsedOptions.name}" removed`);
      }
    });

  keysCommand
    .command("set-default <name>")
    .description("Set the default API key")
    .action(async (name: string, options: GlobalOptions) => {
      const mergedOptions = mergeCommandOptions(keysCommand, options);
      const parsedOptions = parseOptions(BaseGlobalOptionsSchema, {
        ...mergedOptions,
      });

      const config = loadConfig();

      if (!config.api_keys?.[name]) {
        log.error(`No API key found with name "${name}"`);

        if (config.api_keys && Object.keys(config.api_keys).length > 0) {
          console.log("\nAvailable API keys:");
          outputAvailableKeys(config);
        }
        return;
      }

      if (!config.defaults) {
        config.defaults = {};
      }
      config.defaults.api_key = name;

      saveConfig(config);
      log.success(`"${name}" set as default API key`);

      // Refresh cache for the newly set default key
      const client = createClient({
        apiKey: config.api_keys[name],
        baseUrl: parsedOptions.baseUrl,
      });
      refreshCacheForKey(name, client);
    });

  // Show help when no subcommand provided
  keysCommand.action(() => {
    keysCommand.help();
  });

  return keysCommand;
}
