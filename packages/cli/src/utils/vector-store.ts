import type { Mixedbread } from "@mixedbread/sdk";
import type {
  FileListParams,
  VectorStore,
  VectorStoreFile,
} from "@mixedbread/sdk/resources/vector-stores";
import chalk from "chalk";
import inquirer from "inquirer";
import { resolveVectorStoreName } from "./config";

export async function resolveVectorStore(
  client: Mixedbread,
  nameOrId: string,
  interactive = false
): Promise<VectorStore> {
  // First check if it's an alias
  const resolved = resolveVectorStoreName(nameOrId);

  try {
    return await client.vectorStores.retrieve(resolved);
  } catch (_error) {
    // If not found by identifier, fall through to fuzzy search
  }

  const vectorStores = await client.vectorStores.list({ limit: 100 });

  const fuzzyMatches = vectorStores.data.filter((vs) =>
    vs.name.toLowerCase().includes(resolved.toLowerCase())
  );

  if (fuzzyMatches.length === 0) {
    console.error(chalk.red("✗"), `Vector store "${nameOrId}" not found.\n`);
    console.error("Run 'mxbai vs list' to see all vector stores.");
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
        message: "Multiple vector stores found. Select one:",
        choices: fuzzyMatches.map((vs) => ({
          name: `${vs.name} (${vs.id})`,
          value: vs,
        })),
      },
    ]);
    return selected;
  } else {
    console.error(chalk.red("✗"), `Vector store "${nameOrId}" not found.\n`);
    console.log("Did you mean one of these?");
    fuzzyMatches.forEach((vs) => {
      console.log(`  • ${vs.name}`);
    });
    console.log("\nRun 'mxbai vs list' to see all vector stores.");
    process.exit(1);
  }
}

export async function getVectorStoreFiles(
  client: Mixedbread,
  vectorStoreIdentifier: string
): Promise<VectorStoreFile[]> {
  const vectorStoreFiles = [];
  const fileListParams: FileListParams = {
    limit: 100,
  };

  while (true) {
    const response = await client.vectorStores.files.list(
      vectorStoreIdentifier,
      fileListParams
    );
    if (response.data.length === 0) {
      break;
    }
    fileListParams.after = response.pagination.last_cursor;

    vectorStoreFiles.push(...response.data);
  }

  return vectorStoreFiles;
}
