import { Mixedbread } from "@mixedbread/sdk";

export function createMixedbreadClient(): Mixedbread {
  const apiKey = process.env.MXBAI_API_KEY;

  if (!apiKey) {
    throw new Error("MXBAI_API_KEY environment variable is required");
  }

  return new Mixedbread({
    apiKey: apiKey,
  });
}

// Create a singleton instance
let mixedbreadClient: Mixedbread | null = null;

export function getMixedbreadClient(): Mixedbread {
  if (!mixedbreadClient) {
    mixedbreadClient = createMixedbreadClient();
  }
  return mixedbreadClient;
}

// Export for testing purposes
export function resetMixedbreadClient(): void {
  mixedbreadClient = null;
}
