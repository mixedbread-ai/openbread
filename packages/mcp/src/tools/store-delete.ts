import type { StoreDeleteInput } from "../types/index.js";
import { getMixedbreadClient } from "../utils.js";

export async function storeDelete(args: StoreDeleteInput) {
  const client = getMixedbreadClient();

  try {
    const response = await client.stores.delete(args.store_identifier);

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
          text: `Error deleting store: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
