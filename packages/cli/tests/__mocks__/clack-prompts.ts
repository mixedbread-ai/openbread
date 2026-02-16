import { jest } from "@jest/globals";

// Mock all @clack/prompts functions
const mock = {
  confirm: jest.fn(),
  text: jest.fn(),
  select: jest.fn(),
  multiselect: jest.fn(),
  isCancel: jest.fn().mockReturnValue(false),
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn((msg?: string) => {
      if (msg) console.log("✓", msg);
    }),
    message: jest.fn(),
  })),
  log: {
    info: jest.fn((msg?: string) => {
      if (msg) console.log(msg);
    }),
    success: jest.fn((msg?: string) => {
      if (msg) console.log("✓", msg);
    }),
    warn: jest.fn((msg?: string) => {
      if (msg) console.log("⚠", msg);
    }),
    error: jest.fn((msg?: string) => {
      if (msg) console.log("✗", msg);
    }),
    step: jest.fn((msg?: string) => {
      if (msg) console.log(msg);
    }),
    message: jest.fn((msg?: string) => {
      if (msg) console.log(msg);
    }),
  },
  intro: jest.fn(),
  outro: jest.fn(),
  cancel: jest.fn(),
};

export = mock;
