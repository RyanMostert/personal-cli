# Future Vision — Commander Architecture (PTY Orchestration)

> This is the **next phase** after the current plan.md is complete.
> Most of `packages/core`, `packages/cli`, and `packages/tools` carry over directly.
> The new piece is a PTY orchestration layer on top.

---

## The Concept

Your CLI becomes a **commander of CLI agents** — it spins up real interactive terminal sessions
(PTYs) running OpenCode (with different models) and orchestrates them with a thinker/builder split.

The key insight: **OpenCode supports GitHub Copilot as a provider natively** (`copilot/claude-sonnet-4-5`).
This means you can run both agents inside OpenCode, just with different models and modes — one
parser to write, consistent output format, and the thinker runs on free Copilot quota.

```
User prompt
    ↓
Commander (your app) — routes, coordinates, displays
    ├── Thinker PTY → opencode --model copilot/claude-sonnet-4-5 (plan mode, read-only)
    │     Uses FREE GitHub Copilot quota
    │     "Analyze X, produce a structured plan. Do not make changes."
    │     Returns: step-by-step plan (markdown/JSON)
    │
    └── Builder PTY → claude (build mode, full access)
          Uses Claude Code (paid, but only for actual execution)
          "Execute this plan: [plan from thinker]"
          Makes actual file changes, runs commands
```

The commander sees everything: both agents' output streams, permission prompts, errors, file
changes — and surfaces a unified view to the user. **The user can interact directly with either
agent at any time** by focusing their panel.

---

## Why This Is Unique

| Tool | What it does |
|---|---|
| Claude Code | Single agent, single session, paid |
| OpenCode | Single agent, single session |
| Copilot CLI | Only `explain` + `suggest` — not agentic, can't be a thinker |
| **Your app** | **Orchestrates multiple CLI agents, burns free Copilot quota on thinking, only pays for execution, user can talk to any agent directly** |

No existing tool does cross-agent PTY orchestration at the CLI level.

---

## Agent Stack

| Role | Runtime | Model | Cost | Mode |
|---|---|---|---|---|
| **Thinker** | OpenCode | `copilot/claude-sonnet-4-5` | 🟢 Free (Copilot sub) | plan (read-only) |
| **Builder** | Claude Code | `claude-sonnet-4` or `claude-opus-4` | 🔴 Paid per token | build (full access) |
| **Commander** | Your app | Any provider | 🟡 Pay per use | routing + Q&A |

**Cost strategy**: The expensive part of any coding task is *analysis* — reading files, understanding
the codebase, forming a plan. That's exactly what Copilot quota covers for free. You only pay
Claude Code tokens when actually writing/running code.

---

## Three Interaction Modes

The user is never locked out — they can always drop into either raw session:

```
Commander mode (default):
  User talks to YOUR app → routes to thinker/builder automatically
  Commander abstracts away which agent is doing what

Focus Thinker mode (press T):
  User types directly into the Thinker PTY
  Talk to OpenCode+Copilot directly, ask follow-up questions, redirect analysis

Focus Builder mode (press B):
  User types directly into the Builder PTY (Claude Code)
  Answer permission prompts, redirect mid-task, add context

Back to Commander (press Esc):
  Return to the routing layer
```

---

## Architecture

```
packages/
├── cli/              ← KEEP — UI layer (Ink), add thinker/builder panel views
├── core/             ← KEEP — own agent loop still useful for lightweight tasks
├── tools/            ← KEEP — built-in tools still used by the commander itself
├── shared/           ← KEEP — types, constants, models
├── pty-manager/      ← NEW  — PTY session lifecycle
├── output-parser/    ← NEW  — ANSI → structured events (one parser, both agents use OpenCode format)
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
  createThinker(cwd: string): PtySession   // opencode + copilot model, plan mode
  createBuilder(cwd: string): PtySession   // claude code, build mode
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

**Parsing targets** (OpenCode output format — same for both thinker and builder):

- `✓ Read file.ts` → tool-result
- `⚠ Permission required` → permission-prompt
- `>` at start of line after idle period → idle
- Structured JSON blocks → plan extraction
- Spinner frames (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`) → thinking indicator

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

### New layout — split panel view with focus modes

```
┌──────────────────────────────────────────────────────────────┐
│  Commander  │  🧠 opencode:copilot [THINKER] ●  │  🔨 claude ● │
├─────────────────────────────┬────────────────────────────────┤
│  Commander chat             │  Active agent output           │
│                             │                                │
│  You: Refactor auth to JWT  │  🧠 Thinker (Copilot — free)  │
│                             │  Reading auth.ts...            │
│  ┌─ Plan ready ──────────┐  │  Reading handler.ts...         │
│  │ 1. Add jsonwebtoken   │  │                                │
│  │ 2. Create jwt.ts      │  │  Plan:                         │
│  │ 3. Update handler.ts  │  │  1. Add jsonwebtoken dep       │
│  └───────────────────────┘  │  2. Create src/auth/jwt.ts     │
│                             │  3. Update handler.ts          │
│  [Approve] [Edit] [Cancel]  │                                │
│                             │  🔨 Builder (Claude Code)      │
│                             │  Writing src/auth/jwt.ts...    │
├─────────────────────────────┴────────────────────────────────┤
│  > Type a message...   [C]Commander [T]Thinker [B]Builder    │
└──────────────────────────────────────────────────────────────┘
```

**Focus modes** — press to talk directly to that agent:

- `[C]` Commander mode (default) — your app routes automatically
- `[T]` Focus Thinker — user types directly into OpenCode+Copilot PTY
- `[B]` Focus Builder — user types directly into Claude Code PTY
- `Esc` — always returns to Commander mode

### New components needed

- `PtyOutputView.tsx` — renders live PTY stream, ANSI-aware, per agent
- `PlanReview.tsx` — shows thinker's plan with Approve/Edit/Cancel
- `AgentStatusBar.tsx` — shows both PTY sessions status, model, cost per session
- `SplitView.tsx` — resizable left (commander) / right (agent output) panels
- `FocusIndicator.tsx` — clear visual showing which agent the user is talking to

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

**The big win**: Thinker runs on free Copilot quota. Analysis is the most token-intensive
phase — reading files, understanding architecture, forming a plan. You burn $0 on all of that.
You only pay Claude Code tokens when writing/running actual code.

| Phase | Agent | Cost |
|---|---|---|
| Simple Q&A | Local agent (your app) | ~$0.001 |
| Analyze / Plan | Thinker (Copilot via OpenCode) | **$0 free** |
| Build / Execute | Builder (Claude Code) | $0.01–$0.10 typical task |

Additional strategies:

- Route simple Q&A to **local agent** (your own Vercel AI SDK loop) — cheapest path, no PTY overhead
- Show per-session cost in `AgentStatusBar` (commander cost + builder cost separately)
- Let user set a builder budget cap → auto-pause and ask before continuing if exceeded
- Cache thinker plans — if user modifies prompt slightly, offer to reuse existing plan

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
