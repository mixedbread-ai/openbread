# Mixedbread MCP Server

A TypeScript-based MCP (Model Context Protocol) server that provides comprehensive vector store capabilities using Mixedbread's SDK. This server exposes powerful tools for searching, managing, and interacting with vector stores directly from Claude Desktop and other MCP-compatible clients.

## Quick Start

### Prerequisites

- Node.js 20+
- Mixedbread API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/mixedbread-ai/mixedbread-mcp-server.git
cd mixedbread-mcp-server
```

2. Install dependencies:

```bash
npm install
```

3. Get your Mixedbread API key from [Mixedbread Dashboard](https://www.platform.mixedbread.com/)

### Running the Server

```bash
# Set your API key
export MIXEDBREAD_API_KEY="your_api_key_here"

# Start the server
npm start

# Or for development
npm run dev
```

## Claude Desktop Integration

To use this MCP server with Claude Desktop, add the following configuration to your Claude Desktop config file:

### macOS

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mixedbread": {
      "command": "npm",
      "args": ["start"],
      "cwd": "/absolute/path/to/mixedbread-mcp-server",
      "env": {
        "MIXEDBREAD_API_KEY": "your_api_key_here"
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
      "command": "npm",
      "args": ["start"],
      "cwd": "C:\\path\\to\\mixedbread-mcp-server",
      "env": {
        "MIXEDBREAD_API_KEY": "your_api_key_here"
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
      "command": "npm",
      "args": ["start"],
      "cwd": "/home/username/path/to/mixedbread-mcp-server",
      "env": {
        "MIXEDBREAD_API_KEY": "your_api_key_here"
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
      "command": "npm",
      "args": ["start"],
      "cwd": "/absolute/path/to/mixedbread-mcp-server",
      "env": {
        "MIXEDBREAD_API_KEY": "your_api_key_here"
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

- Replace `/absolute/path/to/mixedbread-mcp-server` with the actual absolute path to your cloned repository
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
- `limit` (number, default: 20, max: 100): Maximum number of results
- `after` (string, optional): Pagination cursor for results after this ID
- `before` (string, optional): Pagination cursor for results before this ID

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

- Requires the filesystem MCP server to be configured in Claude Desktop for file access (see example configuration below)

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

## Troubleshooting

### Common Issues

1. **Server not starting in Claude Desktop**

   - Verify the `cwd` path is absolute and correct
   - Check that `npm install` has been run in the project directory
   - Ensure the `MIXEDBREAD_API_KEY` is set correctly

2. **API key errors**

   - Verify your API key is valid at [Mixedbread AI Dashboard](https://www.mixedbread.ai/)
   - Ensure no extra spaces or characters in the key

3. **Permission errors**

   - Make sure Claude Desktop has permission to access the project directory
   - Verify the project path doesn't contain special characters

4. **Tool not appearing in Claude**
   - Restart Claude Desktop after configuration changes
   - Check the Claude Desktop logs for error messages
   - Verify JSON syntax in the configuration file

## Links

- [Mixedbread AI](https://www.mixedbread.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/download)
