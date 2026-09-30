import { BadRequestError, InternalServerError } from "./errors";
import { mxbai } from "./mxbai";
import type { Result, SearchMetadata, TransformFunc } from "./types";
import { SearchQuerySchema } from "./validations";

export async function search(
  rawParams: Record<string, unknown>,
  transform?: TransformFunc
): Promise<Result[]> {
  if (!process.env.MXBAI_API_KEY || !process.env.STORE_ID) {
    throw new InternalServerError("Environment setup failed");
  }

  // Validate parameters
  const validation = SearchQuerySchema.safeParse(rawParams);

  if (!validation.success) {
    throw new BadRequestError("Invalid request parameters");
  }

  const data = validation.data;

  const { query, topK } = data;

  const res = await mxbai.stores.search({
    query,
    store_identifiers: [process.env.STORE_ID],
    top_k: topK,
    search_options: {
      return_metadata: true,
    },
  });

  // Chunks come back best-first, so the first one per file is its best match
  const files = res.data.filter(
    (item, index) =>
      res.data.findIndex((other) => other.file_id === item.file_id) === index
  );

  if (transform) {
    return transform(files);
  }

  const results = files.map((item) => {
    const metadata = item.metadata as SearchMetadata;
    return {
      id: item.file_id,
      url: metadata?.url || "#",
      title: metadata?.title || "Untitled",
      tag: metadata?.tag || "all",
      breadcrumb: metadata?.breadcrumb || [],
    };
  });

  return results;
}
