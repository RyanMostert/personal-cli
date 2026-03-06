# packages/tui — Terminal UI for personal-cli (skeleton)

This package is a skeleton for a terminal-native UI for personal-cli. The goal is to provide an interactive TUI as an alternative to the existing React-based CLI UI.

Recommended stack
- Ink (React-based terminal UI) — recommended for fast development and reuse of React components.
- Alternative: Blessed / Blessed-Contrib / terminal-kit if Ink is not desired.

What to implement (Gemini):
1. App shell: main renderer, status bar, message list, input box.
2. Streaming support: consume `parseStream()` from `@personal-cli/core` and render incremental `text-delta` events as they arrive.
3. Provider onboarding: wire `ProviderWizard` flows and `testProviderConnection()` from core.
4. Model picker: implement `/model` browsing and switching from the TUI.
5. Command palette / key bindings: map commands like `/settings` and `/provider` to keys.
6. Tests: add vitest tests and a small smoke test for starting and stopping the TUI.

Dev & build
- Build: pnpm -w -F @personal-cli/tui run build
- Start (after implementation): pnpm -w -F @personal-cli/tui run start

Integration points
- Use exports from `@personal-cli/core`: `Agent`, `ProviderManager`, `ConfigStore`, `parseStream`, and model refresh helpers.
- Keep feature flags in `ConfigStore` for gating experimental behaviors.

Acceptance criteria
- TUI can start, send messages to `Agent`, and render streaming responses incrementally.
- Provider onboarding and model switching are available in the TUI.
- Tests exist and CI passes.


