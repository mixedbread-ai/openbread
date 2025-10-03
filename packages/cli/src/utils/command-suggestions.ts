import chalk from "chalk";

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function findSimilarCommands(
  input: string,
  availableCommands: string[],
  threshold = 3
): string[] {
  const suggestions = availableCommands
    .map((cmd) => ({
      command: cmd,
      distance: levenshteinDistance(input.toLowerCase(), cmd.toLowerCase()),
    }))
    .filter((item) => item.distance <= threshold)
    .sort((a, b) => a.distance - b.distance)
    .map((item) => item.command);

  return suggestions;
}

export function formatUnknownCommandError(
  unknownCommand: string,
  availableCommands: string[]
): string {
  let message = `${chalk.red("\n✗")} Unknown command: ${chalk.yellow(unknownCommand)}`;

  if (unknownCommand === "vs") {
    message += `\n\n${chalk.yellow("⚠")} ${chalk.green("vs")} command was deprecated and renamed to ${chalk.green("store")} since ${chalk.bold("v2.0.0")}.`;
    message += `\n\nSee: https://github.com/mixedbread-ai/openbread/blob/main/packages/cli/CHANGELOG.md`;
    return message;
  }

  const suggestions = findSimilarCommands(unknownCommand, availableCommands);

  if (suggestions.length > 0) {
    message += `\n\n${chalk.cyan("Did you mean one of these?")}`;
    for (const suggestion of suggestions) {
      message += `\n  ${chalk.green(suggestion)}`;
    }
  } else {
    message += `\n\n${chalk.cyan("Available commands:")}`;
    for (const cmd of availableCommands) {
      message += `\n  ${chalk.green(cmd)}`;
    }
  }

  message += `\n\n${chalk.gray("Run 'mxbai --help' for more information.")}`;

  return message;
}
