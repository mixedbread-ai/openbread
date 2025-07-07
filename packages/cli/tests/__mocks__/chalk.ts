// Mock chalk to avoid ESM issues in tests

const colors = [
  "red",
  "green",
  "yellow",
  "blue",
  "cyan",
  "gray",
  "white",
  "black",
];
const modifiers = [
  "bold",
  "dim",
  "italic",
  "underline",
  "inverse",
  "hidden",
  "strikethrough",
];
const allMethods = [...colors, ...modifiers];

const createChainableStyle = () => {
  const style = (str: string) => str;

  // Make each property return the same chainable style to enable chaining
  allMethods.forEach((prop) => {
    style[prop] = style;
  });

  return style;
};

const chalk = createChainableStyle();

export default chalk;
