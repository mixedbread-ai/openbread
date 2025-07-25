# @mixedbread/cli

CLI tool for managing Mixedbread vector stores and files.

## Installation

```bash
npm install -g @mixedbread/cli
```

## Quick Start

```bash
# Add and set your API key
mxbai config keys add mxb_xxxxx work

# Or use environment variable
export MXBAI_API_KEY=mxb_xxxxx

## Check available commands and their options
mxbai --help

# List vector stores
mxbai vs list

# Create a new vector store
mxbai vs create "My Documents"

# Upload files
mxbai vs upload "My Documents" "*.md" "docs/**/*.pdf"

# Upload with high-quality processing and contextualization
mxbai vs upload "My Documents" "**/*.md" --strategy high_quality --contextualization

# Search content
mxbai vs search "My Documents" "how to get started"

# Sync files with change detection
mxbai vs sync "My Documents" "docs/**" --from-git HEAD~1

# Sync with processing options
mxbai vs sync "My Documents" "**/*.md" --parallel 8

# Upload with manifest file (JSON or YAML)
mxbai vs upload "My Documents" --manifest upload-manifest.json
mxbai vs upload "My Documents" --manifest upload-manifest.yaml
```

## Commands

### Vector Store Management

- `mxbai vs list` - List all vector stores
  - Options: `--filter <name>`, `--limit <n>`
- `mxbai vs create <name>` - Create a new vector store
  - Options: `--description <desc>`, `--expires-after <days>`, `--metadata <json>`
- `mxbai vs get <name-or-id>` - Get vector store details
- `mxbai vs update <name-or-id>` - Update vector store
  - Options: `--name <name>`, `--description <desc>`, `--expires-after <days>`, `--metadata <json>`
- `mxbai vs delete <name-or-id>` - Delete vector store (alias: `rm`)
  - Options: `--yes/-y` (skip confirmation)

### File Management

- `mxbai vs upload <name-or-id> <patterns...>` - Upload files to vector store
  - Options: `--strategy fast|high_quality`, `--contextualization`, `--metadata <json>`, `--dry-run`, `--parallel <n>` (1-20), `--unique`, `--manifest <file>`
- `mxbai vs files list <name-or-id>` - List files in vector store (alias: `ls`)
  - Options: `--status <status>` (pending|in_progress|cancelled|completed|failed), `--limit <n>`
- `mxbai vs files get <name-or-id> <file-id>` - Get file details
- `mxbai vs files delete <name-or-id> <file-id>` - Delete file (alias: `rm`)
  - Options: `--yes/-y` (skip confirmation)

### Search & Query

- `mxbai vs search <name-or-id> <query>` - Search vector store
  - Options: `--top-k <n>`, `--threshold <score>`, `--return-metadata`, `--rerank`, `--file-search`
- `mxbai vs qa <name-or-id> <question>` - Ask questions about content
  - Options: `--top-k <n>`, `--threshold <score>`, `--return-metadata`

### Advanced Features

- `mxbai vs sync <name-or-id> <patterns...>` - Sync files with intelligent change detection
  - Options: `--strategy <strategy>`, `--contextualization`, `--from-git <ref>`, `--dry-run`, `--yes/-y`, `--force`, `--metadata <json>`, `--parallel <n>` (1-20)

### Configuration

- `mxbai config set <key> <value>` - Set configuration values
- `mxbai config get [key]` - Get configuration values
- `mxbai config keys add <key> [name]` - Add a new API key
- `mxbai config keys list` - List all API keys
- `mxbai config keys remove <name>` - Remove an API key
  - Options: `--yes/-y` (skip confirmation)
- `mxbai config keys set-default <name>` - Set the default API key
- `mxbai completion install` - Install shell completion
  - Options: `--shell <shell>` (manually specify shell: bash, zsh, fish, pwsh)
- `mxbai completion uninstall` - Uninstall shell completion

## Features

### Manifest-Based Upload

You can upload files using a manifest file (JSON or YAML) that defines file patterns, processing strategies, and metadata:

**JSON Example:**
```json
{
  "version": "1.0",
  "defaults": {
    "strategy": "fast",
    "contextualization": false,
    "metadata": {
      "project": "my-project"
    }
  },
  "files": [
    {
      "path": "docs/**/*.md",
      "metadata": {
        "category": "documentation"
      }
    },
    {
      "path": "README.md",
      "strategy": "high_quality",
      "contextualization": true,
      "metadata": {
        "importance": "high"
      }
    }
  ]
}
```

**YAML Example:**
```yaml
version: "1.0"

defaults:
  strategy: fast
  contextualization: false
  metadata:
    project: my-project

files:
  - path: "docs/**/*.md"
    metadata:
      category: documentation
  - path: README.md
    strategy: high_quality
    contextualization: true
    metadata:
      importance: high
```

### Configuration Precedence

When using the CLI, configuration values are resolved in the following order (highest to lowest priority):

1. **Command-line flags** - Direct CLI options (e.g., `--strategy high_quality`)
2. **Manifest entry** - File-specific settings in manifest files
3. **Manifest defaults** - Default settings in manifest files
4. **Config file** - User configuration file settings
5. **Built-in defaults** - CLI default values

This allows flexible configuration while maintaining predictable behavior.

### Upload Summary Information

The upload and sync commands display strategy and contextualization information in their summaries:

**Normal uploads** show configuration in the summary:
```
✓ 5 files uploaded successfully
Strategy: fast
Contextualization: enabled
Total size: 25.3 KB
```

**Manifest uploads** show configuration beside each file:
```
✓ docs/api.md (15.2 KB) [fast, no-context]
✓ README.md (8.5 KB) [high_quality, contextualized]
✓ guide.md (1.6 KB) [fast, no-context]
```

### Intelligent Sync

The sync command provides intelligent change detection and robust error handling with full support for processing strategies and contextualization:

**Change Detection Methods:**
1. **Git-based** (fastest): Uses `git diff` to detect changes since a specific commit
2. **Hash-based** (accurate): Compares file hashes with stored metadata  

**Processing Options:**
- **Strategy**: Choose between `fast` (default) or `high_quality` processing
- **Contextualization**: Enable context preservation for better semantic understanding
- **Parallel processing**: Control concurrency for optimal performance

**Example Usage:**
```bash
# Sync with git-based detection (fastest)
mxbai vs sync "My Docs" "docs/**" --from-git HEAD~1

# Sync with hash-based detection and custom parallel processing
mxbai vs sync "My Docs" "**/*.md" --parallel 10

# Sync with high-quality processing and contextualization
mxbai vs sync "My Docs" "**/*.md" --strategy high_quality --contextualization

# Dry run to preview changes
mxbai vs sync "My Docs" "src/**" --dry-run

# Force re-upload all files without confirmation 
mxbai vs sync "My Docs" "**/*.pdf" --yes --force
```

### Configuration Management

Set defaults for common options:

```bash
# Upload defaults (apply to both upload and sync commands)
mxbai config set defaults.upload.strategy high_quality  # or 'fast' (default: fast)
mxbai config set defaults.upload.contextualization true  # Enable context preservation (default: false)
mxbai config set defaults.upload.parallel 10             # Concurrent operations (1-20, default: 5)

# Search defaults
mxbai config set defaults.search.top_k 20                # Number of results (default: 10)
mxbai config set defaults.search.rerank true             # Enable reranking (default: false)

# API key management (alternative to environment variable)
# Add API keys with names for easy switching
mxbai config keys add mxb_xxxxx work
mxbai config keys add mxb_xxxxx personal

# List all API keys
mxbai config keys list
# Output:
#   work
# * personal (default)

# Set default API key
mxbai config keys set-default work

# Remove an API key
mxbai config keys remove personal

# Remove an API key without confirmation
mxbai config keys remove personal --yes

# Create aliases for frequently used vector stores
mxbai config set aliases.docs "My Documentation"
mxbai config set aliases.kb "Knowledge Base"

# Then use aliases instead of full names
mxbai vs upload docs "*.md"              # Instead of: mxbai vs upload "My Documentation" "*.md"
mxbai vs search kb "how to get started"  # Instead of: mxbai vs search "Knowledge Base" "how to get started"

# View all configuration
mxbai config get

# View specific configuration
mxbai config get defaults.upload
```

## Authentication

The CLI looks for your API key in this order:

1. `--api-key` or `--saved-key` command line flags
2. `MXBAI_API_KEY` environment variable
3. Default API key from config file (platform-specific location):
   - **Linux/Unix**: `~/.config/mixedbread/config.json` (or `$XDG_CONFIG_HOME/mixedbread/config.json`)
   - **macOS**: `~/Library/Application Support/mixedbread/config.json`
   - **Windows**: `%APPDATA%\mixedbread\config.json`
   - **Custom**: Set `MXBAI_CONFIG_PATH` environment variable to override

### Multi-Organization Support

The CLI supports multiple API keys for different organizations or environments:

```bash
# Add API keys with descriptive names
mxbai config keys add mxb_xxxxx work
mxbai config keys add mxb_xxxxx personal

# Use a specific saved API key for a command
mxbai vs upload "My Docs" "*.md" --saved-key work
mxbai vs search "Knowledge Base" "query" --saved-key personal

# Or use an actual API key directly
mxbai vs upload "My Docs" "*.md" --api-key mxb_xxxxx

# The last added key becomes default automatically
# Or explicitly set a default
mxbai config keys set-default personal
```

## Shell Completion

The CLI supports tab completion for commands and subcommands. To set up completion:

```bash
# Install completion (auto-detects your shell)
mxbai completion install

# Install completion for a specific shell
mxbai completion install --shell bash
mxbai completion install --shell zsh
mxbai completion install --shell fish
mxbai completion install --shell pwsh

# Remove completion
mxbai completion uninstall
```

**Supported shells:** bash, zsh, fish, pwsh (PowerShell)

After installation, restart your shell or reload your shell configuration:
- **bash**: `source ~/.bashrc` or restart terminal
- **zsh**: `source ~/.zshrc` or restart terminal  
- **fish**: Completion is ready to use (fish auto-loads completions)
- **pwsh**: `. $PROFILE` or restart terminal

## Global Options

All commands support these global options:

- `--api-key <key>` - Actual API key for authentication
- `--saved-key <name>` - Name of saved API key from config
- `--format <format>` - Output format: table, json, or csv (default: table)
- `--debug` - Enable debug output (can also set `MXBAI_DEBUG=true`)

## Development

This CLI is built on top of the `@mixedbread/sdk` and provides a convenient command-line interface for common operations.

### Development Quick Start

#### Prerequisites

- Node.js 20+
- A package manager
- Git

#### Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/mixedbread-ai/openbread.git
   cd openbread/packages/cli
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Set up your API key:**

   ```bash
   export MXBAI_API_KEY=mxb_xxxxx
   # Or add to config file
   cd packages/cli && pnpm build && pnpm mxbai config keys add mxb_xxxxx dev
   ```

#### Development Workflow

1. **Start development mode** (auto-rebuild on changes):

   ```bash
   cd packages/cli && pnpm dev
   ```

2. **Test your changes** (in another terminal):

   **Option A: Quick testing** (no tab completion)
   ```bash
   pnpm mxbai vs --help
   pnpm mxbai vs list
   ```

   **Option B: Full CLI experience with tab completion**
   ```bash
   # First, uninstall any global version to avoid conflicts
   npm uninstall -g @mixedbread/cli
   
   # Link your local build
   cd packages/cli && npm link
   
   # Now test with full CLI features
   mxbai vs --help
   mxbai [TAB]  # Tab completion works!
   
   # To unlink when done
   npm unlink -g @mixedbread/cli
   ```

3. **Run tests:**

   ```bash
   # Run all tests
   pnpm test

   # Run specific test file
   pnpm test tests/commands/vector-store/upload.test.ts

   # Run tests in watch mode
   pnpm test --watch
   ```

4. **Lint and format:**

   ```bash
   pnpm lint          # Check for issues
   pnpm lint --fix    # Auto-fix issues
   pnpm format        # Format code
   ```

#### Project Structure

```
src/
├── bin/mxbai.ts              # CLI entry point
├── commands/                 # All CLI commands
│   ├── config/              # Configuration commands
│   │   ├── get.ts          # Get config values
│   │   ├── set.ts          # Set config values
│   │   └── index.ts
│   └── vector-store/        # Vector store commands
│       ├── files/           # File management subcommands
│       │   ├── delete.ts
│       │   ├── get.ts
│       │   ├── list.ts
│       │   └── index.ts
│       ├── create.ts        # Create vector store
│       ├── delete.ts        # Delete vector store
│       ├── get.ts           # Get vector store details
│       ├── list.ts          # List vector stores
│       ├── qa.ts            # Q&A functionality
│       ├── search.ts        # Search functionality
│       ├── sync.ts          # Sync files
│       ├── update.ts        # Update vector store
│       ├── upload.ts        # Upload files
│       └── index.ts
├── utils/                   # Shared utilities
│   ├── client.ts           # API client setup
│   ├── config.ts           # Configuration management
│   ├── git.ts              # Git integration utilities
│   ├── global-options.ts   # Common CLI options
│   ├── hash.ts             # File hashing utilities
│   ├── manifest.ts         # Manifest file handling
│   ├── metadata.ts         # Metadata validation
│   ├── output.ts           # Output formatting
│   ├── sync-state.ts       # Sync state management
│   ├── sync.ts             # Sync logic
│   ├── upload.ts           # Upload utilities
│   └── vector-store.ts     # Vector store helpers
└── index.ts                # Package exports

tests/
├── commands/               # Command tests
├── utils/                 # Utility tests
└── __mocks__/             # Jest mocks
```

#### Adding New Commands

1. **Create command file** in `src/commands/vector-store/`:

   ```typescript
   // src/commands/vector-store/my-command.ts
   import { Command } from 'commander';
   import { addGlobalOptions } from '../../utils/global-options';

   export function createMyCommand(): Command {
     return addGlobalOptions(
       new Command('my-command')
         .description('My new command')
         .argument('<arg>', 'Required argument')
         .option('--flag', 'Optional flag'),
     ).action(async (arg, options) => {
       // Implementation
     });
   }
   ```

2. **Register command** in `src/commands/vector-store/index.ts`:

   ```typescript
   import { createMyCommand } from './my-command';

   // Add to vectorStoreCommand
   vectorStoreCommand.addCommand(createMyCommand());
   ```

3. **Add tests** in `tests/commands/vector-store/my-command.test.ts`:

   ```typescript
   import { createMyCommand } from '../../../src/commands/vector-store/my-command';

   describe('My Command', () => {
     it('should work correctly', async () => {
       // Test implementation
     });
   });
   ```

#### Debugging

- Use `--debug` flag for verbose output: `pnpm mxbai --debug vs list`
- Set `MXBAI_DEBUG=true` environment variable for debug output
- Debug output includes command hierarchy options and merged options
- Tests include detailed error messages and mock setups
