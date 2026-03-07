NEXT_STEPS & PROGRESS — Chat UI / AI Improvements
Date: 2026-03-06T12:27:51Z

Purpose
-------
This file summarizes work completed during the Chat UI & AI improvements effort, current test/CI status, pending items (PR-sized), and immediate actionable next steps so someone can continue the work without additional ramp-up.

Completed work (high-level)
---------------------------
- Fixed ModelPicker wiring so GitHub Copilot models are sourced from the authoritative core copilot fetcher (getCopilotModelList) and excluded from stale static registry wins.
- Introduced a normalized streaming protocol (packages/core/src/streaming-protocol.ts) and a robust parseStream() normalizer (packages/core/src/streaming-parser.ts); Agent consumes StreamEvent now.
- Implemented persistence decoupling: PersistenceStore interface, FileSystemPersistenceStore and InMemoryPersistenceStore, plus persistence modules now delegate to the store (packages/core/src/persistence/*) and created createInMemoryPersistenceStore helper.
- Added tests: parseStream unit tests, persistence store parity tests, and additional helpers (many tests passing locally).
- Implemented a streaming POC (buffered flush + abort support) wired into useAgent and app UI; added an Agent streaming POC integration test (mocked ai.streamText).
- Implemented ConfigStore abstraction and InMemoryConfigStore; added /settings CLI command to persist feature flags (featureFlags stored at ~/.personal-cli/settings.json).
- Adjusted model caching behavior to avoid cached Copilot models overriding the authoritative list (getCachedModels ignores 'github-copilot' temporarily).
- Created project-level plan and docs: plan-chat-ui-improvements.md, plan.md, and docs/onboarding.md; inserted PR-sized todos into session tracker.

Current test / CI status
------------------------
- Most unit tests pass locally; test suites were green after adding parser and persistence tests.
- A failing/incomplete test: packages/core/src/agent-streaming-poc.test.ts currently fails during import because the test's vi.mock('ai') does not include the 'tool' export required by other modules that import 'ai'. This is a mock shape issue (fix recommended below).

Pending PR-sized todos (session)
--------------------------------
- chat-streaming-poc-verify — Verify streaming POC UX and flush tuning (pending)
- modelpicker-ux-implement — Productionize ModelPicker UX improvements (pending; deprioritize if Gemini handles UI)
- provider-onboarding-wizard — Improve provider onboarding & auth UX (pending)
- in-message-editing — Add in-message suggestion diffs and apply/undo flows (pending)

Immediate actionable next steps (prioritized)
--------------------------------------------
1) Fix the agent streaming POC test import/mocking (high priority):
   - Update the Vitest mock for the 'ai' module to be a partial/mock-wrapper rather than a full mock so other imports that expect `tool` are preserved. Example pattern:

   vi.mock('ai', async (importOriginal) => {
     const actual = await importOriginal();
     return {
       ...actual,
       streamText: (opts) => ({ fullStream: (async function*(){ /* yield parts */ })(), response: Promise.resolve({ messages: [] }), usage: Promise.resolve({}) }),
     };
   });

   - Alternatively return a minimal `tool` export in the mock to satisfy other modules.

2) Re-run build & tests: npm run build && npm run test (ensure CI passes). Address any other failing tests.

3) Streaming POC tuning & verification:
   - Confirm flushDelay defaults and POC behavior (use /settings to toggle PERSONAL_CLI_STREAMING_POC or set env); add a small integration test asserting incremental token arrival (mocked stream) and adjust flushDelay accordingly.

4) Decide UI ownership & prioritization:
   - If you're delegating UI to Gemini, deprioritize ModelPicker visual enhancements and in-message editor work; otherwise implement modelpicker-ux-implement and in-message-editing next.

5) Provider onboarding improvements:
   - Add a quick "test connection" and show provider metadata (sample models, subscription hints) in the wizard; keep behind feature flags until verified.

6) Merge, document, and notify:
   - Open small PRs for each change (parser tests, persistence parity, streaming POC fixes). Update docs/onboarding.md and plan-chat-ui-improvements.md with decisions and flag usage.

How to reproduce & quick commands
--------------------------------
- Run tests locally: npm run test
- Build: npm run build
- Toggle POCs via CLI settings: /settings set-flag PERSONAL_CLI_STREAMING_POC on (or use /settings get-flag PERSONAL_CLI_MODEL_PICKER_POC)
- Model cache: use packages/core/src/models/cache.ts helpers (clearModelCache/getCacheStats) to inspect or clear cache files under ~/.personal-cli/cache/

Notes & context
----------------
- All experimental UI changes are behind opt-in flags persisted to ConfigStore to allow safe testing.
- The authoritative Copilot model list remains in packages/core/src/providers/fetchers/copilot-fetcher.ts; ModelPicker maps those entries into the UI.
- If you want the assistant to continue, tell it to either "fix streaming tests" or "proceed with provider onboarding" and it will pick the next todo from the session tracker.




## Build System Note — Stale Compiled Artifacts in `src/`

**Root cause discovered 2026-03-06:**
The `packages/cli/src/` tree contained stale pre-compiled `.js` / `.d.ts` files
generated by an old `tsc` run. tsup resolves `./hooks/useAgent.js` imports to the
literal `.js` file in `src/` rather than following the `.ts` source, so all edits to
`.ts` files were silently ignored by the bundler.

**Symptom:** Chunk hash never changes after editing source; ~50ms build time (esbuild
reads pre-compiled JS instead of recompiling TypeScript from source).

**Fix applied:** Deleted all `.js`, `.js.map`, `.d.ts`, `.d.ts.map` artifacts from `src/`:
```bash
find packages/cli/src -name "*.js" -o -name "*.js.map" -o -name "*.d.ts" -o -name "*.d.ts.map" | xargs rm
```

**Prevention:** The `tsconfig.json` already has `"outDir": "dist"` but an older `tsc`
invocation without `--outDir` wrote back into the source tree. Consider:
1. Adding `src/**/*.js` to `.gitignore`
2. Adding a pre-build `clean` step: `rimraf dist && find src -name '*.js' -delete`
3. Never running bare `tsc` in `packages/cli` — always use `pnpm build` (tsup)


## New: TUI folder (packages/tui) — preferred (non-package)

Decision: prefer a plain folder under `packages/` (packages/tui) rather than adding a separate workspace package. The existing `packages/tui` package skeleton can be treated as the canonical TUI location; Gemini should either reconcile it as a repo-local folder (remove package.json) or keep it as the working TUI source and update references accordingly so the UI lives as part of the repo tree without being published as its own package.

Implementation tasks (prioritized):
1. Create `packages/tui/` with a simple structure if needed: `src/`, `src/components/`, `src/hooks/`, `src/cli.ts` (entry), `README.md`, and a `tsconfig.json` that extends the repo `tsconfig.base.json`. Do not add a package.json unless later converting this to a workspace package is desired.
2. Implement the interactive TUI using Ink (recommended) or Blessed/terminal-kit. Components: App shell, MessageView, InputBox, ModelPicker, ProviderWizard, StatusBar, StreamingMessage.
3. Streaming integration: consume `parseStream()` from `@personal-cli/core` to normalize events and render incremental `text-delta` updates; mirror the buffering/flush strategy from `useAgent` to avoid excessive render churn.
4. Provider onboarding & test connection: call `testProviderConnection()` (core) and wire full ProviderWizard flows including OAuth/device flow for Copilot when required.
5. Model switching and browsing: reuse `ProviderManager` and model fetchers; show sample models and allow switching in the TUI.
6. Keybindings and command mapping: map `/settings`, `/provider`, `/model`, `/mode`, and other commands to intuitive keys and a command palette.
7. Tests & CI: add vitest tests (component snapshots, streaming smoke tests) and ensure CI remains green.

Update (assistant): packages/tui/src/index.ts was updated to re-export core CLI UI components (StatusBar, StreamingMessage, MessageView, InputBox, ModelPicker, ProviderWizard) and contexts/hooks; a minimal createTUI() skeleton and a CLI entry (packages/tui/src/cli.ts) were added as placeholders. Components still live under packages/cli/src/components — Gemini can either move them into packages/tui/src/components or use these re-exports as the centralized surface to start implementing the TUI without code duplication.

Migration notes (for maintainers):
- Reconcile the existing `packages/tui` artifact: either keep `packages/tui` as the canonical TUI folder (remove its package.json to make it a repo-local folder) or move its `src` files to a newly-created `packages/tui` repo-local folder and remove the old package.json. Ensure imports and NEXT_STEPS.md reference `packages/tui` consistently.
- Update any workspace scripts or references that pointed to `@personal-cli/tui` so they instead reference the repo-local TUI entry or the CLI runtime that launches it.
- If later publishing/separating the TUI is desired, add a package.json and convert `packages/tui` into a workspace package named `@personal-cli/tui`.

How to run locally (for development):
- Development: run the TUI entry directly (e.g. `node packages/TUI/src/cli.ts`) or add a dev script in the root package.json that launches the TUI via Node.js/ts-node.
- Integration: the TUI should import and use `@personal-cli/core` (Agent, ProviderManager, ConfigStore, parseStream) at runtime rather than being built as an independent package.

Notes:
- Keep experimental features behind `ConfigStore` feature flags.
- Coordinate with the core team: use `@personal-cli/core` exports for Agent, ProviderManager, ConfigStore, parseStream, and model refresh helpers.

If you want the assistant to continue, say "implement TUI" or "start TUI development" and it will pick the next todo from the session tracker.

End of summary.

---

## Tool & UI Improvements (2026-03-07)

### Implemented (HIGH PRIORITY — all done)

**1. notifyUser** (`packages/tools/src/tools/notify.ts`) ✅
- Terminal bell on every notification; optional OS-level desktop popup (osascript / notify-send / PowerShell)
- `NotifyCallback` wired into `createTools()` via `options.onNotify`; StatusBar intercepts it to flash for 4s
- StatusBar now shows the active tool name inline when a tool is running (e.g. "running batchEdit")

**2. moveFile / copyFile / deleteFile** (`packages/tools/src/tools/fs-ops.ts`) ✅
- All three gated by `PermissionCallback` (same pattern as writeFile/editFile)
- `deleteFile` performs a soft-delete to `~/.personal-cli/.trash/` with a timestamp prefix so `/undo` can recover
- `copyFile` supports recursive directory copy
- Permission rules added to MODE_RULES for ask/plan/build modes

**3. batchEdit** (`packages/tools/src/tools/batch-edit.ts`) ✅
- Multi-file search-and-replace via `glob` pattern matching (uses `glob` npm package)
- Supports literal string or JavaScript regex with flags
- `dryRun: true` option previews without writing
- Returns `{ filesChanged, occurrencesReplaced }` for structured agent reasoning
- Ignores node_modules/dist/.git automatically

**4. runTests** (`packages/tools/src/tools/run-tests.ts`) ✅
- Auto-detects vitest / jest / mocha from package.json scripts and devDependencies
- Optional `filter` param to run a specific file or pattern
- Returns structured `{ passed, failed, skipped, total, success, runner }` so the model can branch on failures
- Sets `CI=1, FORCE_COLOR=0` in the subprocess env for clean output

**5. sessionMemory** (`packages/tools/src/tools/session-memory.ts`) ✅
- Stored at `.pcli-memory.json` in the project root (add to .gitignore if private)
- Tools: `memoryWrite(key, value)`, `memoryRead(key?)`, `memoryDelete(key)`
- `loadMemoryForPrompt()` helper exported from `@personal-cli/tools` for system prompt injection
- Model should call `memoryRead` at the start of each session to recall project conventions

### UI Improvements (2026-03-07) ✅

**ToolCallView** (`packages/cli/src/components/ToolCallView.tsx`)
- Replaced generic args blob (`JSON.stringify(args).substring(0,40)`) with `getPrimaryArg()` dispatcher — shows the most useful arg inline per tool type (path, command, query, pattern, etc.)
- Added `TOOL_ICONS` map (ASCII single-char per category) in the header bracket `[E] editFile`
- `runTests` results show a dedicated pass/fail/skip row instead of raw text
- `editFile` tool name check now covers both `editFile` and legacy `edit_file` names
- Line count badge shown on multi-line results

**StreamingMessage** (`packages/cli/src/components/StreamingMessage.tsx`)
- `BlinkCursor` component (500ms toggle) replaces the static `▋` character
- Shows approximate token count while streaming (`~N tokens`)
- Works for both text-only and thought+text streaming

**StatusBar** (`packages/cli/src/components/StatusBar.tsx`)
- New `activeToolName` prop — shows "running batchEdit" instead of just "receiving"
- New `notification` prop — flashes `notifyUser` results for 4 seconds with level-colored text
- Flash auto-clears after 4s using `useEffect` + `setTimeout`

---

## Missing Tool Features (remaining)

Current tool inventory: readFile, writeFile, editFile, listDir, searchFiles, globFiles,
semanticSearch, diagnostics, runCommand, **runTests** ✅, webFetch, webSearch, gitStatus, gitDiff,
gitLog, gitCommit, todoWrite, todoRead, patch, question, **moveFile** ✅, **copyFile** ✅,
**deleteFile** ✅, **batchEdit** ✅, **memoryWrite/Read/Delete** ✅, **notifyUser** ✅.

### MEDIUM PRIORITY

**6. screenshot — capture terminal / clipboard image**
- Useful when debugging UI or reviewing rendered output
- Read clipboard image (already partially handled in the CLI via `useClipboardImage`)
- Add a `clipboardRead` tool that returns base64 image for vision-capable models
- Implementation: `packages/tools/src/tools/clipboard.ts`

**7. httpRequest — general HTTP POST / PUT / DELETE (not just GET fetch)**
- webFetch only does GET; many APIs need POST with JSON body and auth headers
- Input: `{ url, method, headers?, body?, timeout? }`
- Requires permission prompt for non-GET requests (potential side effects)
- Implementation: extend `packages/tools/src/tools/web-fetch.ts` with method support

**8. lintFile — run the project linter on specific paths**
- Detects eslint / biome / oxlint from package.json
- Returns structured diagnostics per file (line, col, message, severity)
- Complements `diagnostics` tool (which returns compiler errors) with style/quality feedback
- Implementation: `packages/tools/src/tools/lint.ts`

**9. jsonQuery — jq-style querying of JSON/YAML/TOML files**
- Model frequently reads large JSON files and extracts a small piece
- Instead of reading the whole file, pass a JSONPath / jq expression
- Returns the selected fragment, reducing token usage
- Implementation: `packages/tools/src/tools/json-query.ts` using `jsonpath-plus` or `jmespath`

**10. diffFiles — compare two files or commits and return a unified diff**
- Current gitDiff shows working-tree changes; diffFiles compares any two paths or revisions
- Input: `{ pathA, pathB?, revA?, revB? }`
- Returns a unified diff string, rendered via PatchView in the TUI
- Implementation: extend `packages/tools/src/tools/git.ts` or add `diff-files.ts`

---

### LOW PRIORITY / FUTURE

**11. processManager — list / kill running processes**
- `processList(filter?)` returns pid, name, cpu, mem
- `processKill(pid)` with permission gating
- Useful for debugging runaway dev servers

**12. archiveTool — zip/unzip/tar**
- `archiveCreate(paths, dest)` and `archiveExtract(src, dest)`
- Needed for packaging tasks

**13. timerTool — start/stop named timers, emit elapsed time in UI**
- Model can time its own subtasks and surface them in the StatusBar
- Pairs well with todoWrite for showing how long each task took

**14. evalExpression — safe math / expression evaluation**
- `eval("2^32 - 1")` → `4294967295`
- Use `mathjs` or similar (no arbitrary code execution)
- For quick calculations without invoking runCommand

**15. gitBranch / gitStash / gitPR — extended git toolkit**
- Current git tools only cover status/diff/log/commit
- Branch creation, stash push/pop, and GitHub PR creation via `gh` CLI would round out the suite
- Implementation: extend `packages/tools/src/tools/git.ts`
