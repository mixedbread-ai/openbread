import { expect, jest } from "@jest/globals";
import type { Command } from "commander";

/**
 * Helper to parse command arguments and capture errors
 */
export async function parseCommand(
  command: Command,
  args: string[]
): Promise<{
  error?: Error;
  exitCode?: number;
}> {
  const originalExit = process.exit;
  let error: Error | undefined;
  let exitCode: number | undefined;

  process.exit = (code: number) => {
    exitCode = code;
    throw new Error(`Process exited with code ${code}`);
  };

  try {
    await command.parseAsync(["node", "test", ...args]);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Process exited")) {
      // Expected exit, not an error
    } else {
      error = e as Error;
    }
  } finally {
    process.exit = originalExit;
  }

  return { error, exitCode };
}

/**
 * Mock console methods and capture output
 */
export function mockConsole() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];

  console.log = jest.fn((...args) => {
    logs.push(args.map(String).join(" "));
  });

  console.error = jest.fn((...args) => {
    errors.push(args.map(String).join(" "));
  });

  console.warn = jest.fn((...args) => {
    warns.push(args.map(String).join(" "));
  });

  return {
    logs,
    errors,
    warns,
    restore() {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
}

/**
 * Create a mock SDK client with common methods
 */
export function createMockClient() {
  return {
    vectorStores: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      questionAnswering: jest.fn(),
      files: {
        create: jest.fn(),
        retrieve: jest.fn(),
        list: jest.fn(),
        delete: jest.fn(),
        upload: jest.fn(),
        uploadAndPoll: jest.fn(),
      },
    },
    files: {
      create: jest.fn(),
      retrieve: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
    },
    embeddings: {
      create: jest.fn(),
    },
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  };
}

type MockFileSystem = {
  [key: string]: string | Buffer | MockFileSystem;
};

/**
 * Create a mock file system structure
 */
export function createMockFiles(files: Record<string, string | Buffer>) {
  const mockFiles: MockFileSystem = {};

  for (const [path, content] of Object.entries(files)) {
    const dirs = path.split("/").slice(0, -1);
    let current: MockFileSystem = mockFiles;

    for (const dir of dirs) {
      if (!current[dir]) {
        current[dir] = {};
      }
      current = current[dir] as MockFileSystem;
    }

    const filename = path.split("/").pop()!;
    current[filename] = content;
  }

  return mockFiles;
}

/**
 * Assert that process.exit was called with specific code
 */
export function expectExit(code: number) {
  expect(process.exit).toHaveBeenCalledWith(code);
}

/**
 * Assert console output contains specific text
 */
export function expectOutput(
  mockConsoleOutput: ReturnType<typeof mockConsole>,
  type: "log" | "error" | "warn",
  text: string
) {
  const output = mockConsoleOutput[`${type}s`];
  const found = output.some((line) => line.includes(text));

  if (!found) {
    throw new Error(
      `Expected ${type} output to contain "${text}" but got:\n${output.join("\n")}`
    );
  }
}

/**
 * Create a test configuration
 */
export function createTestConfig(overrides: Record<string, unknown> = {}) {
  return {
    version: "1.0",
    defaults: {
      upload: {
        strategy: "fast",
        contextualization: false,
        parallel: 5,
      },
      search: {
        top_k: 10,
        rerank: true,
      },
    },
    aliases: {},
    ...overrides,
  };
}

// Utility type for flexible mock functions in tests
// This allows mocks to accept any arguments without strict typing constraints
export type FlexibleMock = jest.MockedFunction<any>;

// Utility type for partial mock functions that preserve some type safety
export type PartialMock<T> = T extends (...args: any[]) => infer R
  ? jest.MockedFunction<(...args: any[]) => R>
  : jest.MockedFunction<any>;

// Helper type for mocking API client methods with flexible arguments
export type MockedAPIClient<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? FlexibleMock
    : T[K] extends object
      ? MockedAPIClient<T[K]>
      : T[K];
};

// Common mock setup helpers
export const createMockConsole = () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;

  return {
    setup: () => {
      console.log = jest.fn();
      console.error = jest.fn();
      process.exit = jest.fn() as never;
    },
    restore: () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      process.exit = originalProcessExit;
    },
  };
};

// Helper to create mock vector store data with required fields
export const createMockVectorStore = (overrides: Record<string, any> = {}) => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "test-store",
  created_at: "2021-01-01T00:00:00Z",
  updated_at: "2021-01-01T00:00:00Z",
  ...overrides,
});

// Helper to create mock config with required version field
export const createMockConfig = (overrides: Record<string, any> = {}) => ({
  version: "1.0",
  ...overrides,
});
