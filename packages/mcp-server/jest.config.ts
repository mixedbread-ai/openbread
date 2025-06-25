import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@mixedbread/mcp$": "<rootDir>/src/index.ts",
    "^@mixedbread/mcp/(.*)$": "<rootDir>/src/$1",
    "^@cloudflare/cabidela$": "<rootDir>/tests/__mocks__/@cloudflare/cabidela.ts",
  },
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testPathIgnorePatterns: ["scripts"],
};

export default config;
