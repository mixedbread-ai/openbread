import type { VectorStoreRetrieveInput } from "../types";
import { createMixedbreadClient } from "../utils";

export async function vectorStoreRetrieve(
  args: VectorStoreRetrieveInput,
  apiKey: string
) {
  const client = createMixedbreadClient(apiKey);

  try {
    const response = await client.vectorStores.retrieve(
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
          text: `Error retrieving vector store: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}
