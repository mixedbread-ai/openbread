import type { VectorStoreFileRetrieveInput } from "../types";
import { createMixedbreadClient } from "../utils";

export async function vectorStoreFileRetrieve(
  args: VectorStoreFileRetrieveInput,
  apiKey: string
) {
  const client = createMixedbreadClient(apiKey);

  try {
    const response = await client.vectorStores.files.retrieve(args.file_id, {
      vector_store_identifier: args.vector_store_identifier,
      return_chunks: args.return_chunks ?? true,
    });

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
          text: `Error retrieving file: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}
