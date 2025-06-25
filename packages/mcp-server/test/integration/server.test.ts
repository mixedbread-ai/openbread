import { spawn } from "node:child_process";
import {
  createMCPListToolsRequest,
  createMCPToolCall,
} from "../helpers/test-utils.js";

describe("Server Integration", () => {
  const timeout = 10000;

  it(
    "should start server and respond to list tools request",
    (done) => {
      const server = spawn("npm", ["start"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, MIXEDBREAD_API_KEY: "test-key" },
      });

      const responses: unknown[] = [];
      let buffer = "";

      const cleanup = () => {
        server.kill();
      };

      server.stdout.on("data", (data) => {
        buffer += data.toString();

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        lines.forEach((line) => {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              responses.push(response);

              if (response.id === 1 && response.result?.tools) {
                expect(response.result.tools).toHaveLength(8);
                expect(response.result.tools[0]).toHaveProperty("name");
                expect(response.result.tools[0]).toHaveProperty("description");
                expect(response.result.tools[0]).toHaveProperty("inputSchema");
                cleanup();
                done();
              }
            } catch (_e) {
              // Not JSON, ignore
            }
          }
        });
      });

      server.stderr.on("data", (data) => {
        const output = data.toString();
        if (output.includes("Mixedbread MCP server running")) {
          // Server is ready, send list tools request
          const request = createMCPListToolsRequest();
          server.stdin.write(`${JSON.stringify(request)}\n`);
        }
      });

      server.on("error", (error) => {
        cleanup();
        done(error);
      });

      // Timeout protection
      setTimeout(() => {
        cleanup();
        done(new Error("Test timeout"));
      }, timeout);
    },
    timeout
  );

  it(
    "should handle tool call with error when API key is invalid",
    (done) => {
      const server = spawn("npm", ["start"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, MIXEDBREAD_API_KEY: "invalid-key" },
      });

      let buffer = "";

      const cleanup = () => {
        server.kill();
      };

      server.stdout.on("data", (data) => {
        buffer += data.toString();

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        lines.forEach((line) => {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);

              if (response.id === 2 && response.result?.isError) {
                expect(response.result.isError).toBe(true);
                expect(response.result.content[0].text).toContain("Error");
                cleanup();
                done();
              }
            } catch (_e) {
              // Not JSON, ignore
            }
          }
        });
      });

      server.stderr.on("data", (data) => {
        const output = data.toString();
        if (output.includes("Mixedbread MCP server running")) {
          // Server is ready, send tool call request
          const request = createMCPToolCall(
            "vector_store_list",
            { limit: 10 },
            2
          );
          server.stdin.write(`${JSON.stringify(request)}\n`);
        }
      });

      server.on("error", (error) => {
        cleanup();
        done(error);
      });

      // Timeout protection
      setTimeout(() => {
        cleanup();
        done(new Error("Test timeout"));
      }, timeout);
    },
    timeout
  );
});
