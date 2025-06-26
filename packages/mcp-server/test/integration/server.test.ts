import { spawn } from "node:child_process";
import {
  createMCPListToolsRequest,
  createMCPToolCall,
} from "../helpers/test-utils.js";

describe("Server Integration", () => {
  const timeout = 10000;

  const createServerTest = (
    apiKey: string,
    requestFn: () => object,
    assertionFn: (response: Record<string, unknown>) => boolean,
    expectationFn: (response: Record<string, unknown>) => void
  ) => {
    return (done: jest.DoneCallback) => {
      const server = spawn("npm", ["start"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, MIXEDBREAD_API_KEY: apiKey },
      });

      let buffer = "";
      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (!server.killed) {
          server.kill("SIGKILL");
        }
        server.removeAllListeners();
      };

      const handleData = (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const response = JSON.parse(line) as Record<string, unknown>;
            if (assertionFn(response)) {
              expectationFn(response);
              cleanup();
              done();
              return;
            }
          } catch {
            // Not JSON, ignore
          }
        }
      };

      const handleReady = (data: Buffer) => {
        if (data.toString().includes("Mixedbread MCP server running")) {
          server.stdin?.write(`${JSON.stringify(requestFn())}\n`);
        }
      };

      server.stdout?.on("data", handleData);
      server.stderr?.on("data", handleReady);
      server.on("error", (error) => {
        cleanup();
        done(error);
      });
      server.on("close", () => {
        server.removeAllListeners();
      });

      timeoutId = setTimeout(() => {
        cleanup();
        done(new Error("Test timeout"));
      }, timeout);
      timeoutId.unref();
    };
  };

  it(
    "should start server and respond to list tools request",
    createServerTest(
      "test-key",
      () => createMCPListToolsRequest(),
      (response) => response.id === 1 && !!response.result,
      (response) => {
        const result = response.result as Record<string, unknown>;
        const tools = result.tools as unknown[];
        expect(tools).toHaveLength(8);
        expect(tools[0]).toHaveProperty("name");
        expect(tools[0]).toHaveProperty("description");
        expect(tools[0]).toHaveProperty("inputSchema");
      }
    ),
    timeout
  );

  it(
    "should handle tool call with error when API key is invalid",
    createServerTest(
      "invalid-key",
      () => createMCPToolCall("vector_store_list", { limit: 10 }, 2),
      (response) => response.id === 2 && !!response.result,
      (response) => {
        const result = response.result as Record<string, unknown>;
        const content = result.content as Record<string, unknown>[];
        expect(result.isError).toBe(true);
        expect(content[0].text).toContain("Error");
      }
    ),
    timeout
  );
});
