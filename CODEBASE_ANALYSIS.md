# Personal-CLI Codebase Architecture

## Overview

Personal-CLI is a monorepo using **Turborepo** + **pnpm** that provides an AI-powered CLI with TUI (Terminal UI).

## Package Structure

```
personal-cli/
├── packages/
│   ├── cli/           # Main TUI application (Ink/React)
│   ├── core/          # Agent logic & AI provider management
│   ├── tools/         # Built-in tools (30+)
│   ├── shared/        # Types, schemas, constants
│   ├── mcp-client/    # MCP (Model Context Protocol) client
│   ├── zen-mcp-server/# Zen Gateway MCP server
│   └── tui/           # Re-exports from cli
```

## Entry Points

| Package    | File                 | Purpose                  |
| ---------- | -------------------- | ------------------------ |
| cli        | `bin.ts` → `app.tsx` | CLI entry, Ink rendering |
| core       | `agent.ts`           | Agent class              |
| tools      | `index.ts`           | Tool creation            |
| shared     | `types/index.ts`     | Type definitions         |
| mcp-client | `manager.ts`         | MCP server management    |

## Application Flow

```
User Input (InputBox)
    ↓
App.handleSubmit() [app.tsx:787-1247]
    ↓
useAgent.sendMessage() [hooks/useAgent.ts:108-255]
    ↓
Agent.sendMessage() [core/agent.ts:302-811]
    ↓
ProviderManager.getModel() → AI SDK streamText()
    ↓
Streaming Events (text-delta, thought-delta, tool-call-*, etc.)
    ↓
React State Update → UI Render
```

## Component Architecture

```
App (app.tsx)
├── ThemeContext / OverlayContext
├── Messages (MessageView)
│   └── ToolCallView
├── InputBox
├── StatusBar
└── Overlays (conditional)
    ├── ModelPicker
    ├── ProviderManager / ProviderWizard
    ├── MCPManager / MCPWizard
    ├── HistoryPicker
    └── FileExplorer
```

## Key Files Reference

| Feature      | File                            | Key Lines |
| ------------ | ------------------------------- | --------- |
| CLI Entry    | `cli/src/bin.ts`                | 36-64     |
| Main App     | `cli/src/app.tsx`               | 123-1250  |
| Agent        | `core/src/agent.ts`             | 50-891    |
| useAgent     | `cli/src/hooks/useAgent.ts`     | 1-396     |
| Providers    | `core/src/providers/manager.ts` | 308-364   |
| Tools        | `tools/src/index.ts`            | 50-115    |
| Permissions  | `tools/src/types.ts`            | 10-58     |
| MCP Manager  | `mcp-client/src/manager.ts`     | 4-133     |
| Shared Types | `shared/src/types/index.ts`     | 1-156     |

## AI Providers (22 supported)

anthropic, openai, google, opencode, opencode-zen, openrouter, groq, deepseek, github-copilot, google-vertex, amazon-bedrock, azure, mistral, ollama, xai, perplexity, cerebras, together, custom

## Built-in Tools (30+)

- **File**: readFile, writeFile, editFile, globFiles, listDir
- **Search**: searchFiles, semanticSearch, webSearch, webFetch
- **Git**: gitStatus, gitDiff, gitLog, gitCommit
- **System**: runCommand, runTests, diagnostics
- **Utility**: patch, batchEdit, question, notifyUser, todoWrite

---

## Issues & Improvements

### High Priority

| Issue                   | Location                                                    | Description                      |
| ----------------------- | ----------------------------------------------------------- | -------------------------------- |
| Excessive `any` types   | `core/agent.ts:56,172,209,271,343,368,457,464,483`          | 14+ instances defeat type safety |
| Missing tests           | `agent.ts`, `manager.ts`, `useAgent.ts`, `tool-fallback.ts` | Core files have no tests         |
| Massive app.tsx         | `cli/app.tsx`                                               | 1,496 lines - should be split    |
| Silent error swallowing | `core/agent.ts:93-95,252-261,804`                           | Errors silently ignored          |

### Medium Priority

| Issue                     | Location                         | Description                       |
| ------------------------- | -------------------------------- | --------------------------------- |
| Magic numbers             | `core/agent.ts:78,304,341,361`   | Should be named constants         |
| Missing error boundaries  | `cli/app.tsx`                    | No React error boundaries         |
| Hardcoded API keys        | `core/providers/manager.ts:128+` | `'sk-no-key-needed'` placeholders |
| Plugin loading sync issue | `core/agent.ts:104-112`          | Async plugin, sync buildTools     |

### Low Priority

| Issue            | Location         | Description                        |
| ---------------- | ---------------- | ---------------------------------- |
| Missing JSDoc    | Throughout       | No docs on public APIs             |
| No cancellation  | Async operations | Unmounted components still process |
| Console.\* usage | Throughout       | Should use proper logger           |

---

## Recommendations

1. **Add tests** for core agent logic (agent.ts, manager.ts)
2. **Split app.tsx** into smaller components (CommandHandler, InputHandler)
3. **Replace `any` types** with proper interfaces
4. **Extract magic numbers** to constants
5. **Add error boundaries** around major UI components
6. **Implement proper logging** (replace console.\*)
7. **Add input validation** for file paths and commands
