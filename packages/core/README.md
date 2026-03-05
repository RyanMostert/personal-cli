# @personal-cli/core

The logic and orchestration engine for Personal CLI. This package handles LLM provider management, agent execution, conversation persistence, and system-wide configuration.

## 🏗️ Core Architecture

- **`Agent`**: The main class that orchestrates `ai` (Vercel AI SDK) streams, tool executions, and state management.
- **`ProviderManager`**: Manages API keys and model configurations for providers like Anthropic, OpenAI, Google (Gemini), Bedrock, etc.
- **`Persistence`**: Handles conversation history (`history.ts`), frequent operations (`frecency.ts`), and undo/redo stacks (`undo-stack.ts`).
- **`Prompts`**: Contains the core system instructions and compaction logic for managing context window limits.

## ✨ Key Features

- **Multi-Provider Support**: Native integration with:
  - Anthropic (Claude)
  - Google (Gemini & Vertex AI)
  - OpenAI (GPT-4o, o1)
  - Amazon Bedrock
  - Mistral, Groq, X.AI, Azure
- **Auto-Compaction**: Automatically summarizes long conversations to stay within the model's token budget.
- **Tool Handling**: Seamlessly maps AI-generated tool calls to executable TypeScript functions from `@personal-cli/tools`.
- **Reasoning Stream**: Dedicated parsing for `<thought>` tags (and other model-specific reasoning deltas) to provide live feedback on the AI's internal monologue.
- **Undo/Redo**: Maintains a stack of filesystem changes made by the AI, allowing for easy reverts via the UI.

## 🚀 Development

```bash
# Build the core package
pnpm run build

# Watch mode for development
pnpm run dev
```

## ⚙️ Configuration

Persistence data (histories, auth keys) is stored in the user's home directory:
- **Windows**: `%APPDATA%/personal-cli/`
- **Linux/macOS**: `~/.config/personal-cli/`
