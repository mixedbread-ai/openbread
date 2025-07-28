import { Mixedbread } from "@mixedbread/sdk";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";

export function createMixedbreadClient(apiKey: string): Mixedbread {
  if (!apiKey) {
    throw new Error("API key is required");
  }

  if (!apiKey.startsWith("mxb_")) {
    throw new Error(
      "Invalid API key format. Mixedbread API keys must start with 'mxb_'"
    );
  }

  return new Mixedbread({
    apiKey: apiKey,
  });
}

export function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

export function createMcpAuthVerifier() {
  return async (req: Request, bearerToken?: string) => {
    const token = bearerToken || extractApiKey(req);

    if (!token || !token.startsWith("mxb_")) {
      return undefined;
    }

    return {
      token: token,
      scopes: ["vector_store:read", "vector_store:write"],
      clientId: "mixedbread-client",
      extra: { apiKey: token },
    };
  };
}

export function getApiKeyFromMcpContext(
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): string | null {
  const authExtra = extra?.authInfo?.extra as { apiKey?: string } | undefined;
  const apiKey = authExtra?.apiKey || process.env.MXBAI_API_KEY;

  return apiKey || null;
}
