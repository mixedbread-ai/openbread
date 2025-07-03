import path from "node:path";
import {
  getShellFromEnv,
  install,
  log,
  parseEnv,
  uninstall,
} from "@pnpm/tabtab";
import { Command } from "commander";

const SUPPORTED_SHELLS = ["bash", "zsh", "fish", "pwsh"] as const;
export type SupportedShell = (typeof SUPPORTED_SHELLS)[number];

export function createCompletionCommand(): Command {
  const completionCommand = new Command("completion").description(
    "Manage shell completion"
  );

  completionCommand
    .command("install")
    .description("Install shell completion")
    .action(async () => {
      const name = "mxbai";

      try {
        await install({
          name,
          completer: name,
        });
        console.log(`Shell completion installed for ${name}.`);

        try {
          const shellPath = process.env.SHELL;
          if (!shellPath) {
            throw new Error("SHELL environment variable not set");
          }

          const shell = path.basename(shellPath) as SupportedShell;

          if (!SUPPORTED_SHELLS.includes(shell)) {
            throw new Error(`Unsupported shell: ${shell}`);
          }

          switch (shell) {
            case "bash":
              console.log("Run 'source ~/.bashrc' or restart your terminal.");
              break;
            case "zsh":
              console.log("Run 'source ~/.zshrc' or restart your terminal.");
              break;
            case "fish":
              console.log(
                "Completion is ready to use (fish auto-loads completions)."
              );
              break;
            case "pwsh":
              console.log("Run '. $PROFILE' or restart your terminal.");
              break;
            default:
              console.log("Restart your terminal to activate completion.");
          }
        } catch (_error) {
          console.log(
            "Completion installed. Run one of the following or restart your terminal:"
          );
          console.log("  bash: source ~/.bashrc");
          console.log("  zsh: source ~/.zshrc");
          console.log("  fish: completion is ready to use");
          console.log("  pwsh: . $PROFILE");
        }
      } catch (error) {
        console.error("Error installing completion:", error);
        process.exit(1);
      }
    });

  completionCommand
    .command("uninstall")
    .description("Uninstall shell completion")
    .action(async () => {
      const name = "mxbai";

      try {
        await uninstall({ name });
        console.log(`Shell completion uninstalled for ${name}`);
      } catch (error) {
        console.error("Error uninstalling completion:", error);
        process.exit(1);
      }
    });

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
          ["config", "vs", "completion", "--help", "--version"],
          shell,
          console.log
        );
      }

      // Vector store completions
      if (env.prev === "vs" || env.prev === "vector-store") {
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

      // Vector store files completions
      if (env.prev === "files") {
        // Check if we're in "mxbai vs files " context
        const words = env.line.trim().split(/\s+/);
        if (
          words.length >= 3 &&
          (words[1] === "vs" || words[1] === "vector-store")
        ) {
          return log(["list", "get", "delete"], shell, console.log);
        }
      }

      // Config completions
      if (env.prev === "config") {
        return log(["get", "set"], shell, console.log);
      }

      // Completion completions
      if (env.prev === "completion") {
        return log(["install", "uninstall"], shell, console.log);
      }
    });

  return completionServerCommand;
}
