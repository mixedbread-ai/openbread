/**
 * Validates and parses a JSON metadata string
 * @param metadataString The JSON string to parse
 * @returns Parsed metadata object or undefined if input is undefined
 * @throws Error if JSON is invalid
 */
export function validateMetadata(
  metadataString?: string
): Record<string, unknown> | undefined {
  if (!metadataString) {
    return undefined;
  }

  try {
    return JSON.parse(metadataString);
  } catch (_error) {
    throw new Error("Invalid JSON in metadata option");
  }
}
