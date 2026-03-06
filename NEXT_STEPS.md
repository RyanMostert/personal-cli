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



## New: TUI package skeleton (packages/tui)

A minimal TUI package skeleton has been added at `packages/tui` to provide a terminal-native UI alternative. The skeleton includes:
- packages/tui/package.json (build/start scripts)
- packages/tui/tsconfig.json
- packages/tui/src/index.ts (createTUI() stub)
- packages/tui/README.md (guidance + tasks for implementation)

Gemini implementation tasks (prioritized):
1. Implement the interactive TUI using Ink (recommended) or Blessed/terminal-kit. Create components: App shell, MessageView, InputBox, ModelPicker, ProviderWizard, StatusBar, StreamingMessage.
2. Streaming integration: use `parseStream()` from `@personal-cli/core` to normalize events and render incremental `text-delta` updates. Mirror buffering/flush behavior from `useAgent` to avoid excessive re-renders.
3. Provider onboarding & test connection: call `testProviderConnection()` (core) and implement full ProviderWizard flows (OAuth/device flow for Copilot included).
4. Model switching and browsing: reuse `ProviderManager` and model fetchers; show sample models and allow switching in the TUI.
5. Keybindings and command mapping: map `/settings`, `/provider`, `/model`, `/mode`, and other commands to intuitive keys and a small command palette.
6. Tests & CI: add vitest tests (component snapshots, streaming smoke tests) and ensure existing CI remains green.

How to run locally (for development):
- Build: `pnpm -w -F @personal-cli/tui run build`
- Start (after implementation): `pnpm -w -F @personal-cli/tui run start` or run the built `dist/cli.js` directly

Notes:
- Keep experimental features behind `ConfigStore` feature flags.
- Coordinate with the core team: use `@personal-cli/core` exports for Agent, ProviderManager, ConfigStore, parseStream, and model refresh helpers.

If you want the assistant to continue, tell it to either "implement TUI" or "start TUI development" and it will pick the next todo from the session tracker.

End of summary.
