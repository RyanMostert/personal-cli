# @personal-cli/cli

The React/Ink terminal interface for Personal CLI.

## 🎨 UI Features

- **Multi-pane Layout**: Main chat area with an optional Side Panel for file viewing and diffs.
- **Side Panel**: Automatically opens when tools like `editFile` or `open` are used. Supports syntax highlighting and patch previews.
- **Status Bar**: Real-time display of active model, tokens used, cost, agent mode, and MCP server status.
- **Tool Cards**: Expandable cards for tool execution status, duration, and results.
- **Streaming**: Live rendering of AI reasoning (thoughts) and text responses.
- **Wizards**: Interactive setup flows for API providers and MCP servers.

## ⌨️ Keybindings

| Key      | Action                                      |
| -------- | ------------------------------------------- |
| `Tab`    | Cycle Agent Mode (`ask` → `plan` → `build`) |
| `Ctrl+M` | Open Model Picker                           |
| `Ctrl+P` | Open Provider Manager                       |
| `Ctrl+H` | Open Conversation History                   |
| `Ctrl+K` | Open Keybinding Manager                     |
| `Ctrl+O` | Open File Explorer                          |
| `Ctrl+T` | Cycle focus through tool calls              |
| `Ctrl+R` | Toggle Reasoning/Thoughts panel             |
| `Ctrl+L` | Toggle focus between Input and Side Panel   |
| `Ctrl+C` | Exit application                            |
| `?`      | Show Quick Help overlay                     |

## 🛠️ Components

- **`MarkdownRenderer`**: Renders complex markdown including tables and code blocks.
- **`ToolCallView`**: Manages the lifecycle and display of AI tool executions.
- **`PatchView`**: Specialized view for showing unified diffs of file changes.
- **`MCPManager`**: UI for connecting and managing MCP servers.
- **`Autocomplete`**: Context-aware suggestions for commands (`/`) and files (`@`).

## 🚀 Development

```bash
# Run in development mode with hot-reloading
pnpm run dev

# Build for production
pnpm run build
```
