import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { Mixedbread } from "@mixedbread/sdk";
import { createClient } from "./client";
import { getConfigDir, loadConfig } from "./config";

interface CompletionCache {
  version: string;
  stores: Record<string, string[]>;
}

const CACHE_VERSION = "1.0";
const MAX_STORES = 50;

const CACHE_FILE = join(getConfigDir(), "completion-cache.json");

function loadCache(): CompletionCache {
  try {
    if (existsSync(CACHE_FILE)) {
      const data = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
      if (data.version === CACHE_VERSION) {
        return data;
      }
    }
  } catch {
    // Silent fail - return empty cache
  }

  return {
    version: CACHE_VERSION,
    stores: {},
  };
}

function saveCache(cache: CompletionCache): void {
  try {
    const configDir = getConfigDir();
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    // Atomic write: write to temp file, then rename
    const tempFile = `${CACHE_FILE}.${randomBytes(6).toString("hex")}.tmp`;
    writeFileSync(tempFile, JSON.stringify(cache, null, 2));
    renameSync(tempFile, CACHE_FILE);
  } catch {
    try {
      // Clean up temp file if it exists
      const tempFiles = readdirSync(getConfigDir()).filter(
        (f: string) =>
          f.startsWith("completion-cache.json.") && f.endsWith(".tmp")
      );
      tempFiles.forEach((f: string) => {
        unlinkSync(join(getConfigDir(), f));
      });
    } catch {
      // Ignore cleanup errors
    }
  }
}

export function getCurrentKeyName(): string | null {
  const config = loadConfig();
  const defaultKeyName = config.defaults?.api_key;

  if (!defaultKeyName) {
    return null;
  }

  // Validate that the key still exists
  if (!config.api_keys?.[defaultKeyName]) {
    return null;
  }

  return defaultKeyName;
}

export function getStoresForCompletion(keyName: string): string[] {
  const cache = loadCache();
  return cache.stores[keyName] || [];
}

export async function refreshCacheForKey(
  keyName: string,
  client: Mixedbread
): Promise<void> {
  try {
    const response = await client.stores.list({
      limit: MAX_STORES,
    });

    const storeNames = response.data.map((store) => store.name);

    const cache = loadCache();
    cache.stores[keyName] = storeNames;
    saveCache(cache);
  } catch {
    // Keep existing cache on error
  }
}

export async function refreshAllCaches(options: {
  baseUrl?: string;
}): Promise<void> {
  const config = loadConfig();

  if (!config.api_keys) {
    throw new Error("No API keys found");
  }

  for (const keyName of Object.keys(config.api_keys)) {
    const client = createClient({
      apiKey: config.api_keys[keyName],
      baseUrl: options.baseUrl,
    });

    await refreshCacheForKey(keyName, client);
  }
}

export function updateCacheAfterCreate(
  keyName: string,
  storeName: string
): void {
  const cache = loadCache();
  if (!cache.stores[keyName]) {
    cache.stores[keyName] = [];
  }

  if (
    !cache.stores[keyName].includes(storeName) &&
    cache.stores[keyName].length < MAX_STORES
  ) {
    // Add if not already present and under limit
    cache.stores[keyName].push(storeName);
    saveCache(cache);
  }
}

export function updateCacheAfterUpdate(
  keyName: string,
  oldName: string,
  newName: string
): void {
  const cache = loadCache();
  if (!cache.stores[keyName]) {
    return;
  }

  const index = cache.stores[keyName].indexOf(oldName);
  if (index !== -1) {
    cache.stores[keyName][index] = newName;
    saveCache(cache);
  }
}

export function updateCacheAfterDelete(
  keyName: string,
  storeName: string
): void {
  const cache = loadCache();
  if (!cache.stores[keyName]) {
    return;
  }

  const index = cache.stores[keyName].indexOf(storeName);
  if (index !== -1) {
    cache.stores[keyName].splice(index, 1);
    saveCache(cache);
  }
}

export function clearCacheForKey(keyName: string): void {
  const cache = loadCache();
  if (cache.stores[keyName]) {
    delete cache.stores[keyName];
    saveCache(cache);
  }
}
