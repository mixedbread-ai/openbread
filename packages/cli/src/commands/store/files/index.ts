import { Command } from "commander";
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

  // Add subcommands
  filesCommand.addCommand(createListCommand());
  filesCommand.addCommand(createGetCommand());
  filesCommand.addCommand(createDeleteCommand());

  filesCommand.action(() => {
    filesCommand.help();
  });

  return filesCommand;
}
