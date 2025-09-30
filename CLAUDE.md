# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Openbread is an open-source toolkit for Mixedbread's store platform. This monorepo contains:
- `@mixedbread/cli` - Command-line interface for managing stores

## Development Commands

### Setup and Build
```bash
# Install dependencies (required before anything else)
pnpm install

# Build all packages
pnpm build

# Development mode with file watching
pnpm dev

# Run tests
pnpm test

# Run a single test file (from package directory)
pnpm test path/to/test.spec.ts

# Lint and auto-fix code
pnpm lint

# Format code
pnpm format

# Type checking
pnpm check-types
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
- Uses pnpm workspaces (v9.0.0 strictly enforced) and Turbo for task orchestration
- Packages in `packages/*` directory
- Node.js 20+ required
- TypeScript 5.8+ with CommonJS module system for CLI package
- Build outputs to `dist/` directories

### Key Dependencies
- `@mixedbread/sdk` - Official SDK for API interactions
- `commander` - CLI framework
- `zod` - Runtime validation and type safety
- `biome` - Linting and formatting (replaces ESLint/Prettier)
- `jest` with `ts-jest` - Testing framework

### Code Standards
- File naming: kebab-case (e.g., `vector-store.ts`)
- Formatting: 2 spaces, 80 char lines, double quotes, trailing commas
- No barrel files (index.ts that just re-exports)
- No unused imports (will show as warnings)
- Biome configuration enforces these standards

### Testing
- Jest for unit and integration tests
- Tests in `tests/` directories within each package
- Mocks for external dependencies (chalk, ora, inquirer, glob, p-limit)
- Run `pnpm test` from root or package directory
- We don't need redundant tests in most cases. For example, I've removed handling edge cases like FILE.TS, my.test.ts, no file extension. Ask me follow-up questions if you're not sure if a test is redundant or not.

## Environment Setup

### Required Environment Variables
```bash
# API key for Mixedbread platform
export MXBAI_API_KEY="your-api-key"
```

### Development Tips
- Use `.env` files for local development
- CLI binary available as `mxbai` after building
- Custom build script in `packages/cli/build` handles TypeScript compilation and packaging

## Common Tasks

### Adding a New CLI Command
1. Create command file in `packages/cli/src/commands/`
2. Follow existing command patterns (see `create.ts` or `search.ts`)
3. Add tests in `packages/cli/tests/commands/`
4. Register command in appropriate index file

### Working with Stores
- CLI provides full CRUD operations for stores
- File upload with processing strategies (high_quality, fast, auto)
- Git-based and hash-based sync capabilities
- Manifest-based bulk uploads via YAML configuration
- Support for aliases and configuration management