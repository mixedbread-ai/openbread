# @mixedbread/mcp

## 1.1.7

### Patch Changes

- Update README with comprehensive documentation and fix import ordering

  - Added detailed overview section explaining MCP server capabilities
  - Included complete tool descriptions for all 8 available tools
  - Enhanced configuration examples for all platforms (macOS, Windows, Linux)
  - Added security best practices and API key management guidelines
  - Included comprehensive troubleshooting section with common issues
  - Added development instructions for building from source
  - Improved usage examples with natural language queries
  - Added links to relevant documentation and resources
  - Restructured content for better readability and user experience
  - Fixed import ordering in tool files for consistency

## 1.1.6

### Patch Changes

- Update SDK dependency and homepage URL

  - Bump @mixedbread/sdk from 0.11.1 to 0.16.0 for latest features and bug fixes

## 1.1.5

### Patch Changes

- Fix schema parameter usage in implementation and tests

  - Updated tool implementations to use `vector_store_identifier` instead of `vector_store_id`
  - Fixed all test assertions to match the new schema parameter names
  - Ensures consistency between schema definitions and actual usage

## 1.1.4

### Patch Changes

- Update README for clarity and fix schema parameter names

  - Simplified README.md with clearer quick start instructions
  - Renamed `vector_store_id` to `vector_store_identifier` in schemas for consistency
  - Improved documentation structure and removed redundant development sections
  - Added -y flag to npx command in Claude Desktop configuration example

## 1.1.3

### Patch Changes

- Fix MCP package structure for proper npx execution

  - Fixed bin field in package.json to use object notation mapping "mcp" command to dist/index.js
  - Updated tsconfig.json to output files directly in dist/ instead of dist/src/
  - This ensures the package works correctly when executed via npx

## 1.1.2

### Patch Changes

- Fix npx execution by simplifying bin field to direct path

  Changed bin field from object format to string format (following the pattern used by official MCP servers like @modelcontextprotocol/server-filesystem). This ensures npx properly executes the package when running `npx @mixedbread/mcp`.

## 1.1.1

### Patch Changes

- Fix npx execution by adding "mcp" to bin field in package.json

  The MCP server can now be properly executed with `npx @mixedbread/mcp`. This fixes the Claude Desktop integration issue where the server failed to start.

## 1.1.0

### Minor Changes

- Fix executable configuration and update environment variable

  **Breaking Change**: Environment variable renamed from `MIXEDBREAD_API_KEY` to `MXBAI_API_KEY`

  - Update all references from MIXEDBREAD_API_KEY to MXBAI_API_KEY for consistency with other Mixedbread tools
  - Update README documentation to reflect the new environment variable

  Users need to update their environment configuration:

  - Change `MIXEDBREAD_API_KEY` to `MXBAI_API_KEY` in their environment
  - Update Claude Desktop configuration to use `MXBAI_API_KEY`

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
