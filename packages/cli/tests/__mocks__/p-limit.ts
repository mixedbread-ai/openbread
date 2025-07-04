import { jest } from "@jest/globals";

// Mock p-limit to avoid ESM issues in tests
const mockPLimit = jest.fn(() => {
  // Return a function that just executes the passed function immediately
  return (fn) => fn();
});

module.exports = mockPLimit;
