import type { StoreRetrieveInput } from "../types/index.js";
import { getMixedbreadClient } from "../utils.js";

export async function storeRetrieve(args: StoreRetrieveInput) {
  const client = getMixedbreadClient();

  try {
    const response = await client.stores.retrieve(args.store_identifier);

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
          text: `Error retrieving store: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
