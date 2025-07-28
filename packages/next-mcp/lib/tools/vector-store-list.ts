import type { VectorStoreListInput } from "../types";
import { createMixedbreadClient } from "../utils";

export async function vectorStoreList(
  args: VectorStoreListInput,
  apiKey: string
) {
  const client = createMixedbreadClient(apiKey);

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
    };
  }
}
