import type { VectorStoreCreateInput } from "../types";
import { createMixedbreadClient } from "../utils";

export async function vectorStoreCreate(
  args: VectorStoreCreateInput,
  apiKey: string
) {
  const client = createMixedbreadClient(apiKey);

  try {
    const response = await client.vectorStores.create(args);

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
          text: `Error creating vector store: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}
