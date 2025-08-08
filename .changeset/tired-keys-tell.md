---
"@mixedbread/cli": minor
---

Add intelligent shell completion for vector store names

- **Dynamic completions**: Tab completion now suggests vector store names in commands like `mxbai vs sync [TAB]`, `mxbai vs upload [TAB]`, etc.
- **Multi-key support**: Completions work seamlessly with multiple API keys, showing stores for the current default key
- **New command**: `mxbai completion refresh` to manually refresh the completion cache

Breaking changes:
- Removed undocumented `vector-store` alias (use `vs` instead)
