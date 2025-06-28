import { getMixedbreadClient } from "../utils.js";
import type { VectorStoreFileSearchInput } from "../types/index.js";

export async function vectorStoreFileSearch(args: VectorStoreFileSearchInput) {
  const mxbai = getMixedbreadClient();

  try {
    const searchArgs = {
      ...args,
      search_options: {
        return_chunks: true,
        return_metadata: true,
        ...args.search_options,
      },
    };

    const response = await mxbai.vectorStores.files.search(searchArgs);

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
          text: `Error searching vector store files: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
