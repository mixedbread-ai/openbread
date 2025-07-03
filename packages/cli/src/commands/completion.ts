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

function getShellInfo(options: { shell?: string }) {
  let shell: SupportedShell | null = null;
  let installMethod = "";

  if (options.shell) {
    // Check if shell was manually specified
    if (SUPPORTED_SHELLS.includes(options.shell as SupportedShell)) {
      shell = options.shell as SupportedShell;
      installMethod = "manual";
    } else {
      console.error(`Error: Unsupported shell '${options.shell}'.`);
      console.error(`Supported shells: ${SUPPORTED_SHELLS.join(", ")}`);
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
            `Shell completion installed for ${name} (${shell}${installMethod === "auto-detected" ? " - auto-detected" : ""}).`
          );

          // Show shell-specific instructions
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
          }
        } else {
          // Could not auto-detect - let tabtab prompt
          await install({
            name,
            completer: name,
          });

          console.log(`Shell completion installed for ${name}.`);
          console.log(
            "Reload your shell configuration or restart your terminal."
          );
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
