# @mixedbread/mcp

A TypeScript-based MCP (Model Context Protocol) server that provides comprehensive vector store capabilities using Mixedbread's SDK. This server exposes powerful tools for searching, managing, and interacting with vector stores directly from Claude Desktop and other MCP-compatible clients.

## Installation

```bash
npm install -g @mixedbread/mcp
```

## Quick Start

### Prerequisites

- Node.js 20+
- Mixedbread API key from [Mixedbread Dashboard](https://www.platform.mixedbread.com/)

## Claude Desktop Integration

To use this MCP server with Claude Desktop, add the following configuration to your Claude Desktop config file:

### macOS

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mixedbread": {
      "command": "npx",
      "args": ["@mixedbread/mcp"],
      "env": {
        "MXBAI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mixedbread": {
      "command": "npx",
      "args": ["@mixedbread/mcp"],
      "env": {
        "MXBAI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Linux

Edit `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mixedbread": {
      "command": "npx",
      "args": ["@mixedbread/mcp"],
      "env": {
        "MXBAI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Example Configuration with Filesystem MCP

For full functionality including file uploads, configure both the Mixedbread MCP server and the filesystem MCP server:

```json
{
  "mcpServers": {
    "mixedbread": {
      "command": "npx",
      "args": ["@mixedbread/mcp"],
      "env": {
        "MXBAI_API_KEY": "your_api_key_here"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ]
    }
  }
}
```

**Important Notes:**

- Replace `your_api_key_here` with your actual Mixedbread API key
- Replace `/path/to/allowed/directory` with the directory path you want to allow file access from
- The filesystem MCP server is required for the upload tool to access local files
- Restart Claude Desktop after making these changes

## Available Tools

### 1. Vector Store Search

Search for relevant document chunks within vector stores.

**Parameters:**

- `query` (string): The search query text
- `vector_store_identifiers` (string[]): Array of vector store identifiers to search in
- `top_k` (number, default: 5): Number of top results to return
- `filters` (object, optional): Custom filters to apply
- `file_ids` (string[], optional): Specific file IDs to search within
- `search_options` (object, optional): Additional search configuration

### 2. Vector Store File Search

Search for relevant files within vector stores.

**Parameters:**

- `query` (string): The search query text
- `vector_store_identifiers` (string[]): Array of vector store identifiers to search in
- `top_k` (number, default: 5): Number of top results to return
- `filters` (object, optional): Custom filters to apply
- `file_ids` (string[], optional): Specific file IDs to search within
- `search_options` (object, optional): Advanced search options including:
  - `return_metadata` (boolean): Whether to return metadata
  - `return_chunks` (boolean, default: true): Whether to return chunks
  - `chunks_per_file` (number): Number of chunks per file
  - `rerank` (boolean): Whether to rerank results

### 3. Vector Store Retrieve

Get detailed information about a specific vector store.

**Parameters:**

- `vector_store_id` (string): The ID of the vector store to retrieve

### 4. Vector Store List

List all available vector stores with optional filtering and pagination.

**Parameters:**

- `q` (string, optional): Search query to filter vector stores
- `limit` (number, default: 20, max: 100): Maximum number of vector stores to return
- `cursor` (string, optional): Cursor for pagination
- `include_total` (boolean, optional): Whether to include total count

### 5. Vector Store Create

Create a new vector store.

**Parameters:**

- `name` (string): Name of the vector store
- `description` (string, optional): Optional description

### 6. Vector Store Delete

Delete an existing vector store.

**Parameters:**

- `vector_store_id` (string): The ID of the vector store to delete

### 7. Vector Store Upload

Upload a file to a vector store with automatic MIME type detection.

**Requirements:**

- Requires the filesystem MCP server to be configured in Claude Desktop for file access (see example configuration above)

**Parameters:**

- `vector_store_id` (string): The ID of the target vector store
- `file_path` (string): Absolute path to the local file
- `filename` (string, optional): Custom filename (defaults to file basename)
- `mime_type` (string, optional): MIME type (auto-detected if not provided)

### 8. Vector Store File Retrieve

Get detailed information about a specific file in a vector store.

**Parameters:**

- `file_id` (string): The ID of the file to retrieve
- `vector_store_identifier` (string): The identifier of the containing vector store

## Example Usage in Claude

Once configured with Claude Desktop, you can use natural language to interact with your vector stores:

```
"Search for documents about machine learning in my research vector store"

"Create a new vector store called 'project-docs' for storing project documentation"

"Upload the file ~/Documents/report.pdf to the project-docs vector store"

"Show me all vector stores that contain 'legal' in their name"

"Find files similar to 'data analysis methodology' in my data-science store"
```

## Authentication

The MCP server looks for your API key in this order:

1. `MXBAI_API_KEY` environment variable
2. Configuration file (if implemented in future versions)

## Troubleshooting

### Common Issues

1. **Server not starting in Claude Desktop**

   - Verify the package is installed globally: `npm list -g @mixedbread/mcp`
   - Ensure the `MXBAI_API_KEY` is set correctly
   - Check Claude Desktop logs for error messages

2. **API key errors**

   - Verify your API key is valid at [Mixedbread Dashboard](https://www.platform.mixedbread.com/)
   - Ensure no extra spaces or characters in the key
   - API key must start with the correct prefix

3. **Permission errors**

   - Make sure Claude Desktop has permission to execute npm/npx commands
   - Verify your npm installation and global package permissions

4. **Tools not appearing in Claude**
   - Restart Claude Desktop after configuration changes
   - Check the Claude Desktop logs for error messages
   - Verify JSON syntax in the configuration file
   - Ensure the package is installed and accessible

## Development

This MCP server is built on top of the `@mixedbread/sdk` and provides a bridge between MCP Clients and Mixedbread's vector store capabilities.

### Development Quick Start

#### Prerequisites

- Node.js 20+
- pnpm (package manager)
- Git

#### Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/mixedbread-ai/openbread.git
   cd openbread/packages/mcp
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Set up your API key:**

   ```bash
   export MXBAI_API_KEY=your_api_key_here
   ```

#### Development Workflow

1. **Start development mode:**

   ```bash
   pnpm dev
   ```

2. **Run tests:**

   ```bash
   # Run all tests
   pnpm test

   # Run tests in watch mode
   pnpm test:watch

   # Run tests with coverage
   pnpm test:coverage
   ```

3. **Lint and format:**

   ```bash
   pnpm lint          # Check for issues
   pnpm format        # Format code
   pnpm check-types   # Type checking
   ```

4. **Build:**

   ```bash
   pnpm build
   ```

## Links

- [Mixedbread](https://www.mixedbread.com/)
- [Mixedbread CLI](https://www.npmjs.com/package/@mixedbread/cli)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/download)