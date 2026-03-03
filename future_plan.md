# Future Vision — Commander Architecture (PTY Orchestration)

> This is the **next phase** after the current plan.md is complete.
> Most of `packages/core`, `packages/cli`, and `packages/tools` carry over directly.
> The new piece is a PTY orchestration layer on top.

---

## The Concept

Your CLI becomes a **commander of CLI agents** — it spins up real interactive terminal sessions
(PTYs) running Claude Code, OpenCode, or other CLI agents, and orchestrates them with a
thinker/builder split:

```
User prompt
    ↓
Commander (your app) — routes, coordinates, displays
    ├── Thinker PTY → claude (plan mode)
    │     "Analyze X, produce a structured plan. Do not make changes."
    │     Returns: step-by-step plan (markdown/JSON)
    │
    └── Builder PTY → claude / opencode (build mode)
          "Execute this plan: [plan from thinker]"
          Makes actual file changes, runs commands
```

The commander sees everything: both agents' output streams, permission prompts, errors, file
changes — and surfaces a unified view to the user.

---

## Why This Is Unique

| Tool | What it does |
|---|---|
| Claude Code | Single agent, single session |
| OpenCode | Single agent, single session |
| Copilot CLI | Two commands (`explain`, `suggest`) — not agentic |
| **Your app** | **Orchestrates multiple CLI agents, splits thinking from building, user stays in control** |

No existing tool does cross-agent PTY orchestration at the CLI level.

---

## Architecture

```
packages/
├── cli/              ← KEEP — UI layer (Ink), add thinker/builder panel views
├── core/             ← KEEP — own agent loop still useful for lightweight tasks
├── tools/            ← KEEP — built-in tools still used by the commander itself
├── shared/           ← KEEP — types, constants, models
├── pty-manager/      ← NEW  — PTY session lifecycle
├── output-parser/    ← NEW  — ANSI → structured events
└── agent-router/     ← NEW  — decides thinker vs builder vs local
```

---

## New Packages

### `packages/pty-manager/`

Manages spawning, driving, and reading from interactive terminal sessions.

```typescript
import * as pty from 'node-pty';

export class PtySession {
  private proc: pty.IPty;
  private outputBuffer: string = '';

  spawn(command: string, args: string[], cwd: string): void
  write(text: string): void          // send input (appends \r for Enter)
  onOutput(cb: (text: string) => void): void
  onIdle(cb: () => void): void       // fires when prompt reappears = agent done
  onPermissionPrompt(cb: (prompt: string) => Promise<boolean>): void
  kill(): void
}

export class PtySessionManager {
  createThinker(cwd: string): PtySession   // claude in plan mode
  createBuilder(cwd: string): PtySession   // claude in build mode / opencode
  list(): PtySession[]
  killAll(): void
}
```

**Key dependency**: `node-pty`

**Hard problems**:

- Detecting "idle" (agent waiting for input) vs "thinking" — parse for prompt cursor pattern
- Resize handling — PTY cols/rows must match display area
- Windows: `node-pty` requires native build, ConPTY on Windows 10+

---

### `packages/output-parser/`

Converts raw PTY output (ANSI escape codes, box-drawing chars, spinners) into structured events.

```typescript
export type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool-call'; name: string; args: string }
  | { type: 'tool-result'; name: string; output: string }
  | { type: 'permission-prompt'; tool: string; file: string }
  | { type: 'plan'; steps: PlanStep[] }    // extracted structured plan
  | { type: 'idle' }                        // agent waiting for input
  | { type: 'done' }                        // agent finished turn
  | { type: 'error'; message: string };

export class OutputParser {
  feed(rawAnsiChunk: string): AgentEvent[]
}
```

**Key dependencies**: `strip-ansi`, `ansi-regex`

**Parsing targets** (Claude Code specific):

- `✓ Read file.ts` → tool-result
- `⚠ Permission required` → permission-prompt
- `>` at start of line after idle period → idle
- Structured JSON blocks → plan extraction

---

### `packages/agent-router/`

Decides what to do with each user message:

```typescript
export type RouteDecision =
  | { agent: 'local' }                    // handle with own agent loop (quick Q&A)
  | { agent: 'thinker'; then: 'builder' } // plan then build
  | { agent: 'thinker' }                  // plan only, show to user first
  | { agent: 'builder'; plan: string }    // build directly with given plan
  | { agent: 'parallel'; tasks: string[] }// split into parallel builder sessions

export class AgentRouter {
  route(userMessage: string, context: ProjectContext): Promise<RouteDecision>
}
```

Routing heuristics:

- Short questions → `local` (no PTY overhead)
- "Analyze / explain / plan / review" → `thinker` only
- "Build / implement / create / fix" → `thinker` then `builder`
- "Quick fix in X" → `builder` direct
- Multiple independent tasks → `parallel`

---

## UI Changes (`packages/cli/`)

### New layout — split panel view

```
┌─────────────────────────────────────────────────────┐
│  Commander │ claude:thinker ● │ claude:builder ●    │
├──────────────────────────────┬──────────────────────┤
│  Commander chat              │  Active agent output │
│                              │                      │
│  You: Refactor auth to JWT   │  🧠 Thinker          │
│                              │  Reading auth.ts...  │
│  ┌─ Plan ready ─────────┐   │  Plan:               │
│  │ 1. Add jsonwebtoken  │   │  1. Add dependency   │
│  │ 2. Create jwt.ts     │   │  2. Create helpers   │
│  │ 3. Update handler    │   │  3. Update handler   │
│  └──────────────────────┘   │                      │
│                              │  🔨 Builder          │
│  [Approve] [Edit] [Cancel]   │  Writing jwt.ts...   │
│                              │                      │
├──────────────────────────────┴──────────────────────┤
│  > Type a message...                      [T][B][?] │
└─────────────────────────────────────────────────────┘
```

`[T]` = focus thinker, `[B]` = focus builder, `[?]` = commander help

### New components needed

- `PtyOutputView.tsx` — renders live PTY stream, ANSI-aware
- `PlanReview.tsx` — shows thinker's plan, approve/edit/cancel
- `AgentStatusBar.tsx` — shows both PTY sessions status + cost
- `SplitView.tsx` — resizable left/right panels

---

## Plan Handoff Format

When thinker finishes, the plan is extracted and structured before being sent to the builder:

```json
{
  "goal": "Refactor auth module to use JWT",
  "context": {
    "files_read": ["src/auth/handler.ts", "src/auth/types.ts"],
    "summary": "Currently uses session-based auth with express-session"
  },
  "steps": [
    { "id": 1, "action": "add_dependency", "args": { "package": "jsonwebtoken" } },
    { "id": 2, "action": "create_file", "args": { "path": "src/auth/jwt.ts" } },
    { "id": 3, "action": "edit_file", "args": { "path": "src/auth/handler.ts" } }
  ]
}
```

Builder receives: `"Execute this plan step by step: [JSON plan]\nDo not deviate from the steps."`

---

## Cost Management

Each PTY session is a full Claude Code session — tokens add up fast.

Strategy:

- Route simple Q&A to **local agent** (your own Vercel AI SDK loop) — cheapest
- Only spawn PTYs for tasks that genuinely need it
- Show per-session cost in `AgentStatusBar`
- Let user set a session budget cap → auto-abort if exceeded
- Cache thinker output — if user asks same thing twice, reuse the plan

---

## What Carries Over From Current Plan

| Current work | Still needed? |
|---|---|
| `/compact`, `/undo`, `/redo` | ✅ Yes — commander's own session still uses these |
| `todowrite`/`todoread` tools | ✅ Yes — commander tracks its own tasks |
| `question` tool | ✅ Yes — commander can still ask user mid-task |
| Theme system | ✅ Yes — UI still needs it |
| MCP client | ✅ Yes — commander can call MCP tools directly |
| Web search / web fetch tools | ✅ Yes — used by local agent path |
| Permission prompt | ✅ Yes — PTY permission prompts get surfaced through this |
| Provider manager | ✅ Yes — local agent still needs providers |
| Docker sandbox | ❌ No — Claude Code handles its own sandboxing |
| LSP client | 🟡 Maybe — less urgent if thinker reads files via Claude Code |

---

## Implementation Order (when ready)

```
Phase 1 — PTY foundation:
  ✦ packages/pty-manager/ — spawn, write, read, detect idle
  ✦ packages/output-parser/ — ANSI → structured events
  ✦ Basic PtyOutputView component — show raw stream

Phase 2 — Thinker/Builder split:
  ✦ packages/agent-router/ — routing logic
  ✦ Plan extraction from thinker output
  ✦ PlanReview component — user approves/edits plan
  ✦ Builder receives structured plan

Phase 3 — Commander UI:
  ✦ Split panel layout
  ✦ AgentStatusBar with per-session cost
  ✦ Permission prompt interception from PTY stream
  ✦ Parallel builder sessions

Phase 4 — Polish:
  ✦ Session budget caps
  ✦ Plan caching
  ✦ Routing heuristic tuning
  ✦ Windows ConPTY testing
```

---

## Key Dependencies to Add (when ready)

```json
{
  "node-pty": "^1.0.0",
  "strip-ansi": "^7.0.0",
  "ansi-regex": "^6.0.0"
}
```

`node-pty` requires native compilation — add to `optionalDependencies` with a fallback
for environments where it can't build (graceful degradation to local-only mode).
