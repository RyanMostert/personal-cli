Plan: Chat UI & AI Improvements (Finalized)

Date: 2026-03-06

Purpose
-------
This document finalizes the chat UI & AI improvement roadmap requested in the session. It consolidates audit findings, summarizes learnings from two reference CLIs (anomalyco/opencode and google-gemini/gemini-cli), and breaks the work into PR-sized, testable todos that can be executed and tracked from the session todos table.

High-level summary
------------------
- Root problem addressed: make model selection accurate and subscription-aware, provide robust streaming UX (progress/interrupt/re-run), improve provider onboarding and auth, and introduce safer in-message code edits and apply-suggestion flows.
- Priorities: reliability (tests & parsing), correctness (model/source reconciliation), and low-risk prototyping (opt-in feature flags) before large surface-area UI changes.

What was reviewed
-----------------
1) anomalyco/opencode (opencode)
- Terminal-first UX with strong streaming-first patterns and incremental rendering.
- Clear separation between "assistant" modes and action execution, enabling safe preview/apply flows for suggestions.
- Plugin-friendly client/server architecture that enables offloading heavy logic and maintaining small TUI clients.

2) google-gemini/gemini-cli (gemini-cli)
- Structured streaming outputs (JSON/event frames) that simplify client-side parsing and enable tooling like progress indicators and partial renders.
- Flexible auth flows and explicit model metadata surfaced to the CLI for capability-aware UI.

Key takeaways (how they inform our work)
- Use a normalized streaming protocol (StreamEvent union already introduced) so the UI can render token deltas, tool-call events, and structured results consistently.
- Surface model metadata (cost, latency hints, subscription requirement) to the ModelPicker so users can make informed choices.
- Keep heavy or blocking work server-side / provider-side and experiment in the TUI with opt-in prototypes only; prefer small API surface changes where possible.

Prioritized Features (final)
----------------------------
1. Streaming UX: token-level streaming with buffered flush cadence, abort/interrupt, re-run and progress indicators.
2. ModelPicker: authoritative model source (core/copilot-fetcher), subscription-aware entries, cost badges, and recommended defaults.
3. Provider onboarding & auth: clearer wizard flows and in-UI hints for missing keys or account linking.
4. In-message edit/apply: show suggestion diffs and one-click apply to code blocks, with undo.
5. Command palette & conversational commands: richer slash-command UX, fuzzy search, and templates.
6. Reliability & tests: stream parser tests, persistence store parity tests, and model cache reconciliation tests.

PR-sized tasks (actionable todos)
--------------------------------
Each item below is intentionally small and testable. Add or re-order if priorities change.

1) chat-streaming-parser-tests
- Title: Add parseStream normalization unit tests
- Description: Cover text-delta, thought-delta, tool-call-start/result, finish/error events and multi-part streams; ensure parser recovers from malformed parts.
- Acceptance: 100% coverage for StreamEvent mapping edge cases and CI green.
- Depends on: refactor-streaming-parser (done)

2) chat-streaming-poc-verify
- Title: Verify streaming POC UX and flush tuning
- Description: Run manual flows exercising PERSONAL_CLI_STREAMING_POC and adjust default flushDelay to balance latency vs jitter; add a small integration test that asserts tokens arrive incrementally for a mocked provider.
- Acceptance: POC validated and a unit/integration test added.
- Depends on: prototype-streaming (done)

3) modelpicker-ux-implement
- Title: Implement ModelPicker UX improvements
- Description: Convert prototype badges & recommendations into a production-ready ModelPicker component behind PERSONAL_CLI_MODEL_PICKER_POC; ensure authoritative copilot list sourced from core and caching avoids stale wins.
- Acceptance: ModelPicker shows Copilot models correctly, cost badges render, and UI hints for subscription are present.
- Depends on: prototype-modelpicker (done), wire-picker-copilot-source (done)

4) model-cache-reconciliation
- Title: Reconcile cached providers with authoritative sources
- Description: Implement a cache-refresh reconciliation so cached copilot entries do not override core model lists; add tests covering cache invalidation and refresh scenarios.
- Acceptance: No stale copilot models in ModelPicker on fresh start; tests added.
- Depends on: wire-picker-copilot-source (done)

5) persistence-store-tests
- Title: Ensure FileSystemPersistenceStore ↔ InMemoryPersistenceStore parity
- Description: Add tests asserting read/write parity across implementations for conversations, frecency, and history modules.
- Acceptance: Tests pass and CI demonstrates consistent behavior.
- Depends on: persistence-decouple (done)

6) provider-onboarding-wizard
- Title: Improve provider onboarding & auth UX
- Description: Add clearer wizard states, show inline provider capabilities (model list sample, subscription hints), and surface quick test calls (test connection button).
- Acceptance: Wizard shows expected states and provides actionable hints when a key is missing.
- Depends on: centralize-providers (done)

7) in-message-editing
- Title: Add in-message suggestion diffs and apply flow
- Description: Implement client-side diff preview for code suggestion messages and a one-click apply/undo mechanism that serializes the change as a follow-up tool action.
- Acceptance: Suggestion can be previewed and applied; undo restores previous state.
- Risk mitigation: Start behind a feature flag and write UI tests.

8) cli-feature-flags
- Title: Convert env POCs into CLI toggles/settings
- Description: Replace PERSONAL_CLI_* env toggles with an opt-in settings section persisted in ConfigStore and reflected in help docs.
- Acceptance: Users can toggle features via a new `settings` command and settings persist across sessions.
- Depends on: configstore-abstraction (done)

9) docs-onboarding
- Title: Document new features and onboarding flows
- Description: Add short docs for streaming behavior, model picker choices, feature flags, and provider onboarding in the repo root docs/ directory.
- Acceptance: Docs present and referenced from CLI `/help`.

Execution plan & order
----------------------
1. Stabilize parsing & tests (task 1 + 5): low-risk and unlocks safe streaming changes.
2. Validate streaming POC and adjust buffering (task 2), then open a small PR for UX tuning.
3. Implement ModelPicker improvements and cache reconciliation (tasks 3 + 4).
4. Provider onboarding & in-message editor (tasks 6 + 7) behind feature flags.
5. Convert POCs to toggles and ship docs (tasks 8 + 9).

Testing & CI
------------
- Add unit tests for parseStream and persistence store parity; add useful integration tests mocking providers for streaming behaviors.
- Keep heavy e2e tests optional; prefer targeted integration uses with mocked provider streams.

Acceptance criteria for marking plan-chat-ui-improvements done
---------------------------------------------------------------
- plan-chat-ui-improvements.md exists in the repo root with a prioritized task list (this file).
- The session todo 'plan-chat-ui-improvements' is marked done and PR-sized todos are inserted into the session todo tracker.

Next immediate steps (autonomous)
--------------------------------
- Create this plan file (done by this change).
- Mark the session todo 'plan-chat-ui-improvements' as done and insert the PR-sized todos into the session DB.
- Open the first small PR: add parseStream tests and persistence-store parity tests.

References
----------
- https://github.com/anomalyco/opencode
- https://github.com/google-gemini/gemini-cli


Notes
-----
Keep changes behind opt-in flags and add telemetry only with explicit user consent.

---

End of plan.
