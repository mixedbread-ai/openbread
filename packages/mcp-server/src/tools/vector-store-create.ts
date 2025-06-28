import { getMixedbreadClient } from "../utils.js";
import type { VectorStoreCreateInput } from "../types/index.js";

export async function vectorStoreCreate(args: VectorStoreCreateInput) {
  const client = getMixedbreadClient();

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
      isError: true,
    };
  }
}
