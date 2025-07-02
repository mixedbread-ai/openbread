# Openbread

[![npm version](https://badge.fury.io/js/@mixedbread%2Fcli.svg)](https://www.npmjs.com/package/@mixedbread/cli)
[![npm version](https://badge.fury.io/js/@mixedbread%2Fmcp.svg)](https://www.npmjs.com/package/@mixedbread/mcp)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Openbread is an open-source toolkit that provides powerful interfaces for interacting with [Mixedbread](https://www.mixedbread.com/)'s vector store platform. It consists of two main packages that enable seamless vector store management, file processing, and intelligent search capabilities.

## Packages

### 🛠️ [@mixedbread/cli](./packages/cli)

A comprehensive command-line interface for managing Mixedbread vector stores.

**Key Features:**
- Vector store management (create, update, delete, list)
- Intelligent file upload with processing strategies
- Advanced sync with git-based and hash-based change detections 
- Vector search and Q&A capabilities
- Manifest-based file uploads
- Configuration management and aliases

**Installation:**
```bash
npm install -g @mixedbread/cli
```

**Quick Start:**
```bash
# Set your API key
export MXBAI_API_KEY=mxb_xxxxx

# Create a vector store
mxbai vs create "My Documents"

# Upload files with high-quality processing
mxbai vs upload "My Documents" "**/*.md" --strategy high_quality --contextualization

# Search your content
mxbai vs search "My Documents" "how to get started"
```

### 🔌 [@mixedbread/mcp](./packages/mcp)

A Model Context Protocol (MCP) server that enables integration with Claude Desktop and other MCP-compatible clients.

**Key Features:**
- Seamless Claude Desktop integration
- Vector store operations through MCP tools
- File management and search capabilities
- Real-time vector store interactions

**Installation:**
```bash
npm install -g @mixedbread/mcp
```

**Claude Desktop Integration:**
```json
{
  "mcpServers": {
    "mixedbread": {
      "command": "npx",
      "args": ["-y", "@mixedbread/mcp"],
      "env": {
        "MXBAI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Prerequisites

- **Node.js**: Version 20 or higher
- **Package Manager**: npm, yarn, pnpm, or bun
- **Mixedbread API Key**: Get yours [here](https://www.platform.mixedbread.com/platform?next=/api-keys)

## Getting Started

1. **Get your API key** from [Mixedbread](https://www.platform.mixedbread.com/platform?next=/api-keys)

2. **Choose your interface:**
   - **Command Line**: Install `@mixedbread/cli` for terminal-based operations
   - **Claude Desktop**: Install `@mixedbread/mcp` for AI assistant integration

3. **Set up authentication:**
   ```bash
   export MXBAI_API_KEY=your_api_key_here
   ```

4. **Start building:**
   - Create vector stores for your documents
   - Upload and process files with different strategies
   - Search and interact with your content

## Development

This is a monorepo managed with [pnpm](https://pnpm.io/) and [Turbo](https://turbo.build/).

### Setup

```bash
# Clone the repository
git clone https://github.com/mixedbread-ai/openbread.git
cd openbread

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development Workflow

```bash
# Start development mode (watches for changes)
pnpm dev

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format

# Type checking
pnpm check-types
```

### Project Structure

```
openbread/
├── packages/
│   ├── cli/          # Command-line interface
│   └── mcp/          # Model Context Protocol server
├── package.json      # Root package configuration
├── turbo.json        # Turbo build configuration
└── pnpm-workspace.yaml # pnpm workspace configuration
```

## Release Management

This project uses [Changesets](https://github.com/changesets/changesets) for version management and automated releases.

### Contributing Changes

1. **Make your changes**
2. **Create a changeset:**
   ```bash
   pnpm changeset
   ```
3. **Commit and push:**
   ```bash
   git add .changeset
   git commit -m "chore: add changeset for [your changes]"
   git push
   ```

### Automated Release Process

- Changesets automatically create "Version Packages" PRs
- Merging these PRs triggers automated npm publishing
- Releases include GitHub releases with changelogs

## Documentation

- **CLI Documentation**: [mixedbread.com/cli](https://www.mixedbread.com/cli)
- **MCP Documentation**: [mixedbread.com/mcp](https://www.mixedbread.com/mcp)
- **Release Process**: [RELEASE.md](./RELEASE.md)
- **Mixedbread Platform**: [platform.mixedbread.com](https://www.platform.mixedbread.com)

## Support

- **Issues**: [GitHub Issues](https://github.com/mixedbread-ai/openbread/issues)
- **Email**: support@mixedbread.com
- **Documentation**: [mixedbread.com](https://www.mixedbread.com/docs)

## License

This project is licensed under the [Apache License 2.0](./LICENSE).

---

🍞 Baked with love by [Mixedbread](https://www.mixedbread.com/)