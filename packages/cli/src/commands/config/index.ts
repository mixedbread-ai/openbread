import { Command } from "commander";
import { formatUnknownCommandError } from "../../utils/command-suggestions";
import { createGetCommand } from "./get";
import { createKeysCommand } from "./keys";
import { createSetCommand } from "./set";

export function createConfigCommand(): Command {
  const configCommand = new Command("config").description(
    "Manage CLI configuration"
  );

  configCommand.showHelpAfterError();

  configCommand.addCommand(createSetCommand());
  configCommand.addCommand(createGetCommand());
  configCommand.addCommand(createKeysCommand());

  // Handle unknown subcommands
  configCommand.on("command:*", () => {
    const unknownCommand = configCommand.args[0];
    const availableCommands = configCommand.commands.map((cmd) => cmd.name());
    console.error(formatUnknownCommandError(unknownCommand, availableCommands));
    process.exit(1);
  });

  return configCommand;
}
