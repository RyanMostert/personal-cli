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
