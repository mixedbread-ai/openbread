interface MCPRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: Record<string, unknown>;
}

export const createMCPRequest = (method: string, params: Record<string, unknown>, id = 1): MCPRequest => ({
  jsonrpc: "2.0" as const,
  id,
  method,
  params,
});

export const createMCPToolCall = (name: string, args: Record<string, unknown>, id = 1) =>
  createMCPRequest("tools/call", { name, arguments: args }, id);

export const createMCPListToolsRequest = (id = 1): MCPRequest =>
  createMCPRequest("tools/list", {}, id);

interface MCPResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export const expectMCPResponse = (response: MCPResponse) => {
  expect(response).toHaveProperty("content");
  expect(Array.isArray(response.content)).toBe(true);
  expect(response.content.length).toBeGreaterThan(0);
  expect(response.content[0]).toHaveProperty("type", "text");
  expect(response.content[0]).toHaveProperty("text");
};

export const expectMCPError = (response: MCPResponse) => {
  expect(response).toHaveProperty("content");
  expect(response).toHaveProperty("isError", true);
  expect(response.content[0]).toHaveProperty("type", "text");
  expect(response.content[0]).toHaveProperty("text");
};
