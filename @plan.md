# Plan: Improve chat UI & AI user interaction

Problem:
The current terminal chat UI (TUI) delivers a lot of value but lacks several modern, discoverable UX patterns (streaming responses with progress/interrupt, clear/subscription-aware model selection, inline code edits/diffs, and a richer command palette). A recent bug (stale Copilot entries) revealed coupling between static registries and dynamic fetchers; this plan consolidates the session plan and the repository's refactoring_plan.md into a canonical project-root plan.

Goals:
- Make model selection accurate, subscription-aware, and discoverable.
- Provide streaming response UI with progress/interrupt and re-run support.
- Improve provider onboarding, auth UX, and error messaging.
- Add in-message editing, code diffs, and one-click apply-suggestion flows.
- Enhance command palette (/commands), autocomplete, conversation search, and templates.

Scope:
- Primary code areas to review and change:
  - packages/cli/src/app.tsx, components/ModelPicker.tsx, ProviderWizard.tsx, StatusBar.tsx, ProviderManager/hooks
  - packages/core/src/providers/* (copilot-auth, fetchers, manager), agent.ts, model-refresh.ts, models/cache.ts
- External research targets:
  - https://github.com/anomalyco/opencode
  - https://github.com/google-gemini/gemini-cli

Approach:
1) Audit codebase: inventory chat UI components, provider flows, model fetching/caching, and the slash-command UX.
2) Research external CLIs: extract feasible UX patterns (streaming, editor integration, model management, command palette) and note trade-offs.
3) Design: propose 3 prioritized features (with lightweight wireframes and required API changes).
4) Prototype: build two non-breaking prototypes behind feature flags — a streaming token POC and an enhanced ModelPicker UX.
5) Implement: break work into PR-sized tasks with tests, docs, and opt-in flags; iterate from prototypes.

Key deliverables:
- Audit notes and prioritized feature list
- Two prototypes: streaming output POC, ModelPicker UX improvements
- PR-ready implementation tasks with tests and docs

Immediate todos (tracked):
- [x] analyze-chat-codebase: Audit chat UI & provider flows to identify integration points and UX gaps.
- [x] review-opencode: Reviewed anomalyco/opencode — terminal-first streaming UX, agent modes, and client/server architecture are instructive for TUI patterns.
- [x] review-gemini-cli: Reviewed google-gemini/gemini-cli — MCP support, structured/streaming JSON output, and flexible auth flows are useful references.
- [x] prototype-streaming: Build a streaming POC (token streaming + progress/interrupt) behind a feature flag.
- [x] prototype-modelpicker: Prototype ModelPicker improvements (dynamic suggestions, cost badges, subscription-aware entries).
- [ ] plan-chat-ui-improvements: Produce final implementation roadmap and milestones after prototypes and reviews.

Refactor alignment (from refactoring_plan.md):
- Prioritize the streaming/parser refactor (agent streaming & parsing logic) as it unlocks safer UI/feature work.
- Centralize provider definitions and a ProviderFactory to reduce duplication and support subscription-aware listings.
- Introduce a ConfigStore and persistence abstractions to decouple environment-specific code for easier testing.
- Modularize commands and keybindings for clearer UX and easier extension.

Execution order (recommended):
1. Streaming/parser refactor & parser tests
2. Streaming POC + ModelPicker prototype
3. Commands modularization
4. Provider centralization
5. ConfigStore & persistence decoupling
6. Monorepo tooling and CI alignment

Next steps (autopilot):
- Start with analyze-chat-codebase (code audit) and parallel external-repo reviews (opencode & gemini-cli).
- After audit, produce the two prototypes (streaming + ModelPicker) and a PR-ready checklist.

Notes:
- This file is the canonical project-root plan that consolidates the session plan and refactoring_plan.md. Keep the session-scoped plan.md for ephemeral notes if desired.
- All changes should default to opt-in feature flags to reduce risk for users.
