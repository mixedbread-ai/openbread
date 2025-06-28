# @mixedbread/mcp

## 1.0.4

### Patch Changes

- Fix package executable configuration

  - Add bin field to package.json to make the package executable via npx
  - Add shebang to index.ts for proper Node.js execution
  - This fixes the "could not determine executable to run" error when using npx @mixedbread/mcp

## 1.0.3

### Patch Changes

- Rename package from @mixedbread/mcp-server to @mixedbread/mcp for better naming consistency

## 1.0.2

### Patch Changes

- Updated tests

## 1.0.1

### Patch Changes

- Fixed test warnings for graceful process exit in integration tests
  - Resolved worker process exit warnings by properly cleaning up timeouts and spawned processes
  - Added timeout cleanup with unref() to prevent open handles
  - Fixed test teardown to prevent Jest warnings about leaking processes

## 1.0.0

### Major Changes

- Initial release of MCP server in monorepo

  - Migrated from standalone repository to openbread monorepo
  - Added proper package.json configuration with scoped naming (@mixedbread/mcp-server)
  - Configured TypeScript build system with ESNext modules and strict typing
  - Integrated Biome linting and formatting with Node.js import protocol requirements
  - Fixed all linting errors and type issues in test files
  - Added missing npm scripts for CI/CD (lint, format, check-types, build)
  - Updated repository metadata and publishing configuration
  - All tests now pass with proper TypeScript strict mode
  - Full CI/CD integration with independent versioning support
