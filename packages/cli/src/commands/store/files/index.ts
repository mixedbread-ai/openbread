import { Command } from "commander";
import { formatUnknownCommandError } from "../../../utils/command-suggestions";
import type { GlobalOptions } from "../../../utils/global-options";
import { createDeleteCommand } from "./delete";
import { createGetCommand } from "./get";
import { createListCommand } from "./list";

export interface FilesOptions extends GlobalOptions {
  status?: "all" | "completed" | "in_progress" | "failed";
  limit?: number;
}

export function createFilesCommand(): Command {
  const filesCommand = new Command("files").description(
    "Manage files in stores"
  );

  filesCommand.showHelpAfterError();

  // Add subcommands
  filesCommand.addCommand(createListCommand());
  filesCommand.addCommand(createGetCommand());
  filesCommand.addCommand(createDeleteCommand());

  // Handle unknown subcommands
  filesCommand.on("command:*", () => {
    const unknownCommand = filesCommand.args[0];
    const availableCommands = filesCommand.commands.map((cmd) => cmd.name());
    console.error(formatUnknownCommandError(unknownCommand, availableCommands));
    process.exit(1);
  });

  return filesCommand;
}
