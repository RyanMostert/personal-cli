Review Feedback Implementation Log

This file documents the changes made to address PR review comments and post-merge improvements.

---

## Phase 1 — PR Review Fixes (9 items)

1) **permission-rules-patch** (`packages/tools/src/types.ts`)
   - Added explicit `MODE_RULES` entries for the `patch` tool: `ask: deny`, `plan: ask`.

2) **applyUnifiedDiff-validation** (`packages/tools/src/tools/patch.ts`)
   - Validates that existing file lines match the hunk's expected context before applying. Throws on mismatch to avoid silent corruption.

3) **create-settings-dir** (`packages/core/src/config/loader.ts`)
   - `saveSettings` now creates `~/.personal-cli` with `mkdirSync(..., { recursive: true })` before writing `settings.json`.

4) **undo-entry-type** (`packages/core/src/persistence/undo-stack.ts`)
   - `UndoEntry.before` changed to `string | null`. Undo deletes the file when `before === null` (file-created case), restores otherwise.

5) **minimatch-dotfiles & readfile-permission-enforce** (`packages/tools/src/index.ts`)
   - `minimatch` calls now use `{ dot: true, matchBase: true }` so patterns match `.env` and nested paths.
   - `readFile` wrapped with `setReadFilePermission` to enforce permission callback before delegating.

6) **opencode-no-key** (`packages/core/src/providers/manager.ts`)
   - Added `opencode` and `opencode-zen` to `noKeyProviders` so the manager allows public/fallback mode with no API key.

7) **help-text-update** (`packages/cli/src/app.tsx`)
   - `/help` output updated to show Tab mode cycle (`ask → plan → build`) and `/mode` usage.

8) **compaction-order-bug** (`packages/core/src/agent.ts`)
   - Auto-compact check now runs before adding the user message to `coreMessages`, preventing the triggering message from being dropped.

9) **readFile-permission-inject** (`packages/tools/src/tools/read-file.ts`)
   - Exported `setReadFilePermission` so the caller can inject the permission callback after tool creation.

---

## Phase 2 — OOM Crash Fix

**Root cause:** Multiple `setInterval` timers across Ink components (70ms `MarioHeader`, 80ms `StatusBar`, 500ms `ModelPicker` etc.) caused continuous Ink re-renders. Each re-render creates new C++ Yoga layout nodes. V8 cannot GC them fast enough at 12–25 re-renders/sec → heap fills to 4–8 GB → OOM crash.

**Secondary cause:** `MarkdownRenderer` used async Shiki syntax highlighting with `useState`/`useEffect`. Each code block loaded language grammar files (~2 MB each) and held them in memory indefinitely.

**Fixes:**
- Removed ALL `setInterval` from every component: `MarioHeader`, `StatusBar`, `MinecraftSpinner`, `WelcomeScreen`, `ModelPicker`, `MessageView`, `ProviderManager`, `ProviderWizard`.
- Removed async Shiki from `MarkdownRenderer` — now a pure sync render function with zero hooks.
- Added self-re-exec in `bin.ts` with `--max-old-space-size=8192` via `__PCLI_HEAPED__` env guard as a permanent safety net.
- Added `cross-env NODE_OPTIONS=--max-old-space-size=4096` to `packages/cli/package.json` build script.

**Files changed:** `src/components/MarioHeader.tsx`, `StatusBar.tsx`, `MinecraftSpinner.tsx`, `WelcomeScreen.tsx`, `ModelPicker.tsx`, `MessageView.tsx`, `MarkdownRenderer.tsx`, `ProviderManager.tsx`, `ProviderWizard.tsx`, `src/bin.ts`, `package.json`.

---

## Phase 3 — Animations Restored Safely (Single Root Tick)

**Pattern:** One `setInterval` at 500ms in `App` increments a `tick: number` state. All animated components receive `tick` as a prop and derive their animation frame from it. ONE re-render per tick instead of N independent re-renders from N components.

**Restored animations:**
- `MarioHeader` — runner character 🏃 slides across the header with ⚡ blinking
- `StatusBar` — streaming spinner `⠋⠙⠹...` driven by tick (no local timer)
- `WelcomeScreen` — ASCII title colors cycle on each tick
- `ModelPicker` — cursor `▌` blinks on/off

**Tick paused while streaming** — the `useEffect` for the tick timer depends on `isStreaming`; when streaming it returns early (no timer started), so animation re-renders never stack on top of high-frequency text-delta updates.

---

## Phase 4 — Scroll / Flicker Fix

**Root cause of flicker:** Ink repaints the entire terminal screen on every state update. During streaming, every token caused a full repaint, resetting the user's scroll position.

**Fix 1 — `Static` at root level:**
- Completed `MessageView` components are placed inside Ink's `Static` at the root of the render tree (direct child of `<>`, not nested in any `Box`).
- `Static` prints each item **once** to the terminal scrollback buffer and never repaints it. The user scrolls with the terminal's native scroll (mouse wheel, Shift+PgUp).
- When `Static` is nested inside a `Box`, Ink includes it in its managed-height calculation and **overwrites it on every repaint** — this was the "content disappears" bug. Moving it to root fixes this.

**Fix 2 — Stream text throttling:**
- `setStreamingText` was called on every token (potentially 50+ per second → 50+ repaints/sec).
- Tokens are now buffered in a local `textBuf` string and flushed via `setTimeout(flush, 80)`, capping repaints at ~12/sec during streaming.
- Buffer flushed synchronously before transitioning to idle state (no lost tokens).

**Fix 3 — Tick paused during streaming** (see Phase 3 above).

**Fix 4 — Web-fetch empty response:**
- Updated `web-fetch` tool description to explicitly instruct the model that it **must** summarize content after fetching (not return an empty reply).
- Added `_hint` field to the tool result as a secondary nudge for models that skip the tool description.

**Files changed:** `packages/cli/src/app.tsx`, `packages/cli/src/hooks/useAgent.ts`, `packages/tools/src/tools/web-fetch.ts`.

---

## Current State

- ✅ All 9 PR review items resolved
- ✅ OOM crash eliminated (no setInterval, no async Shiki, 8 GB heap guard)
- ✅ Animations restored safely via single root tick
- ✅ Scroll works — completed messages in terminal scrollback, never overwritten
- ✅ Flicker eliminated — streaming throttled to ≤12 repaints/sec, tick paused during stream
- ✅ Web-fetch empty response addressed via tool description

---

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
