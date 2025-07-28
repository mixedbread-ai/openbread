import type { VectorStoreSearchInput } from "../types";
import { createMixedbreadClient } from "../utils";

export async function vectorStoreSearch(
  args: VectorStoreSearchInput,
  apiKey: string
) {
  const mxbai = createMixedbreadClient(apiKey);

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
    };
  }
}
