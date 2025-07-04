// Mock p-limit to avoid ESM issues in tests
const mockPLimit = () => {
  // Return a function that just executes the passed function immediately
  return (fn) => fn();
};

module.exports = mockPLimit;
