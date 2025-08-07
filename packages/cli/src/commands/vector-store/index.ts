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

export function createVectorStoreCommand(): Command {
  const vsCommand = new Command("vs").description("Manage vector stores");

  // Add subcommands
  vsCommand.addCommand(createListCommand());
  vsCommand.addCommand(createCreateCommand());
  vsCommand.addCommand(createGetCommand());
  vsCommand.addCommand(createUpdateCommand());
  vsCommand.addCommand(createDeleteCommand());
  vsCommand.addCommand(createUploadCommand());
  vsCommand.addCommand(createFilesCommand());
  vsCommand.addCommand(createSearchCommand());
  vsCommand.addCommand(createQACommand());
  vsCommand.addCommand(createSyncCommand());

  // Show help without error exit code when no subcommand provided
  vsCommand.action(() => {
    vsCommand.help();
  });

  return vsCommand;
}
