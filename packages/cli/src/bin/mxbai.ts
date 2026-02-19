#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import {
  createCompletionCommand,
  createCompletionServerCommand,
} from "../commands/completion";
import { createConfigCommand } from "../commands/config";
import { createStoreCommand } from "../commands/store";
import { formatUnknownCommandError } from "../utils/command-suggestions";
import { setupGlobalOptions } from "../utils/global-options";
import { checkForUpdates } from "../utils/update-checker";

// Find package.json relative to the compiled file location
const VERSION_PATHS = [
  join(__dirname, "..", "package.json"),
  join(__dirname, "..", "..", "package.json"),
];
let version = "0.0.0";
for (const pkgPath of VERSION_PATHS) {
  try {
    version = JSON.parse(readFileSync(pkgPath, "utf-8")).version;
    break;
  } catch {}
}
if (version === "0.0.0") {
  console.warn("Warning: Could not read package.json for version information");
}

const program = new Command();

program
  .name("mxbai")
  .description("CLI tool for managing the Mixedbread platform.")
  .version(version);

setupGlobalOptions(program);

// Configure command handling
program.showHelpAfterError();

// Add commands
program.addCommand(createStoreCommand());
program.addCommand(createConfigCommand());
program.addCommand(createCompletionCommand());
program.addCommand(createCompletionServerCommand());

// Global error handling
program.on("error", (error: Error) => {
  console.error(chalk.red("\n✗"), error.message);
  if (process.env.MXBAI_DEBUG === "true") {
    console.error(chalk.gray(error.stack));
  }
  process.exit(1);
});

// Handle unknown commands
program.on("command:*", () => {
  const unknownCommand = program.args[0];
  const availableCommands = program.commands
    .map((cmd) => cmd.name())
    .filter((name) => name !== "completion-server");
  console.error(formatUnknownCommandError(unknownCommand, availableCommands));
  process.exit(1);
});

// Parse arguments
async function main() {
  try {
    const updateCheck = checkForUpdates(version);

    // Show help if no arguments provided
    if (process.argv.length === 2) {
      program.help();
    }

    await program.parseAsync(process.argv);

    const banner = await updateCheck;
    if (banner) {
      console.error(banner);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("\n✗"), error.message);
      if (process.env.MXBAI_DEBUG === "true") {
        console.error(chalk.gray(error.stack));
      }
    }
    process.exit(1);
  }
}

main();
