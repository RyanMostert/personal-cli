# Personal CLI 🚀

A high-performance, developer-focused terminal assistant built with **React**, **Ink**, and **TypeScript**. Personal CLI provides a rich, interactive TUI for AI-driven automation, code refactoring, and project management.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Type](https://img.shields.io/badge/type-monorepo-orange.svg)
![Engine](https://img.shields.io/badge/engine-node-%3E%3D20-green.svg)

## ✨ Features

- 🖥️ **Rich TUI**: A modern, interactive terminal interface built with React and Ink.
- 🌊 **Real-time Streaming**: Instant visual feedback for AI thoughts and responses.
- 🛠️ **Advanced Toolset**: 20+ built-in tools for file I/O, git operations, web search, and semantic analysis.
- 📂 **Side Panel Diffs**: Visual patch previews and code exploration without leaving the CLI.
- 🔌 **MCP Integration**: Full support for Model Context Protocol (MCP) servers and external tools.
- 🔐 **Provider Manager**: Seamlessly switch between GitHub Copilot, OpenRouter, and other LLM providers.
- 📝 **Markdown Rendering**: Full terminal support for tables, code blocks, and rich text.
- ⌨️ **Keyboard Optimized**: Extensive keybindings and autocomplete for high-speed workflows.

## 🏗️ Architecture

This is a **PNPM Workspace** monorepo:

- **`packages/cli`**: The React/Ink terminal application.
- **`packages/core`**: Agent logic, conversation persistence, and provider management.
- **`packages/tools`**: Built-in AI tools (Git, Web, Filesystem, Semantic Search).
- **`packages/shared`**: Common types and utility functions.
- **`packages/mcp-client`**: Client implementation for MCP servers.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20 or higher.
- **PNPM**: Installed globally (`npm install -g pnpm`).
- **Python**: v3.x (required for some tools like clipboard image extraction).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/RyanMostert/personal-cli.git
   cd personal-cli
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build the project:
   ```bash
   pnpm run build
   ```

### Running the CLI

```bash
pnpm start
```

For development with hot-reloading:
```bash
cd packages/cli
pnpm run dev
```

## ⌨️ Common Commands

| Command | Description |
|---------|-------------|
| `/model` | Browse or switch LLM models/providers |
| `/mode` | Set agent mode: `ask` (safe) \| `plan` (research) \| `build` (writes code) |
| `/add <path>` | Attach a file to the conversation context |
| `/open <path>` | Open a file in the side panel for viewing |
| `/mcp` | Manage MCP servers and tools |
| `/help` | Show all available commands and tips |

## 🛠️ Built-in Tools

The agent has access to a wide range of capabilities, including:
- **Filesystem**: `readFile`, `writeFile`, `editFile`, `listDir`, `globFiles`
- **Search**: `webSearch`, `webFetch`, `semanticSearch`
- **Git**: `gitStatus`, `gitDiff`, `gitLog`, `gitCommit`
- **Analysis**: `diagnostics`, `todoRead`, `todoWrite`
- **Interactive**: `question`, `patch`

## 🤝 Contributing

We welcome contributions! Please see our branching strategy:
- Feature branches: `rm-dev/<feature-name>`
- Base branch: `main`

## 📄 License

MIT © [Ryan Mostert](https://github.com/RyanMostert)
