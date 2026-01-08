import chalk from "chalk";

export function warnContextualizationDeprecated(source: string): void {
  console.warn(
    chalk.yellow(
      [
        `⚠ "--contextualization" is deprecated and ignored (${source}).`,
        "Contextualization is now configured at the store level.",
      ].join(" ")
    )
  );
}