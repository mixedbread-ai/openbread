# @mixedbread/mcp

MCP (Model Context Protocol) server for managing and searching vector stores with Mixedbread's SDK.

## Quick Start

### Install

```bash
npm install -g @mixedbread/mcp
```

### Test if server is available

```bash
npx @mixedbread/mcp
```

### Update Claude Desktop config

Edit your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mixedbread": {
      "command": "npx",
      "args": [
        "-y",
        "@mixedbread/mcp"
        ],
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

Replace `your_api_key_here` with your Mixedbread API key and `/path/to/allowed/directory` with your desired directory path.
Check our documentation for more information and a tool overview.

## Links

- [Mixedbread MCP Documentation](https://www.mixedbread.com/mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/download)