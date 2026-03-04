# Personal CLI — Intensive Feature Gap Analysis & Implementation Plan

> Deep-dive comparison against **OpenCode** (anomalyco/opencode) — every missing feature rated by urgency, with exact file paths for implementation.

---

## 📊 Current App State (What We Have)

### ✅ Working

| Feature                                                                                    | Location                                                                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Multi-provider AI (OpenAI, Anthropic, Google, Ollama, OpenCode Zen, Copilot)               | `packages/core/src/providers/manager.ts`                                                          |
| Streaming text + Markdown rendering                                                        | `packages/cli/src/components/StreamingMessage.tsx`, `MarkdownRenderer.tsx`                        |
| Tool call display (read/write/edit/run/search/glob/git/web)                                | `packages/cli/src/components/ToolCallView.tsx`                                                    |
| Permission prompt (Y/N/Always)                                                             | `packages/cli/src/components/PermissionPrompt.tsx`                                                |
| Model picker UI                                                                            | `packages/cli/src/components/ModelPicker.tsx`                                                     |
| Provider manager + wizard                                                                  | `packages/cli/src/components/ProviderManager.tsx`, `ProviderWizard.tsx`                           |
| Conversation history (save/load/browse)                                                    | `packages/core/src/persistence/conversations.ts`, `packages/cli/src/components/HistoryPicker.tsx` |
| Slash command registry                                                                     | `packages/cli/src/commands/registry.ts`                                                           |
| Command autocomplete                                                                       | `packages/cli/src/components/CommandAutocomplete.tsx`                                             |
| File autocomplete (`@file`, `/add`, `/open`)                                               | `packages/cli/src/components/FileAutocomplete.tsx`                                                |
| Side panel (file viewer + diff viewer)                                                     | `packages/cli/src/components/SidePanel.tsx`                                                       |
| Status bar (provider/model/tokens/mode)                                                    | `packages/cli/src/components/StatusBar.tsx`                                                       |
| Input history (↑↓ navigation)                                                              | `packages/cli/src/app.tsx`                                                                        |
| Agent modes (ask/auto/build)                                                               | `packages/core/src/agent.ts`                                                                      |
| Conversation export to Markdown                                                            | `packages/core/src/index.ts`                                                                      |
| `/compact` method exists on Agent                                                          | `packages/core/src/agent.ts` (`compact()` method)                                                 |
| Tools: read/write/edit/list/search/glob/git/run/webfetch/semantic-search/think/diagnostics | `packages/tools/src/tools/`                                                                       |
| Frecency-based file suggestions                                                            | `packages/core/src/persistence/frecency.ts`                                                       |
| Settings file (`~/.personal-cli/settings.json`)                                            | `packages/core/src/config/loader.ts`                                                              |

### ⚠️ Stub / Broken / Half-Done

| Feature                                  | Status                                                                         | Location                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `/compact` command                       | Calls `addSystemMessage('Compacting…')` but never calls `agent.compact()`      | `packages/cli/src/commands/registry.ts:110`                                                                       |
| `/theme` command                         | Prints a message only — no actual theme applied to UI                          | `packages/cli/src/commands/registry.ts:122`                                                                       |
| `/rename` command                        | Prints a message only — not persisted                                          | `packages/cli/src/commands/registry.ts:93`                                                                        |
| `/copy` command                          | Prints "Copied" — never touches clipboard API                                  | `packages/cli/src/commands/registry.ts:100`                                                                       |
| `plan` mode                              | Mode is set but `write_file`/`edit_file`/`run_command` not actually restricted | `packages/tools/src/index.ts`                                                                                     |
| MCP client                               | ✅ Fully implemented with MCPManager, MCPWizard, and all commands              | `packages/mcp-client/`, `packages/cli/src/components/MCPManager.tsx`, `packages/cli/src/components/MCPWizard.tsx` |
| LSP integration                          | `diagnostics` tool shells out to `tsc`, not real LSP protocol                  | `packages/tools/src/tools/diagnostics.ts`                                                                         |
| Docker sandbox                           | Planned, not started                                                           | Missing entirely                                                                                                  |
| Web search tool                          | Not implemented (only `web-fetch` exists)                                      | Missing                                                                                                           |
| `/undo` + `/redo`                        | Not implemented                                                                | Missing                                                                                                           |
| `/init` — AGENTS.md project init         | Not implemented                                                                | Missing                                                                                                           |
| `/share` — conversation sharing          | Not implemented                                                                | Missing                                                                                                           |
| `todowrite` / `todoread` tools           | Not implemented                                                                | Missing                                                                                                           |
| `question` tool (LLM asks user mid-task) | Not implemented                                                                | Missing                                                                                                           |
| `patch` tool (apply unified diffs)       | Not implemented                                                                | Missing                                                                                                           |
| Auto-compaction when context fills       | Not implemented                                                                | Missing                                                                                                           |
| Config JSON schema                       | Uses YAML, no validation, no schema                                            | `packages/core/src/config/loader.ts`                                                                              |
| Autoupdate notification                  | Not implemented                                                                | Missing                                                                                                           |
| `@mention` subagents                     | Not implemented                                                                | Missing                                                                                                           |
| AGENTS.md / rules / instructions file    | Not implemented                                                                | Missing                                                                                                           |
| Image attachment (drag & drop)           | Not implemented                                                                | Missing                                                                                                           |
| `skill` tool                             | Not implemented                                                                | Missing                                                                                                           |
| Tab key → cycle Build/Plan mode          | Tab unused in `app.tsx`                                                        | `packages/cli/src/app.tsx`                                                                                        |
| Custom agents via config/markdown        | Not implemented                                                                | Missing                                                                                                           |

---

## 🎯 Priority Implementation Roadmap

### TIER 1 — Critical for Working Condition (do these first)

---

#### 1.1 Fix `/compact` so it actually compacts

**Why**: Completely broken stub — long sessions will crash with token limit errors  
**Files**:

- `packages/cli/src/commands/registry.ts` → call `ctx.compact()` in handler
- `packages/cli/src/types/commands.ts` → add `compact: () => Promise<void>` to `CommandContext`
- `packages/cli/src/hooks/useAgent.ts` → expose `compact` from the agent
- `packages/cli/src/app.tsx` → pass `compact` into command context

**Tasks**:

- [x] Add `compact(): Promise<void>` to `CommandContext` type
- [x] Expose `compact` callback in `useAgent.ts` (calls `agent.compact()`, then syncs messages)
- [x] Fix `/compact` handler in `registry.ts` to call `ctx.compact()` instead of stub message
- [x] Show compaction result as system message in chat

---

#### 1.2 Auto-compaction when context fills

**Why**: Without this, sessions silently fail at token limit with no recovery  
**Files**: `packages/core/src/agent.ts` → `sendMessage()`

**Tasks**:

- [x] Before each LLM call, check `totalTokensUsed > tokenBudget * 0.85`
- [x] If over threshold, call `this.compact()` automatically
- [x] Emit a `system` type event to TUI: "Auto-compacted context to save tokens"

---

#### 1.3 Fix `plan` mode — enforce read-only correctly

**Why**: Plan mode is declared but tools don't actually restrict anything  
**Files**: `packages/tools/src/index.ts` → `createTools()`

**Tasks**:

- [x] In `createTools()`, when `mode === 'plan'`, force `write_file`, `edit_file`, `run_command` through `permissionFn` (always ask)
- [x] Add **Tab key** in `app.tsx` to cycle `ask → build → plan → ask` (opencode's UX)
- [x] Update `StatusBar` to show mode with colours (green=build, yellow=ask, red=plan)

---

#### 1.4 Fix `/copy` to actually copy to clipboard

**Why**: Registered command that silently does nothing  
**Files**: `packages/cli/src/commands/registry.ts:100-105`

**Tasks**:

- [x] `pnpm add clipboardy` in `packages/cli`
- [x] Replace stub with real `clipboardy.write(last.content)` call

---

#### 1.5 Fix `/rename` — persist conversation title

**Why**: Stub only prints a message; users can never name sessions  
**Files**:

- `packages/core/src/persistence/conversations.ts` → add `renameConversation(id, title)`
- `packages/cli/src/types/commands.ts` → add `renameConversation` to `CommandContext`
- `packages/cli/src/hooks/useAgent.ts` → expose it
- `packages/cli/src/commands/registry.ts` → call `ctx.renameConversation(args)`

**Tasks**:

- [x] Add `renameConversation(id, title)` to persistence layer
- [x] Expose via `useAgent` and `CommandContext`
- [x] Wire into `/rename` handler

---

#### 1.6 Fix `/theme` — actually apply themes

**Why**: Command does nothing; a coding tool should look good  
**Files**:

- `packages/shared/src/themes/index.ts` → define palette types (new)
- `packages/cli/src/context/ThemeContext.tsx` → React context + `useTheme()` (new)
- All components → read from `useTheme()` instead of hardcoded hex values
- `packages/cli/src/commands/registry.ts` → call `ctx.setTheme(args)`

**Tasks**:

- [x] Define 5 themes: `default`, `dracula`, `tokyo-night`, `nord`, `gruvbox`
- [x] Create `ThemeContext` with `useTheme()` hook
- [x] Wire `/theme <name>` to update context and persist to `settings.json`
- [x] Update `StatusBar`, `MessageView`, `ToolCallView`, `InputBox` to use theme colours

---

### TIER 2 — High-Value Missing Features

---

#### 2.1 `/undo` and `/redo` commands

**Why**: OpenCode's most-used safety feature. Without it users `git checkout` every mistake.  
**Files**:

- `packages/core/src/persistence/undo-stack.ts` (new) — stack of `{ path, before, after }`
- `packages/tools/src/tools/write-file.ts` + `edit-file.ts` → push to undo stack before writing
- `packages/cli/src/commands/registry.ts` → add `/undo` and `/redo` handlers
- `packages/cli/src/types/commands.ts` → add `undo`, `redo` to `CommandContext`

**Tasks**:

- [x] Create `UndoStack` class: `push(path, before, after)`, `undo()`, `redo()`
- [x] Patch `write_file` and `edit_file` tools to push before every write
- [x] Add `/undo` — restore last changed file(s)
- [x] Add `/redo` — re-apply undone change

---

#### 2.2 `todowrite` / `todoread` Tools

**Why**: OpenCode uses these for autonomous multi-step task tracking. Without them the LLM loses track of complex tasks.  
**Files**: `packages/tools/src/tools/todo.ts` (new), `packages/tools/src/index.ts`

**Tasks**:

- [x] Create `todowrite` — write/update a session-scoped task list (in-memory Map + temp file)
- [x] Create `todoread` — read current task list
- [x] Register both in tool index

---

#### 2.3 `question` Tool — LLM asks user mid-task

**Why**: LLM can pause and ask clarifying questions instead of guessing. Prevents wasted tool calls.  
**Files**:

- `packages/tools/src/tools/question.ts` (new) — yields a special `question` result type
- `packages/cli/src/components/QuestionPrompt.tsx` (new) — renders options, user selects/types
- `packages/cli/src/hooks/useAgent.ts` → intercept `question` tool results and surface to UI

**Tasks**:

- [x] Build `question` tool that emits a `question` event with header + options
- [x] Build `QuestionPrompt` component (multiple choice or free text)
- [x] Wire into `useAgent` event loop alongside `pendingPermission`

---

#### 2.4 `/init` — AGENTS.md Project Initialization

**Why**: OpenCode's `/init` analyzes the project and writes `AGENTS.md` — persists project context across sessions, saves huge token counts.  
**Files**:

- `packages/cli/src/commands/registry.ts` → add `/init` handler
- `packages/core/src/agent.ts` → add `initProject()` method
- `packages/core/src/prompts/default.ts` → on startup, inject `AGENTS.md` content if present

**Tasks**:

- [x] Add `/init` command that sends a one-shot analysis prompt and writes `AGENTS.md`
- [x] On startup, `existsSync('AGENTS.md')` → prepend to system prompt
- [ ] Document in welcome screen

---

#### 2.5 Web Search Tool

**Why**: `webfetch` exists but web _search_ is missing — can't research topics without it  
**Files**: `packages/tools/src/tools/web-search.ts` (new), `packages/tools/src/index.ts`

**Tasks**:

- [x] Create `web_search` tool using DuckDuckGo instant answers (free, no key required)
- [x] Add Tavily as upgrade path when `TAVILY_API_KEY` is set
- [x] Register in tool index

---

#### 2.6 MCP Client (`packages/mcp-client/`)

**Why**: OpenCode's ecosystem play — lets users plug in GitHub, Jira, Sentry, databases. Zero MCP = huge gap vs opencode.  
**Files**:

- `packages/mcp-client/` (entire new package)
- `packages/mcp-client/src/client.ts` — StdioClientTransport + StreamableHTTPClientTransport
- `packages/mcp-client/src/manager.ts` — start/stop servers, list tools, forward calls
- `packages/core/src/config/loader.ts` → read `mcp` section from config
- `packages/tools/src/index.ts` → merge MCP tools into the tool registry at startup
- `packages/cli/src/commands/registry.ts` → add `/mcp list` command

**Config format** (add to `~/.personal-cli/config.json`):

```json
{
  "mcp": {
    "github": {
      "type": "remote",
      "url": "https://api.githubcopilot.com/mcp/",
      "enabled": true
    },
    "my-local": {
      "type": "local",
      "command": ["npx", "-y", "my-mcp-server"],
      "enabled": true
    }
  }
}
```

**Tasks**:

- [x] `pnpm add @modelcontextprotocol/sdk` in new `packages/mcp-client`
- [x] Build `MCPClientManager` (start, stop, listTools, callTool)
- [x] Integrate into tool system — merge MCP tools dynamically
- [x] Add `/mcp list` command to show loaded MCP servers and their tools
- [x] Show MCP tool calls in `ToolCallView` with distinct icon (🔌)
- [x] Create `MCPManager` component for interactive server management
- [x] Create `MCPWizard` component for adding/editing servers
- [x] Add all `/mcp` subcommands (add, edit, remove, connect, disconnect, reload)

---

### TIER 3 — Power User Features

---

#### 3.1 `patch` Tool — Apply Unified Diffs

**Why**: AI often generates patch/diff format. Without this tool it has to re-write whole files.  
**Files**: `packages/tools/src/tools/patch.ts` (new)

**Tasks**:

- [x] Create `patch` tool that applies a unified diff string to a file (no extra package needed)
- [x] Register in tool index

---

#### 3.2 Real LSP Integration (`packages/lsp-client/`)

**Why**: Our `diagnostics` tool shells `tsc` — slow, TypeScript-only, no hover/definition/references. OpenCode supports 30+ languages via LSP.  
**Files**:

- `packages/lsp-client/` (new package) using `vscode-languageclient` / raw JSON-RPC
- `packages/tools/src/tools/lsp.ts` → LSP operations as a tool (hover, goToDefinition, findReferences, diagnostics)
- Config: `lsp` section in `~/.personal-cli/config.json`

**Tasks**:

- [ ] Create `LspClientManager` — start/manage language servers per file extension
- [ ] Implement `lsp` tool with: `hover`, `goToDefinition`, `findReferences`, `diagnostics`
- [ ] Auto-start TypeScript LSP when `.ts`/`.tsx` files detected
- [ ] Replace current `diagnostics.ts` tool with LSP-backed version

---

#### 3.3 Custom Agents via Config & Markdown

**Why**: OpenCode lets users define specialized agents (reviewer, docs-writer) via config or `.opencode/agents/*.md`.  
**Files**:

- `packages/shared/src/types/` → add `AgentDefinition` type
- `packages/core/src/config/loader.ts` → load `.personal-cli/agents/*.md` + `config.json` `agent` section
- `packages/core/src/agent.ts` → accept `AgentDefinition` for system prompt + tool permissions
- `packages/cli/src/components/AgentPicker.tsx` (new) — Tab key cycles primary agents
- `packages/cli/src/app.tsx` → handle `@agentName` mention syntax

**Tasks**:

- [ ] Define `AgentDefinition` schema (mode, prompt, tools, temperature, steps)
- [ ] Load agents from config + `.personal-cli/agents/*.md`
- [ ] Build `AgentPicker` (Tab key cycles primary agents)
- [ ] Support `@mention` to invoke subagents inline

---

#### 3.4 Config Migration: YAML → JSON with Schema

**Why**: OpenCode uses `opencode.json` + full JSON Schema for editor autocomplete. Our YAML has no validation.  
**Files**: `packages/core/src/config/loader.ts`, `packages/shared/src/config.schema.json` (new)

**Tasks**:

- [ ] Support `~/.personal-cli/config.json` as primary config (YAML stays as fallback)
- [ ] Write JSON Schema at `packages/shared/src/config.schema.json`
- [ ] Support project-level `personal-cli.json` in project root (overrides global)
- [ ] Merge global + project configs with correct precedence

---

#### 3.5 Image Attachment Support

**Why**: OpenCode supports dragging images into terminal. Critical for UI work, screenshots, diagrams.  
**Files**:

- `packages/cli/src/app.tsx` → detect image file paths from `/add`
- `packages/core/src/agent.ts` → include `ImagePart` in Vercel AI SDK messages

**Tasks**:

- [ ] Detect `.png/.jpg/.gif/.webp` in `/add` or `@file` paths
- [ ] Convert to base64, pass as `ImagePart` in message content array

---

#### 3.6 `/share` — Export to GitHub Gist

**Why**: OpenCode generates shareable links. Simpler version: export to GitHub Gist.  
**Files**: `packages/cli/src/commands/registry.ts`, `packages/core/src/sharing/gist.ts` (new)

**Tasks**:

- [ ] Create `createGist(title, markdown)` using GitHub API with `GITHUB_TOKEN`
- [ ] Add `/share` command — exports conversation, returns link, copies to clipboard

---

#### 3.7 Autoupdate Notification

**Why**: Users should know when a new version is available  
**Files**: `packages/cli/src/bin.ts`

**Tasks**:

- [ ] On startup, async fetch `npm view @personal-cli/cli version`
- [ ] If newer, show banner: `Update available vX.Y.Z — run npm i -g @personal-cli/cli`

---

### TIER 4 — Infrastructure & Distribution

---

#### 4.1 Docker Sandbox (`packages/sandbox/`)

### Note this is going to be skipped scope changed

**Why**: All `run_command` calls execute in user's shell — zero isolation  
**Files**: New `packages/sandbox/` package

**Tasks**:

- [ ] Build base Docker image (`docker/Dockerfile.sandbox`)
- [ ] `packages/sandbox/src/container.ts` — Dockerode lifecycle (create, exec, destroy)
- [ ] Pre-warmed container pool (~200ms execution vs cold 2s start)
- [ ] `/sandbox on|off` toggle command
- [ ] Network deny-by-default with LLM API allowlist

---

#### 4.2 npm Publishing Pipeline

**Tasks**:

- [ ] Verify `packages/cli/package.json` `bin` field points to compiled `bin.js`
- [ ] Turborepo build pipeline covers all packages in correct order
- [ ] GitHub Actions workflow: `npm publish` on version tag push
- [ ] `npx @personal-cli/cli` quick-start works without global install

---

## 🗺️ File-by-File Change Map

| File                                             | Changes Needed                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `packages/cli/src/commands/registry.ts`          | Fix `/compact`, `/copy`, `/rename`, `/theme`; add `/undo`, `/redo`, `/init`, `/share`, `/mcp`, `/sandbox` |
| `packages/cli/src/types/commands.ts`             | Add `compact`, `renameConversation`, `undo`, `redo`, `initProject`, `setTheme` to `CommandContext`        |
| `packages/cli/src/hooks/useAgent.ts`             | Expose `compact`, `renameConversation`, `undo`, `redo`                                                    |
| `packages/cli/src/app.tsx`                       | Tab → mode cycle; pass new ctx methods; `QuestionPrompt`; image drops                                     |
| `packages/cli/src/components/StatusBar.tsx`      | Mode colour coding (green=build, yellow=ask, red=plan)                                                    |
| `packages/cli/src/components/QuestionPrompt.tsx` | New — LLM mid-task question UI                                                                            |
| `packages/cli/src/context/ThemeContext.tsx`      | New — theme state + `useTheme()` hook                                                                     |
| `packages/core/src/agent.ts`                     | Auto-compaction threshold; `initProject()`; `renameConversation()`; emit system events                    |
| `packages/core/src/persistence/conversations.ts` | Add `renameConversation()`                                                                                |
| `packages/core/src/persistence/undo-stack.ts`    | New — undo/redo stack                                                                                     |
| `packages/core/src/config/loader.ts`             | Add JSON config; project-level config; `mcp` section parsing                                              |
| `packages/core/src/prompts/default.ts`           | Inject `AGENTS.md` content if present in CWD                                                              |
| `packages/tools/src/tools/write-file.ts`         | Push to undo stack before write                                                                           |
| `packages/tools/src/tools/edit-file.ts`          | Push to undo stack before edit                                                                            |
| `packages/tools/src/tools/web-search.ts`         | New tool                                                                                                  |
| `packages/tools/src/tools/todo.ts`               | New — `todowrite` + `todoread`                                                                            |
| `packages/tools/src/tools/question.ts`           | New — mid-task user question                                                                              |
| `packages/tools/src/tools/patch.ts`              | New — apply unified diff                                                                                  |
| `packages/tools/src/index.ts`                    | Register new tools; merge MCP tools at startup                                                            |
| `packages/mcp-client/`                           | Entire new package                                                                                        |
| `packages/sandbox/`                              | Entire new package                                                                                        |
| `packages/shared/src/themes/index.ts`            | New — theme palette definitions                                                                           |
| `packages/shared/src/config.schema.json`         | New — JSON Schema for config validation                                                                   |

---

## ⚡ Quick Wins (< 30 min each, do immediately)

- [ ] **Fix `/compact`** — add `compact` to ctx type, call `agent.compact()` in handler (~10 lines)
- [ ] **Fix `/copy`** — `pnpm add clipboardy`, replace stub (~5 lines)
- [ ] **Auto-compaction** — add token threshold check in `agent.ts` (~10 lines)
- [ ] **Tab key → mode cycle** — add `key.tab` handler in `app.tsx` (~5 lines)
- [ ] **AGENTS.md injection** — `existsSync('AGENTS.md')` in `default.ts`, prepend to prompt (~8 lines)
- [ ] **`todowrite`/`todoread` tools** — simple in-memory Map (~40 lines)
- [ ] **Web search tool** — DuckDuckGo instant answers, no API key (~50 lines)
- [ ] **`patch` tool** — `pnpm add diff`, apply unified diff (~30 lines)
- [ ] **Autoupdate notification** — async npm version check on startup (~15 lines)
- [ ] **Plan mode enforcement** — wrap tools in `createTools()` when `mode === 'plan'` (~10 lines)

---

## 🔢 Recommended Sprint Order

```
Sprint 1 — Fix what's broken (working condition):
  ✦ 1.1 Fix /compact
  ✦ 1.2 Auto-compaction threshold
  ✦ 1.3 Fix plan mode enforcement
  ✦ 1.4 Fix /copy clipboard
  ✦ 1.5 Fix /rename persistence
  ✦ 1.6 Fix /theme ThemeContext
  ✦ Tab key → mode cycle
  ✦ AGENTS.md injection on startup

Sprint 2 — Add missing essentials:
  ✦ 2.1 /undo + /redo + UndoStack
  ✦ 2.2 todowrite/todoread tools
  ✦ 2.3 question tool + QuestionPrompt UI
  ✦ 2.4 /init command + AGENTS.md generation
  ✦ 2.5 Web search tool
  ✦ patch tool

Sprint 3 — Ecosystem features:
  ✅ 2.6 MCP client (FULLY IMPLEMENTED)
  ✦ 3.2 Real LSP integration
  ✦ 3.3 Custom agents
  ✦ 3.4 Config JSON schema + project config

Sprint 4 — Distribution:
  ✦ 4.1 Docker sandbox
  ✦ 4.2 npm publishing pipeline
```

---

## 📌 OpenCode Features We Are NOT Copying (and why)

| Feature                                      | Reason                          |
| -------------------------------------------- | ------------------------------- |
| Desktop app (Electron/Tauri)                 | Out of scope — TUI-first        |
| mDNS server mode (`opencode serve`)          | Enterprise feature — not needed |
| Remote org config via `.well-known/opencode` | Enterprise feature — defer      |
| GitHub Action integration                    | Future — after CLI is stable    |
| Built-in browser / web UI                    | Terminal-native only            |
