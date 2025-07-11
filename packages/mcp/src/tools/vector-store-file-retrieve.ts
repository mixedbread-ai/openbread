import type { VectorStoreFileRetrieveInput } from "../types/index.js";
import { getMixedbreadClient } from "../utils.js";

export async function vectorStoreFileRetrieve(
  args: VectorStoreFileRetrieveInput
) {
  const client = getMixedbreadClient();

  try {
    const response = await client.vectorStores.files.retrieve(args.file_id, {
      vector_store_identifier: args.vector_store_identifier,
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
      isError: true,
    };
  }
}
