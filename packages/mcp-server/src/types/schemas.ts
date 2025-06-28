import { z } from "zod";

// Vector Store Search Schema
export const VectorStoreSearchSchema = z.object({
  query: z.string().describe("The search query text"),
  vector_store_identifiers: z
    .array(z.string().min(1))
    .min(1)
    .describe("Array of vector store identifiers to search in"),
  top_k: z
    .number()
    .int()
    .positive()
    .default(5)
    .describe("Number of top results to return"),
  filters: z
    .any()
    .optional()
    .describe("Optional filters to apply to the search"),
  file_ids: z
    .array(z.string())
    .optional()
    .describe("Optional file IDs to search within"),
  search_options: z
    .any()
    .optional()
    .describe("Additional search configuration options"),
});

// Vector Store File Search Schema
export const VectorStoreFileSearchSchema = z.object({
  query: z.string().describe("The search query text"),
  vector_store_identifiers: z
    .array(z.string().min(1))
    .min(1)
    .describe("Array of vector store identifiers to search in"),
  top_k: z
    .number()
    .int()
    .positive()
    .default(5)
    .describe("Number of top results to return"),
  filters: z
    .any()
    .optional()
    .describe("Optional filters to apply to the search"),
  file_ids: z
    .array(z.string())
    .optional()
    .describe("Optional file IDs to search within"),
  search_options: z
    .object({
      return_metadata: z
        .boolean()
        .optional()
        .describe("Whether to return metadata with results"),
      return_chunks: z
        .boolean()
        .default(true)
        .describe("Whether to return chunks within files"),
      chunks_per_file: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Number of chunks to return per file"),
      rerank: z.boolean().optional().describe("Whether to rerank the results"),
    })
    .optional()
    .describe("Additional search configuration options"),
});

// Vector Store Retrieve Schema
export const VectorStoreRetrieveSchema = z.object({
  vector_store_id: z
    .string()
    .min(1)
    .describe("The ID of the vector store to retrieve"),
});

// Vector Store List Schema
export const VectorStoreListSchema = z.object({
  q: z.string().optional().describe("Search query to filter vector stores"),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .describe("Maximum number of vector stores to return"),
  cursor: z.string().optional().describe("Cursor for pagination"),
  include_total: z
    .boolean()
    .optional()
    .describe("Whether to include total count"),
});

// Vector Store Create Schema
export const VectorStoreCreateSchema = z.object({
  name: z.string().min(1).describe("Name of the vector store"),
  description: z.string().optional().describe("Optional description"),
});

// Vector Store Delete Schema
export const VectorStoreDeleteSchema = z.object({
  vector_store_id: z
    .string()
    .min(1)
    .describe("The ID of the vector store to delete"),
});

// Vector Store Upload Schema
export const VectorStoreUploadSchema = z.object({
  vector_store_id: z
    .string()
    .min(1)
    .describe("The ID of the vector store to upload to"),
  file_path: z
    .string()
    .min(1)
    .describe("Absolute path to the local file to upload"),
  filename: z
    .string()
    .optional()
    .describe("Optional custom filename (defaults to basename of file_path)"),
  mime_type: z.string().optional().describe("Optional MIME type of the file"),
});

// Vector Store File Retrieve Schema
export const VectorStoreFileRetrieveSchema = z.object({
  file_id: z.string().min(1).describe("The ID of the file to retrieve"),
  vector_store_identifier: z
    .string()
    .min(1)
    .describe("The identifier of the vector store containing the file"),
});

// Inferred types
export type VectorStoreSearchInput = z.infer<typeof VectorStoreSearchSchema>;
export type VectorStoreFileSearchInput = z.infer<
  typeof VectorStoreFileSearchSchema
>;
export type VectorStoreRetrieveInput = z.infer<
  typeof VectorStoreRetrieveSchema
>;
export type VectorStoreListInput = z.infer<typeof VectorStoreListSchema>;
export type VectorStoreCreateInput = z.infer<typeof VectorStoreCreateSchema>;
export type VectorStoreDeleteInput = z.infer<typeof VectorStoreDeleteSchema>;
export type VectorStoreUploadInput = z.infer<typeof VectorStoreUploadSchema>;
export type VectorStoreFileRetrieveInput = z.infer<
  typeof VectorStoreFileRetrieveSchema
>;
