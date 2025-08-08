import { afterAll, afterEach, beforeEach, jest } from "@jest/globals";

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
  jest.restoreAllMocks();

  // Clear all timers to prevent any pending operations
  jest.clearAllTimers();
});

afterAll(async () => {
  // Restore original methods
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  process.exit = originalProcessExit;

  // Final cleanup
  jest.restoreAllMocks();
  jest.clearAllTimers();

  // Small delay to allow any pending I/O operations to complete
  await new Promise((resolve) => setTimeout(resolve, 100));
});
