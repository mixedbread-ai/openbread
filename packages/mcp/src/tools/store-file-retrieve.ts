import type { StoreFileRetrieveInput } from "../types/index.js";
import { getMixedbreadClient } from "../utils.js";

export async function storeFileRetrieve(args: StoreFileRetrieveInput) {
  const client = getMixedbreadClient();

  try {
    const response = await client.stores.files.retrieve(args.file_id, {
      store_identifier: args.store_identifier,
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
      isError: true,
    };
  }
}
