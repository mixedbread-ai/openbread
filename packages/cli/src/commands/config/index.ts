import { Command } from "commander";
import { createGetCommand } from "./get";
import { createKeysCommand } from "./keys";
import { createSetCommand } from "./set";

export function createConfigCommand(): Command {
  const configCommand = new Command("config").description(
    "Manage CLI configuration"
  );

  configCommand.addCommand(createSetCommand());
  configCommand.addCommand(createGetCommand());
  configCommand.addCommand(createKeysCommand());

  // Show help without error exit code when no subcommand provided
  configCommand.action(() => {
    configCommand.help();
  });

  return configCommand;
}
