import type { VectorStoreSearchInput } from "../types/index.js";
import { getMixedbreadClient } from "../utils.js";

export async function vectorStoreSearch(args: VectorStoreSearchInput) {
  const mxbai = getMixedbreadClient();

  try {
    const response = await mxbai.vectorStores.search(args);

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
          text: `Error searching vector store: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
