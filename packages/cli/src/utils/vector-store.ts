import type { Mixedbread } from "@mixedbread/sdk";
import type {
  FileListParams,
  Store,
  StoreFile,
} from "@mixedbread/sdk/resources/stores";
import chalk from "chalk";
import inquirer from "inquirer";
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
    console.error(chalk.red("✗"), `Store "${nameOrId}" not found.\n`);
    console.error("Run 'mxbai store list' to see all stores.");
    process.exit(1);
  }

  if (fuzzyMatches.length === 1) {
    return fuzzyMatches[0];
  }

  // Multiple fuzzy matches
  if (interactive) {
    const { selected } = await inquirer.prompt([
      {
        type: "list",
        name: "selected",
        message: "Multiple stores found. Select one:",
        choices: fuzzyMatches.map((store) => ({
          name: `${store.name} (${store.id})`,
          value: store,
        })),
      },
    ]);
    return selected;
  } else {
    console.error(chalk.red("✗"), `Store "${nameOrId}" not found.\n`);
    console.log("Did you mean one of these?");
    fuzzyMatches.forEach((store) => {
      console.log(`  • ${store.name}`);
    });
    console.log("\nRun 'mxbai store list' to see all stores.");
    process.exit(1);
  }
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
