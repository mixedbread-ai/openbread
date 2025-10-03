import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";

interface UpdateCheckCache {
  lastCheck: number;
  latestVersion: string;
}

const CACHE_DIR = join(homedir(), ".config", "mxbai");
const CACHE_FILE = join(CACHE_DIR, "update-check.json");
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const REGISTRY_URL = "https://registry.npmjs.org/@mixedbread/cli/latest";
const TIMEOUT = 2000;

/**
 * Simple semantic version comparison
 * Returns true if versionA is less than versionB
 * Ignores pre-release versions (only compares major.minor.patch)
 */
function isVersionLessThan(versionA: string, versionB: string): boolean {
  const parseVersion = (v: string) => {
    const cleaned = v.replace(/^v/, "");
    const mainVersion = cleaned.split("-")[0];
    const [major, minor, patch] = mainVersion
      .split(".")
      .map((p) => parseInt(p, 10) || 0);
    return { major, minor, patch };
  };

  const a = parseVersion(versionA);
  const b = parseVersion(versionB);

  // Compare major.minor.patch
  if (a.major !== b.major) return a.major < b.major;
  if (a.minor !== b.minor) return a.minor < b.minor;
  return a.patch < b.patch;
}

async function fetchLatestVersion(): Promise<string> {
  const response = await fetch(REGISTRY_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch latest version: ${response.statusText}`);
  }

  const json = await response.json();
  return json.version;
}

function readCache(): UpdateCheckCache | null {
  if (!existsSync(CACHE_FILE)) return null;
  const data = readFileSync(CACHE_FILE, "utf-8");
  return JSON.parse(data);
}

function writeCache(cache: UpdateCheckCache): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function formatUpdateBanner(
  currentVersion: string,
  latestVersion: string
): string {
  const contentWidth = 92; // Width of actual content
  const horizontalPadding = "  "; // 2 spaces on each side

  const pad = (text: string) => {
    const stripped = stripAnsi(text);
    const padding = contentWidth - stripped.length;
    return text + " ".repeat(Math.max(0, padding));
  };

  const totalWidth = contentWidth + horizontalPadding.length * 2;
  const border = "─".repeat(totalWidth);

  return [
    `╭${border}╮`,
    `│${horizontalPadding}${pad("")}${horizontalPadding}│`,
    `│${horizontalPadding}${pad(chalk.bold(`Update available: ${chalk.red(currentVersion)} → ${chalk.green(latestVersion)}`))}${horizontalPadding}│`,
    `│${horizontalPadding}${pad("")}${horizontalPadding}│`,
    `│${horizontalPadding}${pad(`Run: ${chalk.cyan("npm install -g @mixedbread/cli@latest")}`)}${horizontalPadding}│`,
    `│${horizontalPadding}${pad("")}${horizontalPadding}│`,
    `│${horizontalPadding}${pad(`Changelog: ${chalk.gray("https://github.com/mixedbread-ai/openbread/blob/main/packages/cli/CHANGELOG.md")}`)}${horizontalPadding}│`,
    `│${horizontalPadding}${pad("")}${horizontalPadding}│`,
    `╰${border}╯`,
  ].join("\n");
}

/**
 * Strip ANSI escape codes for length calculation
 * Handles all ANSI escape sequences including color codes
 */
function stripAnsi(str: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional escape sequence for ANSI codes
  return str.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

/**
 * Check for updates and display notification if available
 * This runs asynchronously and doesn't block command execution
 */
export async function checkForUpdates(currentVersion: string): Promise<void> {
  // Skip in CI or non-TTY environments
  if (process.env.CI || !process.stdout.isTTY) {
    return;
  }

  try {
    const cache = readCache();
    const now = Date.now();

    // Check if we need to fetch fresh data
    let latestVersion: string;
    if (!cache || now - cache.lastCheck > CHECK_INTERVAL) {
      latestVersion = await fetchLatestVersion();
      writeCache({ lastCheck: now, latestVersion });
    } else {
      latestVersion = cache.latestVersion;
    }

    if (isVersionLessThan(currentVersion, latestVersion)) {
      console.log(formatUpdateBanner(currentVersion, latestVersion));
      console.log(); // Add spacing after banner
    }
  } catch {
    // Silently fail - update checks should never break the CLI
  }
}
