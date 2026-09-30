import type { StoreListInput } from "../types/index.js";
import { getMixedbreadClient } from "../utils.js";

export async function storeList(args: StoreListInput) {
  const client = getMixedbreadClient();

  try {
    const page = await client.stores.list(args);
    const response = { data: page.data, pagination: page.pagination };

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
          text: `Error listing stores: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
