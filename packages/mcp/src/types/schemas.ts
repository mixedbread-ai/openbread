import { z } from "zod";

// Store Search Schema
export const StoreSearchSchema = z.object({
  query: z.string().describe("The search query text"),
  store_identifiers: z
    .array(z.string().min(1))
    .min(1)
    .describe("Array of store identifiers to search in"),
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

// Store Retrieve Schema
export const StoreRetrieveSchema = z.object({
  store_identifier: z
    .string()
    .min(1)
    .describe("The identifier of the store to retrieve"),
});

// Store List Schema
export const StoreListSchema = z.object({
  q: z.string().optional().describe("Search query to filter stores"),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .describe("Maximum number of stores to return"),
  after: z
    .string()
    .optional()
    .describe("Cursor from a previous page's pagination.last_cursor"),
  include_total: z
    .boolean()
    .optional()
    .describe("Whether to include total count"),
});

// Store Create Schema
export const StoreCreateSchema = z.object({
  name: z.string().min(1).describe("Name of the store"),
  description: z.string().optional().describe("Optional description"),
});

// Store Delete Schema
export const StoreDeleteSchema = z.object({
  store_identifier: z
    .string()
    .min(1)
    .describe("The identifier of the store to delete"),
});

// Store Upload Schema
export const StoreUploadSchema = z.object({
  store_identifier: z
    .string()
    .min(1)
    .describe("The identifier of the store to upload to"),
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

// Store File Retrieve Schema
export const StoreFileRetrieveSchema = z.object({
  file_id: z.string().min(1).describe("The ID of the file to retrieve"),
  store_identifier: z
    .string()
    .min(1)
    .describe("The identifier of the store containing the file"),
  return_chunks: z
    .boolean()
    .optional()
    .describe(
      "Whether to return the chunks for the file. This is enabled by default."
    ),
});

// Inferred types
export type StoreSearchInput = z.infer<typeof StoreSearchSchema>;
export type StoreRetrieveInput = z.infer<typeof StoreRetrieveSchema>;
export type StoreListInput = z.infer<typeof StoreListSchema>;
export type StoreCreateInput = z.infer<typeof StoreCreateSchema>;
export type StoreDeleteInput = z.infer<typeof StoreDeleteSchema>;
export type StoreUploadInput = z.infer<typeof StoreUploadSchema>;
export type StoreFileRetrieveInput = z.infer<typeof StoreFileRetrieveSchema>;
