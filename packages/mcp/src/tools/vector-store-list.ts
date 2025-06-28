import { getMixedbreadClient } from "../utils.js";
import type { VectorStoreListInput } from "../types/index.js";

export async function vectorStoreList(args: VectorStoreListInput) {
  const client = getMixedbreadClient();

  try {
    const response = await client.vectorStores.list(args);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error listing vector stores: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
