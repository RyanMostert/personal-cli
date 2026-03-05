# @personal-cli/tools

The default toolkit for Personal CLI. This package contains over 20+ specialized AI tools for filesystem operations, project exploration, web search, and automation.

## 🛠️ Included Tools

### Filesystem
- **`readFile`**: Reads content from files with safety checks.
- **`writeFile` / `editFile`**: Create and modify files with `undo/redo` support.
- **`patch`**: Applies unified diffs to multiple files at once.
- **`listDir` / `globFiles`**: Explore directory structures and find files matching patterns.
- **`searchFiles`**: Full-text regex search through the project.

### Information & Search
- **`webSearch`**: Web search via Google Custom Search, Tavily, Jina Search, or DuckDuckGo (auto-selected by available API keys).
- **`webFetch`**: High-quality markdown extraction from any URL (using Jina Reader).
- **`semanticSearch`**: Vector-based code search (requires embedding provider).

### Git Operations
- **`gitStatus`**: Show current working tree status.
- **`gitDiff`**: Unified diff of changes.
- **`gitLog`**: Commit history exploration.
- **`gitCommit`**: Create commits with AI-generated messages.

### Project & Analysis
- **`diagnostics`**: Check for linter or compiler errors.
- **`todoRead` / `todoWrite`**: Manage project tasks via a centralized TODO system.
- **`question`**: Interactive multi-choice prompt for clarifying user intent.
- **`runCommand`**: Executes shell commands with permission control.

## 🔐 Permission System

The tools package includes a robust rule-based permission system:

- **Modes**:
  - `ask`: Every risky tool execution requires user approval.
  - `plan`: Read-only operations are auto-allowed; write/execute require approval.
  - `build`: Common development tasks are allowed; dangerous commands still ask.
  - `auto`: Fully autonomous mode (use with caution).
- **Rules**: Supports path-based glob patterns (e.g., allow `writeFile` in `./src/` but deny in `.git/`).

## 🔌 Plugin System

Personal CLI can be extended with external tools:
- **Local Plugins**: Drop `.js` or `.ts` files into the `plugins/` directory.
- **MCP Integration**: Connect any [Model Context Protocol](https://modelcontextprotocol.io/) server to instantly add new capabilities (PostgreSQL, Docker, AWS, etc.).

## 🚀 Development

```bash
# Build the tools package
pnpm run build

# Watch mode for development
pnpm run dev
```
