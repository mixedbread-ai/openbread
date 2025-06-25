import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { lookup } from "mime-types";
import { toFile } from "@mixedbread/sdk";
import { getMixedbreadClient } from "../utils.js";
import type { VectorStoreUploadInput } from "../types/index.js";

export async function vectorStoreUpload(args: VectorStoreUploadInput) {
  const client = getMixedbreadClient();

  try {
    const fileBuffer = await readFile(args.file_path);
    const filename = args.filename || basename(args.file_path);
    const mimeType = args.mime_type || lookup(args.file_path);

    if (!mimeType) {
      throw new Error(
        `Could not determine MIME type for file: ${filename}. Supported types: PDF, TXT, MD, PNG, JPG, JPEG, WEBP, PPT, PPTX, PPSX, PPAM, PPTM, POTM, PPSM, ODP`
      );
    }

    const file = await toFile(fileBuffer, filename, { type: mimeType });
    const response = await client.vectorStores.files.upload(
      args.vector_store_id,
      file
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
          text: `Error uploading file: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
