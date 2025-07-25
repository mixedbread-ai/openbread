---
"@mixedbread/cli": major
---

Add force upload option and standardize CLI flags (breaking changes)

## Breaking Changes

### Sync Command Changes
- **REMOVED**: `--ci` flag - use `--yes/-y` instead for non-interactive mode
- **CHANGED**: `--force/-f` behavior - now forces re-upload of all files (ignoring change detection)
- **NEW**: `--yes/-y` flag - skips confirmation prompts (replaces old `--force` behavior)

### Flag Standardization Across Commands
All confirmation-skipping flags have been standardized from `--force` to `--yes/-y`:
- `mxbai vs delete --force` → `mxbai vs delete --yes/-y`
- `mxbai vs files delete --force` → `mxbai vs files delete --yes/-y`  
- `mxbai config keys remove --force` → `mxbai config keys remove --yes/-y`
