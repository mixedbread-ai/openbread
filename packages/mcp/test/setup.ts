import { afterAll, afterEach, beforeEach, jest } from "@jest/globals";

// Set up test environment variables
process.env.MXBAI_API_KEY = "mxb_test-api-key";
process.env.NODE_ENV = "test";

// Mock console methods globally to reduce noise in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalProcessExit = process.exit;

beforeEach(() => {
  // Reset console mocks for each test
  console.warn = jest.fn();
  console.error = jest.fn();
  console.log = jest.fn();
  process.exit = jest.fn() as never;
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Restore original methods
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  process.exit = originalProcessExit;
});
