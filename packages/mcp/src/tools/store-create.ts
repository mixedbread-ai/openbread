import type { StoreCreateInput } from "../types/index.js";
import { getMixedbreadClient } from "../utils.js";

export async function storeCreate(args: StoreCreateInput) {
  const client = getMixedbreadClient();

  try {
    const response = await client.stores.create(args);

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
          text: `Error creating store: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
