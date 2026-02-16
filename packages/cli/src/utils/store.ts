import { isCancel, select } from "@clack/prompts";
import type { Mixedbread } from "@mixedbread/sdk";
import type {
  FileListParams,
  Store,
  StoreFile,
} from "@mixedbread/sdk/resources/stores";
import { resolveStoreName } from "./config";

export async function resolveStore(
  client: Mixedbread,
  nameOrId: string,
  interactive = false
): Promise<Store> {
  // First check if it's an alias
  const resolved = resolveStoreName(nameOrId);

  try {
    return await client.stores.retrieve(resolved);
  } catch (_error) {
    // If not found by identifier, fall through to fuzzy search
  }

  const stores = await client.stores.list({ limit: 100 });

  const fuzzyMatches = stores.data.filter((store) =>
    store.name.toLowerCase().includes(resolved.toLowerCase())
  );

  if (fuzzyMatches.length === 0) {
    throw new Error(
      `Store "${nameOrId}" not found.\nRun 'mxbai store list' to see all stores.`
    );
  }

  if (fuzzyMatches.length === 1) {
    return fuzzyMatches[0];
  }

  // Multiple fuzzy matches
  if (interactive) {
    const selected = await select({
      message: "Multiple stores found. Select one:",
      options: fuzzyMatches.map((store) => ({
        value: store,
        label: `${store.name} (${store.id})`,
      })),
    });
    if (isCancel(selected)) {
      throw new Error("Operation cancelled.");
    }
    return selected as Store;
  } else {
    const suggestions = fuzzyMatches
      .map((store) => `  • ${store.name}`)
      .join("\n");
    throw new Error(
      `Store "${nameOrId}" not found.\nDid you mean one of these?\n${suggestions}\n\nRun 'mxbai store list' to see all stores.`
    );
  }
}

export function parsePublicFlag(value?: boolean | string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const lower = value.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  throw new Error(`Invalid value for --public: "${value}". Use true or false.`);
}

export function buildStoreConfig(
  contextualization?: boolean | string
): { contextualization: boolean | { with_metadata: string[] } } | undefined {
  if (contextualization === undefined) {
    return undefined;
  }
  if (typeof contextualization === "string") {
    const fields = contextualization
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
    if (fields.length === 0) {
      throw new Error(
        `Invalid value for --contextualization: "${contextualization}". Use a comma-separated list of metadata fields.`
      );
    }
    return { contextualization: { with_metadata: fields } };
  }
  return { contextualization: true };
}

export async function getStoreFiles(
  client: Mixedbread,
  storeIdentifier: string
): Promise<StoreFile[]> {
  const storeFiles = [];
  const fileListParams: FileListParams = {
    limit: 100,
  };

  while (true) {
    const response = await client.stores.files.list(
      storeIdentifier,
      fileListParams
    );
    if (response.data.length === 0) {
      break;
    }
    fileListParams.after = response.pagination.last_cursor;

    storeFiles.push(...response.data);
  }

  return storeFiles;
}
