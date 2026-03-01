# personal-cli Build Status

## What Has Been Done

### Monorepo Structure
- Root `package.json` with pnpm workspaces + Turborepo v2
- `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.npmrc`
- All packages scaffold created

### `packages/shared` — COMPLETE
- `src/types/index.ts` — all types: `ProviderName`, `Message`, `Conversation`, `StreamEvent`, `AgentConfig`, etc.
- `src/config/schema.ts` — Zod schemas for `AppConfigSchema`, `ProvidersConfigSchema`, `PermissionsConfigSchema`
- `src/constants/index.ts` — `DEFAULT_PROVIDER`, `DEFAULT_MODEL`, `OPENCODE_BASE_URL`, `TOOL_OUTPUT_MAX_CHARS`
- `src/utils/id.ts` — `generateId()` via `globalThis.crypto.randomUUID()`
- `src/index.ts` — barrel export

### `packages/core` — COMPLETE (single-turn, no tools yet)
- `src/providers/manager.ts` — `ProviderManager` class supporting `anthropic`, `openai`, `opencode-zen`, `custom`
  - OpenCode uses `client.chat(modelId)` → `/chat/completions` (critical fix)
  - Base URL: `https://opencode.ai/zen/v1`
- `src/agent.ts` — `Agent` class, single-turn `streamText`, `textStream` loop, usage tracking
- `src/config/loader.ts` — `loadConfig()`, `getDefaultModel()`
- `src/index.ts` — barrel export

### `packages/cli` — COMPLETE (basic chat, no tool UI yet)
- `src/bin.ts` — entry point, checks API keys, renders `<App>`
- `src/app.tsx` — main layout: StatusBar + message list + StreamingMessage + InputBox
  - Slash commands: `/exit`, `/quit`, `/clear`
- `src/hooks/useAgent.ts` — React hook bridging Agent async generator → state
- `src/components/StatusBar.tsx` — provider/model/token display
- `src/components/MessageView.tsx` — user (blue) / assistant (green) messages
- `src/components/StreamingMessage.tsx` — spinner + partial markdown
- `src/components/InputBox.tsx` — ink-text-input, disabled during streaming
- `src/components/MarkdownRenderer.tsx` — marked.lexer() + shiki syntax highlighting
- `src/highlight.ts` — `codeToANSI()` wrapper

### `packages/tools` — 10/11 FILES DONE
All tool implementation files created:
- `src/types.ts` — `PermissionCallback` type
- `src/tools/read-file.ts` — read file with optional line range, truncation
- `src/tools/write-file.ts` — factory `createWriteFile(permissionFn?)`
- `src/tools/edit-file.ts` — factory `createEditFile(permissionFn?)`, exact string replace
- `src/tools/list-dir.ts` — recursive directory tree listing
- `src/tools/search-files.ts` — recursive regex content search
- `src/tools/glob-files.ts` — fast-glob pattern matching
- `src/tools/run-command.ts` — factory `createRunCommand(permissionFn?)`, child_process.exec
- `src/tools/web-fetch.ts` — factory `createWebFetch(permissionFn?)`, HTML→text
- `src/tools/git.ts` — `gitStatus`, `gitDiff`, `gitLog` (auto), `createGitCommit(permissionFn?)` (ask)
- `src/tools/think.ts` — no-op scratchpad

**MISSING: `src/index.ts`** — barrel export + `createTools()` factory (was about to write this)

---

## What Still Needs To Be Done

### 1. `packages/tools/src/index.ts` ← NEXT IMMEDIATE TASK
Create barrel export with `createTools(permissionFn?)` factory:
```ts
export function createTools(permissionFn?: PermissionCallback) {
  return {
    readFile,
    writeFile: createWriteFile(permissionFn),
    editFile: createEditFile(permissionFn),
    listDir,
    searchFiles,
    globFiles,
    runCommand: createRunCommand(permissionFn),
    webFetch: createWebFetch(permissionFn),
    gitStatus, gitDiff, gitLog,
    gitCommit: createGitCommit(permissionFn),
    think,
  };
}
```

### 2. `packages/shared/src/types/index.ts` — Extend StreamEvent
Add tool event types to `StreamEvent`:
```ts
export type StreamEventType =
  | 'text-delta'
  | 'tool-call-start'   // agent called a tool (show spinner)
  | 'tool-call-result'  // tool returned (show result)
  | 'finish'
  | 'error';

export interface ToolCallInfo {
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

// Add to StreamEvent:
toolCall?: ToolCallInfo;
```

### 3. `packages/core/src/agent.ts` — Multi-step tool loop
- Add `tools?: Record<string, Tool>` and `maxSteps?: number` to `AgentOptions`
- Switch from `textStream` → `fullStream` iteration
- Handle these fullStream event types (confirmed from AI SDK v6 .d.mts):
  - `text-delta` → `.text` property
  - `tool-call` → `.toolCallId`, `.toolName`, `.input` (NOT `.args`)
  - `tool-result` → `.toolCallId`, `.toolName`, `.output`
- Emit `tool-call-start` and `tool-call-result` `StreamEvent`s
- Pass `tools` and `maxSteps: 20` to `streamText()`
- Tools already have permissionFn baked in — no extra wiring needed in agent

**Key finding from SDK grep:** `StaticToolCall` has `toolName` and `input` (not `args`).

### 4. `packages/tools/package.json` — Add to workspace
Currently exists but need to verify it's included in pnpm workspace and depends on `@personal-cli/shared`.

### 5. `packages/cli` — Tool UI Components

#### New: `src/components/ToolCallView.tsx`
Shows a tool call in progress or completed:
```
  ⚙ run_command    "npm test"          [running...]
  ✓ read_file      "src/app.ts"        [done]
  ✗ write_file     "config.json"       [denied]
```

#### New: `src/components/PermissionPrompt.tsx`
Inline permission request — user presses y/n:
```
  Allow write_file "src/config.ts"? [y/N]
```

#### Update: `src/hooks/useAgent.ts`
- Add `permissionCallback` that creates a Promise and exposes it to React state
- Add `pendingPermission` state: `{ toolName, args, resolve } | null`
- Handle `tool-call-start` and `tool-call-result` events → update `toolCalls` state
- Export `toolCalls`, `pendingPermission`, `approvePermission`, `denyPermission`

#### Update: `src/app.tsx`
- Render `<ToolCallView>` for each active tool call
- Render `<PermissionPrompt>` when `pendingPermission` is set
- Add slash commands:
  - `/help` — show available commands
  - `/model <provider> <modelId>` — switch model
  - `/cost` — show token usage and cost
  - `/mode <ask|auto|build>` — switch agent mode
  - `/compact` — summarize conversation to save tokens

### 6. Build & Install
```bash
export PATH="$PATH:/c/Users/ramos/AppData/Roaming/npm"
pnpm install   # picks up new packages/tools package
pnpm build     # builds all packages in dependency order
```

Then test with:
```powershell
$env:OPENCODE_API_KEY="sk-fiLWfrX..."; node packages\cli\dist\bin.js
```

---

## What I Was Busy With When Interrupted

I had just finished reading the AI SDK type definitions to determine the **exact property names** on `fullStream` events, because the summary was slightly inconsistent (mentioned `tool-input-start` in one place but the actual SDK has `tool-call`).

**Findings from grep of `/node_modules/ai/dist/index.d.mts`:**
- `text-delta` stream part: `{ type: 'text-delta', text: string }`
- `tool-call` stream part: `{ type: 'tool-call', toolCallId: string, toolName: string, input: <params> }`
  - Property is `input` not `args` (StaticToolCall uses `input`)
- `tool-result` stream part: `{ type: 'tool-result', toolCallId: string, toolName: string, output: unknown }`
- `tool-input-start` is a **lower-level streaming event** (while args are being streamed, not needed)

The next step was to write `packages/tools/src/index.ts` and then immediately update `packages/core/src/agent.ts`.

---

## Key Config/Env Facts
- pnpm path: `/c/Users/ramos/AppData/Roaming/npm`
- OpenCode API key env var: `OPENCODE_API_KEY`
- Default provider: `opencode-zen`, base URL: `https://opencode.ai/zen/v1`
- Default model: `kimi-k2.5-free`
- AI SDK v6: `maxOutputTokens`, `inputTokens`, `outputTokens`, `fullStream`
- `@ai-sdk/openai` v2: use `.chat(modelId)` for chat completions endpoint
