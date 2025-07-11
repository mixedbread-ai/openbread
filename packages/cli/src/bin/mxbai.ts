#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { Command } from "commander";

// Find package.json relative to the compiled file location
// In the published package, from bin/mxbai.js, package.json is one level up
let version = "0.0.0";
try {
  // First try one level up (for published package)
  const packageJsonPath = join(__dirname, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  version = packageJson.version;
} catch (_error) {
  try {
    // Fallback to two levels up (for development/build environment)
    const packageJsonPath = join(__dirname, "..", "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    version = packageJson.version;
  } catch (_error2) {
    // Final fallback if package.json is not found
    console.warn(
      "Warning: Could not read package.json for version information"
    );
  }
}

import {
  createCompletionCommand,
  createCompletionServerCommand,
} from "../commands/completion";
import { createConfigCommand } from "../commands/config";
import { createVectorStoreCommand } from "../commands/vector-store";
import { setupGlobalOptions } from "../utils/global-options";

const program = new Command();

program
  .name("mxbai")
  .description("CLI tool for managing the Mixedbread platform.")
  .version(version)
  .allowExcessArguments(false);

setupGlobalOptions(program);

// Add commands
program.addCommand(createVectorStoreCommand());
program.addCommand(createConfigCommand());
program.addCommand(createCompletionCommand());
program.addCommand(createCompletionServerCommand());

// Show help without error exit code when no command provided
program.action(() => {
  program.help();
});

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
  console.error(
    chalk.red("\n✗"),
    `Unknown command: ${program.args.join(" ")}\n`
  );
  program.help();
});

// Parse arguments
async function main() {
  try {
    await program.parseAsync(process.argv);
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
