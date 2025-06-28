---
"@mixedbread/mcp": patch
---

Fix npx execution by simplifying bin field to direct path

Changed bin field from object format to string format (following the pattern used by official MCP servers like @modelcontextprotocol/server-filesystem). This ensures npx properly executes the package when running `npx @mixedbread/mcp`.