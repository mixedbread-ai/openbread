import { Command } from "commander";
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

  // Show help without error exit code when no subcommand provided
  storeCommand.action(() => {
    storeCommand.help();
  });

  return storeCommand;
}
