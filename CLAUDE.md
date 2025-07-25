# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Openbread is an open-source toolkit for Mixedbread's vector store platform. This is a monorepo containing two main packages:
- `@mixedbread/cli` - Command-line interface for managing vector stores
- `@mixedbread/mcp` - Model Context Protocol server for Claude Desktop integration

## Development Commands

### Common Commands
```bash
# Install dependencies (required before anything else)
pnpm install

# Build all packages
pnpm build

# Development mode with file watching
pnpm dev

# Run tests
pnpm test

# Run a single test file
pnpm test path/to/test.spec.ts

# Lint and auto-fix code
pnpm lint

# Format code
pnpm format

# Type checking
pnpm check-types
```

### Package-Specific Commands
```bash
# Work on a specific package
cd packages/cli  # or packages/mcp
pnpm build
pnpm test
pnpm dev
```

### Release Process
```bash
# Create a changeset for your changes
pnpm changeset

# Update versions (run from root)
pnpm version

# Build and publish (CI usually handles this)
pnpm release
```

## Architecture

### Monorepo Structure
- Uses pnpm workspaces and Turbo for task orchestration
- Packages are in `packages/*` directory
- Shared TypeScript configurations and dependencies
- Node.js 20+ required, pnpm 9.0.0 strictly enforced

### Key Dependencies
- `@mixedbread/sdk` - Official SDK for API interactions
- `commander` - CLI framework for the CLI package
- `@modelcontextprotocol/sdk` - MCP implementation
- `zod` - Runtime validation and type safety
- `biome` - Linting and formatting (replaces ESLint/Prettier)

### Build System
- Turbo manages build dependencies between packages
- TypeScript compilation with multiple tsconfig files
- Build outputs go to `dist/` directories
- Environment variables from `.env*` files affect builds

### Code Standards
- TypeScript 5.8+ for all code
- File naming: kebab-case (e.g., `vector-store.ts`)
- Formatting: 2 spaces, 80 char lines, double quotes, trailing commas
- No barrel files (index.ts that just re-exports)
- No unused imports (will show as warnings)

## Environment Setup

### Required Environment Variables
```bash
# API key for Mixedbread platform
export MXBAI_API_KEY="your-api-key"
```

### Development Tips
- Use `.env` files for local development
- The CLI binary is available as `mxbai` after building
- The MCP binary is available as `mcp` after building
- Both packages use ESM modules

## Testing Strategy
- Jest for unit and integration tests
- Tests are in `tests/` directories within each package
- Mock external dependencies (SDK calls, file system)
- Run tests before submitting changes

## Common Tasks

### Adding a New CLI Command
1. Create command file in `packages/cli/src/commands/`
2. Follow existing command structure (see `create.ts` or `search.ts`)
3. Add tests in `packages/cli/tests/commands/`
4. Update CLI exports if needed

### Adding a New MCP Tool
1. Create tool file in `packages/mcp/src/tools/`
2. Follow existing tool patterns (input/output schemas with Zod)
3. Add to tool registry in `packages/mcp/src/index.ts`
4. Add tests in `packages/mcp/tests/`

### Working with Vector Stores
- CLI provides full CRUD operations for vector stores
- Support for file uploads with different processing strategies
- Git-based and hash-based sync capabilities
- Manifest-based bulk uploads via YAML configuration