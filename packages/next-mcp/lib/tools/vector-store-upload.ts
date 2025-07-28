import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { toFile } from "@mixedbread/sdk";
import { lookup } from "mime-types";
import type { VectorStoreUploadInput } from "../types";
import { createMixedbreadClient } from "../utils";

const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "application/vnd.ms-powerpoint.addin.macroEnabled.12",
  "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
  "application/vnd.ms-powerpoint.template.macroEnabled.12",
  "application/vnd.ms-powerpoint.slideshow.macroEnabled.12",
  "application/vnd.oasis.opendocument.presentation",
] as const;

export async function vectorStoreUpload(
  args: VectorStoreUploadInput,
  apiKey: string
) {
  const client = createMixedbreadClient(apiKey);

  try {
    const fileBuffer = await readFile(args.file_path);
    const filename = args.filename || basename(args.file_path);
    const mimeType = args.mime_type || lookup(args.file_path);

    if (!mimeType) {
      throw new Error(
        `Could not determine MIME type for file: ${filename}. Supported types: ${SUPPORTED_MIME_TYPES.join(", ")}`
      );
    }

    const file = await toFile(fileBuffer, filename, { type: mimeType });
    const response = await client.vectorStores.files.upload(
      args.vector_store_identifier,
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
    };
  }
}
