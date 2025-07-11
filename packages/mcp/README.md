# Mixedbread MCP Server

[![npm version](https://badge.fury.io/js/@mixedbread%2Fmcp.svg)](https://www.npmjs.com/package/@mixedbread/mcp)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Connect your Mixedbread vector stores to any MCP-compatible client through the Model Context Protocol. Our MCP allows you to manage and search your vector store documents in natural language. Reduce your search time and improve your code output quality through rag in coding agents like claude code and cursor.

## Overview

The Mixedbread MCP Server allows you to:
- Create and manage vector stores for your documents
- Upload and process files with automated chunking and embedding
- Retrieve specific files and their contents
- Build AI-native search experiences directly in any MCP-Client

## Available Tools

### `vector_store_create`
Create a new vector store to organize your documents.
- **Input**: Vector store name
- **Returns**: Vector store details

### `vector_store_list`
List all vector stores in your account.
- **Input**: Optional search query to filter vector stores.
- **Returns**: Array of vector stores with metadata

### `vector_store_retrieve`
Get detailed information about a specific vector store.
- **Input**: Vector store ID
- **Returns**: Store details including file count and settings

### `vector_store_delete`
Delete a vector store and all its contents.
- **Input**: Vector store ID
- **Returns**: Deletion confirmation

### `vector_store_upload`
Upload files to a vector store for processing and indexing.
- **Input**: Vector store ID, file paths
- **Returns**: Upload status and processed file information

### `vector_store_search`
Search for specific chunks within a vector store.
- **Input**: Vector store ID, search query, optional filters
- **Returns**: Relevant file chunks, scores,  metadata

### `vector_store_file_search`
Search for specific files within a vector store.
- **Input**: Vector store ID, search query, optional filters
- **Returns**: Relevant files, scores, file chunks, metadata

### `vector_store_file_retrieve`
Retrieve details about a specific file in a vector store.
- **Input**: Vector store ID, file ID
- **Returns**: File metadata and content access

## Prerequisites

- **Node.js**: Version 20 or higher
- **Mixedbread API Key**: Get yours at [platform.mixedbread.com](https://www.platform.mixedbread.com/platform?next=/api-keys)
- **MCP Client**: Claude Desktop or another MCP-compatible client
- **Optional**: `@modelcontextprotocol/server-filesystem` for local file uploads

## Installation

### NPM Global Install (Recommended)

```bash
npm install -g @mixedbread/mcp
```

### Test Installation

```bash
npx @mixedbread/mcp
```

You should see the MCP server start message if installed correctly.

## Configuration

### Claude Desktop Setup

1. Open your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add the Mixedbread MCP server configuration:

```json
{
  "mcpServers": {
    "mixedbread": {
      "command": "npx",
      "args": ["-y", "@mixedbread/mcp"],
      "env": {
        "MXBAI_API_KEY": "mxb_your_api_key_here"
      }
    }
  }
}
```

### With Filesystem Server (for file uploads)

To upload local files, also configure the filesystem MCP server:

```json
{
  "mcpServers": {
    "mixedbread": {
      "command": "npx",
      "args": ["-y", "@mixedbread/mcp"],
      "env": {
        "MXBAI_API_KEY": "mxb_your_api_key_here"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/your/documents"
      ]
    }
  }
}
```

### Environment Variables

- `MXBAI_API_KEY`: Your Mixedbread API key (required)

## Usage Examples

Once configured, you can interact with your vector stores using natural language in Claude Desktop:

### Creating a Vector Store
```
"Create a new vector store called 'Product Documentation'"
```

### Uploading Documents
```
"Upload all markdown files from the docs folder to my Product Documentation store"
```

### Searching Content
```
"Search for information about authentication in the Product Documentation store"
```

### Managing Stores
```
"List all my vector stores"
```

### Advanced Queries
```
"Find all files in the Product Documentation store that mention API endpoints"
```

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/mixedbread-ai/openbread.git
cd openbread/packages/mcp

# Install dependencies
npm install

# Build the server
npm run build

# Run in development mode
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Security

### API Key Management
- Store API keys securely in environment variables
- Never commit API keys to version control
- Use separate API keys for development and production
- Rotate keys regularly

## Troubleshooting

### Common Issues

#### "API key not found" error
- Verify your API key starts with `mxb_`
- Check the key is correctly set in Claude Desktop config
- Ensure there are no extra spaces or quotes around the key

#### "Cannot connect to Mixedbread API"
- Check your internet connection
- Verify the API endpoint is accessible
- Ensure your firewall allows outbound HTTPS connections

#### "File upload failed"
- Confirm the filesystem MCP server is configured
- Check file paths are within allowed directories

#### Tools not appearing in Claude
- Restart Claude Desktop after configuration changes
- Check the MCP server is running (test with `npx @mixedbread/mcp`)
- Review Claude Desktop logs for errors

## Links & Resources

- **Mixedbread Documentation**: [mixedbread.com/docs](https://www.mixedbread.com/docs)
- **MCP Documentation**: [mixedbread.com/mcp](https://www.mixedbread.com/mcp)
- **API Reference**: [mixedbread.com/api-reference](https://www.mixedbread.com/api-reference)
- **Model Context Protocol**: [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **GitHub Issues**: [github.com/mixedbread-ai/openbread/issues](https://github.com/mixedbread-ai/openbread/issues)
- **Support**: support@mixedbread.com

## License

This project is licensed under the [Apache License 2.0](https://opensource.org/licenses/Apache-2.0).

---

🍞 Baked with love by [Mixedbread](https://www.mixedbread.com/)