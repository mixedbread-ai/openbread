import type { VectorStoreDeleteInput } from "../types";
import { createMixedbreadClient } from "../utils";

export async function vectorStoreDelete(
  args: VectorStoreDeleteInput,
  apiKey: string
) {
  const client = createMixedbreadClient(apiKey);

  try {
    const response = await client.vectorStores.delete(
      args.vector_store_identifier
    );

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
          text: `Error deleting vector store: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}
