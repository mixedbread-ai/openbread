import { readFileSync } from "node:fs";
import { normalize, relative } from "node:path";
import equal from "fast-deep-equal";
import { parse } from "yaml";
import type { FileSyncMetadata } from "./sync-state";

type SyncMetadataFields = keyof FileSyncMetadata;

const SYNC_METADATA_FIELDS = new Set<SyncMetadataFields>([
  "file_path",
  "file_hash",
  "git_commit",
  "git_branch",
  "uploaded_at",
  "synced",
]);

/**
 * Normalize a file path for consistent metadata map lookups across platforms
 * Converts absolute path to relative-to-CWD and removes leading ./
 */
export function normalizePathForMetadata(filePath: string): string {
  const relativePath = relative(process.cwd(), filePath);
  return normalize(relativePath).replace(/^\.[\\/]/, "");
}

/**
 * Load metadata mapping from JSON/YAML file
 * Returns a Map with paths normalized relative to CWD
 *
 * Paths in the metadata file should be relative to CWD.
 * They will be normalized to ensure consistent lookups across platforms.
 */
export function loadMetadataMapping(
  filePath: string
): Map<string, Record<string, unknown>> {
  const content = readFileSync(filePath, "utf-8");

  // Try JSON first, then YAML
  let data: Record<string, Record<string, unknown>>;
  try {
    data = JSON.parse(content);
  } catch {
    try {
      data = parse(content);
    } catch {
      throw new Error(
        "Metadata file must be valid JSON or YAML and contain an object"
      );
    }
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(
      "Metadata file must contain an object mapping paths to metadata"
    );
  }

  const map = new Map<string, Record<string, unknown>>();
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(
        `Metadata for "${key}" must be an object, got ${typeof value}`
      );
    }

    // Normalize path and remove leading ./
    const normalizedKey = normalize(key).replace(/^\.[\\/]/, "");

    map.set(normalizedKey, value);
  }

  return map;
}

/**
 * Extract user-provided metadata by removing sync-specific fields
 */
export function extractUserMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const userMetadata: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (!SYNC_METADATA_FIELDS.has(key as SyncMetadataFields)) {
      userMetadata[key] = value;
    }
  }

  return userMetadata;
}

/**
 * Deep equality check for metadata objects
 * Uses fast-deep-equal for reliable comparison including edge cases like:
 * - Date objects
 * - undefined values
 * - NaN, Infinity
 * - Nested objects and arrays
 */
export function metadataEquals(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  return equal(a, b);
}
