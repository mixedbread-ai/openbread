import path from "node:path";
import {
  getShellFromEnv,
  install,
  log,
  parseEnv,
  uninstall,
} from "@pnpm/tabtab";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import {
  getCurrentKeyName,
  getStoresForCompletion,
  refreshAllCaches,
} from "../utils/completion-cache";
import {
  addGlobalOptions,
  BaseGlobalOptionsSchema,
  type GlobalOptions,
  mergeCommandOptions,
  parseOptions,
} from "../utils/global-options";

const SUPPORTED_SHELLS = ["bash", "zsh", "fish", "pwsh"] as const;
export type SupportedShell = (typeof SUPPORTED_SHELLS)[number];

function getShellInfo(options: { shell?: string }) {
  let shell: SupportedShell | null = null;
  let installMethod = "";

  if (options.shell) {
    // Check if shell was manually specified
    if (SUPPORTED_SHELLS.includes(options.shell as SupportedShell)) {
      shell = options.shell as SupportedShell;
      installMethod = "manual";
    } else {
      console.error(chalk.red("✗"), `Unsupported shell '${options.shell}'`);
      console.error(
        chalk.gray(`Supported shells: ${SUPPORTED_SHELLS.join(", ")}`)
      );
      process.exit(1);
    }
  } else {
    // Try to auto-detect shell
    const shellPath = process.env.SHELL;
    const detectedShell = shellPath ? path.basename(shellPath) : null;
    const isValidShell =
      detectedShell &&
      SUPPORTED_SHELLS.includes(detectedShell as SupportedShell);

    if (isValidShell) {
      shell = detectedShell as SupportedShell;
      installMethod = "auto-detected";
    }
  }

  return { shell, installMethod };
}

export function createCompletionCommand(): Command {
  const completionCommand = new Command("completion").description(
    "Manage shell completion"
  );

  completionCommand
    .command("install")
    .description("Install shell completion")
    .option(
      "--shell <shell>",
      `Shell to install completion for (${SUPPORTED_SHELLS.join(", ")})`
    )
    .action(async (options: { shell?: string }) => {
      const name = "mxbai";

      try {
        const { shell, installMethod } = getShellInfo(options);

        if (shell) {
          // Install with known shell
          await install({
            name,
            completer: name,
            shell,
          });

          console.log(
            chalk.green("✓"),
            `Shell completion installed for ${chalk.bold(name)} ${chalk.cyan(`(${shell}${installMethod === "auto-detected" ? " - auto-detected" : ""})`)}.`
          );

          // Show shell-specific instructions
          switch (shell) {
            case "bash":
              console.log(
                "→ Run",
                chalk.cyan("'source ~/.bashrc'"),
                "or restart your terminal."
              );
              break;
            case "zsh":
              console.log(
                "→ Run",
                chalk.cyan("'source ~/.zshrc'"),
                "or restart your terminal."
              );
              break;
            case "fish":
              console.log(
                "→ Completion is ready to use (fish auto-loads completions)."
              );
              break;
            case "pwsh":
              console.log(
                "→ Run",
                chalk.cyan("'. $PROFILE'"),
                "or restart your terminal."
              );
              break;
          }
        } else {
          // Could not auto-detect - let tabtab prompt
          console.log(
            chalk.yellow(
              "⚠ Could not auto-detect shell. Please select your shell:"
            )
          );

          await install({
            name,
            completer: name,
          });

          console.log(
            chalk.green("✓"),
            `Shell completion installed for ${chalk.bold(name)}.`
          );
          console.log(
            "→ Reload your shell configuration or restart your terminal."
          );
        }
      } catch (error) {
        console.error(chalk.red("✗"), "Error installing completion:", error);
      }
    });

  completionCommand
    .command("uninstall")
    .description("Uninstall shell completion")
    .action(async () => {
      const name = "mxbai";

      try {
        await uninstall({ name });
        console.log(
          chalk.green("✓"),
          `Shell completion uninstalled for ${chalk.bold(name)}`
        );
      } catch (error) {
        console.error(chalk.red("✗"), "Error uninstalling completion:", error);
      }
    });

  const refreshCommand = addGlobalOptions(
    new Command("refresh").description(
      "Refresh completion cache for all API keys"
    )
  );

  refreshCommand.action(async (options: GlobalOptions) => {
    const mergedOptions = mergeCommandOptions(refreshCommand, options);
    const parsedOptions = parseOptions(BaseGlobalOptionsSchema, {
      ...mergedOptions,
    });
    const spinner = ora("Refreshing completion cache...").start();

    try {
      await refreshAllCaches(parsedOptions);
      spinner.succeed("Completion cache refreshed successfully");
    } catch (error) {
      spinner.fail("Failed to refresh completion cache");
      if (error instanceof Error) {
        console.error(chalk.red("✗"), error.message);
      }
    }
  });

  completionCommand.addCommand(refreshCommand);

  // Show help without error exit code when no subcommand provided
  completionCommand.action(() => {
    completionCommand.help();
  });

  return completionCommand;
}

export function createCompletionServerCommand(): Command {
  const completionServerCommand = new Command("completion-server")
    .description("Internal completion server")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .argument("[args...]", "Completion arguments")
    .action(() => {
      const env = parseEnv(process.env);

      if (!env.complete) {
        return;
      }

      const shell = getShellFromEnv(process.env);

      // Root level completions - "mxbai " (when no previous command)
      if (env.words === 1) {
        return log(
          ["config", "store", "completion", "--help", "--version"],
          shell,
          console.log
        );
      }

      // Store name completions
      const STORE_NAME_COMMANDS = [
        "get",
        "delete",
        "update",
        "sync",
        "upload",
        "search",
        "qa",
      ];

      if (STORE_NAME_COMMANDS.includes(env.prev)) {
        const words = env.line.trim().split(/\s+/);
        // Check if previous word is "store"
        if (words.length >= 3 && words[words.length - 2] === "store") {
          const keyName = getCurrentKeyName();
          if (keyName) {
            const stores = getStoresForCompletion(keyName);
            if (stores.length > 0) {
              return log(stores, shell, console.log);
            }
          }
        }
      }

      // Store completions
      if (env.prev === "store") {
        return log(
          [
            "create",
            "delete",
            "get",
            "list",
            "update",
            "upload",
            "search",
            "qa",
            "sync",
            "files",
          ],
          shell,
          console.log
        );
      }

      // Store files completions
      if (env.prev === "files") {
        // Check if we're in "mxbai store files " context
        const words = env.line.trim().split(/\s+/);
        if (words.length >= 3 && words[1] === "store") {
          return log(["list", "get", "delete"], shell, console.log);
        }
      }

      // Store name completions for files subcommands
      const FILES_SUBCOMMANDS = ["list", "get", "delete"];
      if (FILES_SUBCOMMANDS.includes(env.prev)) {
        const words = env.line.trim().split(/\s+/);
        // Check for "mxbai store files [subcommand] " context
        if (
          words.length >= 4 &&
          words[1] === "store" &&
          words[2] === "files" &&
          FILES_SUBCOMMANDS.includes(words[3])
        ) {
          const keyName = getCurrentKeyName();
          if (keyName) {
            const stores = getStoresForCompletion(keyName);
            if (stores.length > 0) {
              return log(stores, shell, console.log);
            }
          }
        }
      }

      // Config completions
      if (env.prev === "config") {
        return log(["get", "set", "keys"], shell, console.log);
      }

      if (env.prev === "keys") {
        // Check if we're in "mxbai config keys " context
        const words = env.line.trim().split(/\s+/);
        if (words.length >= 3 && words[1] === "config") {
          return log(
            ["list", "add", "remove", "set-default"],
            shell,
            console.log
          );
        }
      }

      // Completion completions
      if (env.prev === "completion") {
        return log(["install", "uninstall", "refresh"], shell, console.log);
      }
    });

  return completionServerCommand;
}
