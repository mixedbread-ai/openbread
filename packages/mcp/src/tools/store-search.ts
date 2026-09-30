import type { StoreSearchInput } from "../types/index.js";
import { getMixedbreadClient } from "../utils.js";

export async function storeSearch(args: StoreSearchInput) {
  const mxbai = getMixedbreadClient();

  try {
    const response = await mxbai.stores.search(args);

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
          text: `Error searching store: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
