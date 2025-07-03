import path from "node:path";
import { install, log, parseEnv, uninstall } from "@pnpm/tabtab";
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

      const shell =
        (process.env.SHELL &&
          (path.basename(process.env.SHELL) as SupportedShell)) ||
        "bash";

      const words = env.line.trim().split(/\s+/);

      // Root level completions - "mxbai "
      if (words.length === 1) {
        ["config", "vs", "completion", "--help", "--version"].forEach((cmd) =>
          console.log(cmd)
        );
        return;
      }

      const lastCmd = words[1];

      // Vector store completions
      if (lastCmd === "vs" || lastCmd === "vector-store") {
        if (words.length === 2) {
          // "mxbai vs " - show vs subcommands
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
            shell
          );
        }
        if (words.length === 3 && words[2] === "files") {
          // "mxbai vs files " - show files subcommands
          return log(["list", "get", "delete"], shell);
        }
      }

      // Config completions
      if (lastCmd === "config" && words.length === 2) {
        return log(["get", "set"], shell);
      }

      // Completion completions
      if (lastCmd === "completion" && words.length === 2) {
        return log(["install", "uninstall"], shell);
      }
    });

  return completionServerCommand;
}
