import { Command } from "commander";
import { formatUnknownCommandError } from "../../utils/command-suggestions";
import { createCreateCommand } from "./create";
import { createDeleteCommand } from "./delete";
import { createFilesCommand } from "./files";
import { createGetCommand } from "./get";
import { createListCommand } from "./list";
import { createQACommand } from "./qa";
import { createSearchCommand } from "./search";
import { createSyncCommand } from "./sync";
import { createUpdateCommand } from "./update";
import { createUploadCommand } from "./upload";

export function createStoreCommand(): Command {
  const storeCommand = new Command("store").description("Manage stores");

  storeCommand.showHelpAfterError();

  // Add subcommands
  storeCommand.addCommand(createListCommand());
  storeCommand.addCommand(createCreateCommand());
  storeCommand.addCommand(createGetCommand());
  storeCommand.addCommand(createUpdateCommand());
  storeCommand.addCommand(createDeleteCommand());
  storeCommand.addCommand(createUploadCommand());
  storeCommand.addCommand(createFilesCommand());
  storeCommand.addCommand(createSearchCommand());
  storeCommand.addCommand(createQACommand());
  storeCommand.addCommand(createSyncCommand());

  // Handle unknown subcommands
  storeCommand.on("command:*", () => {
    const unknownCommand = storeCommand.args[0];
    const availableCommands = storeCommand.commands.map((cmd) => cmd.name());
    console.error(formatUnknownCommandError(unknownCommand, availableCommands));
    process.exit(1);
  });

  return storeCommand;
}
