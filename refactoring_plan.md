# Refactoring Plan

This document outlines the key weaknesses identified in the codebase and proposes a structured refactoring plan. The focus is on improving maintainability, robustness, and consistency without changing core behavior.

---

## Overview of Key Areas

1. **Agent streaming & parsing logic** (`packages/core/src/agent.ts`, `packages/core/src/utils/thought-transform.ts`)
2. **Provider & model configuration sprawl** (`packages/core/src/providers/manager.ts`, `packages/shared/src/models/registry.ts`, `packages/shared/src/providers/registry.ts`)
3. **Configuration & preferences handling** (`packages/core/src/config/*`)
4. **Command & keybinding registry complexity** (`packages/cli/src/commands/registry.ts`, `packages/cli/src/keybindings/registry.ts`)
5. **Streaming protocol & multi-tool usage duplication** (overlaps with 1, but tracked separately)
6. **Monorepo tests & tooling alignment** (root `package.json`, `turbo`, `pnpm`)
7. **Filesystem & environment coupling in core logic** (`packages/core/src/persistence/*`, `packages/core/src/config/*`, parts of `agent.ts`)

Each section below describes goals, risks, and concrete steps.

---

## 1. Agent Streaming & Parsing Logic

**Current issues**
- `Agent.sendMessage` is large and multi-purpose (prompt assembly, streaming parse, tool orchestration, token accounting).
- Thought (`<thought>…</thought>`) and multi-tool (`<multi_tool_use.parallel …>`) parsing is ad-hoc and partially duplicated between `agent.ts` and `thought-transform.ts`.
- Multi-tool parsing uses brittle string/regex logic instead of structured data.

**Goals**
- Centralize streaming parsing in a dedicated module.
- Make the streaming protocol explicit and typed.
- Simplify `Agent.sendMessage` to orchestrate events rather than parse raw text.

**Steps**
1. **Define a stream event model** in `packages/core/src/streaming/protocol.ts` (new):
   - `StreamEvent` union covering: `text`, `thought`, `tool_call`, `tool_result`, `usage`, `error`, etc.
   - `ToolCall` / `ToolResult` types.
2. **Extract a streaming parser** into `packages/core/src/streaming/parser.ts` (new):
   - Input: async chunks from `streamText`.
   - Output: async iterator or callback-based emitter of `StreamEvent`s.
   - Move all `<thought>` and `<multi_tool_use.parallel>` parsing logic here.
   - Replace custom multi-tool parsing with a more robust format (prefer JSON payload inside the tag) while keeping backward compatibility if feasible.
3. **Refactor `Agent.sendMessage`** to:
   - Call `streamText`.
   - Wrap its stream with the new parser.
   - Map `StreamEvent`s to existing external events consumed by `useAgent`.
   - Keep token/cost accounting, but delegate parsing of usage info to the parser.
4. **Unify or remove `thought-transform.ts`:**
   - If still needed, have it depend on the same logic as the streaming parser or move its behavior into `parser.ts`.
   - Ensure there is a single source of truth for thought parsing.
5. **Add focused tests** for the parser:
   - Sample streams with mixed text, thoughts, and tool calls.
   - Partial tags and boundary cases between chunks.

**Risks / mitigations**
- Risk of changing runtime behavior for tool calls or thoughts.
  - Mitigate by writing tests around current behaviors before refactoring.
- Streaming format from providers might evolve.
  - The new parser must be defensive and support unknown tags gracefully.

---

## 2. Provider & Model Configuration Sprawl

**Current issues**
- `packages/core/src/providers/manager.ts` contains many provider-specific blocks with repeated `createX` and API key resolution logic.
- Provider metadata (IDs, env vars) is duplicated between `manager.ts` and `packages/shared/src/providers/registry.ts` / `models/registry.ts`.

**Goals**
- Centralize provider definitions in a single, typed registry.
- Reduce duplication across UI and backend.
- Make adding/removing providers low-risk.

**Steps**
1. **Introduce a `ProviderDefinition` type** in `packages/shared/src/providers/types.ts` (new):
   - Fields: `id`, `label`, `description`, `envVar`, `keyUrl`, `needsKey`, flags for `supportsStreaming`, etc.
2. **Refactor `providers/registry.ts`** to export an array/map of `ProviderDefinition`s.
3. **Align `models/registry.ts`** to reference providers by shared IDs only.
4. **Create a `ProviderFactory` module** in `packages/core/src/providers/factory.ts`:
   - Given a `providerId` and configuration, construct the appropriate `LanguageModel` client.
   - Encapsulate all `createAnthropic`, `createOpenAI`, etc. calls here.
5. **Slim down `ProviderManager`** to:
   - Look up `ProviderDefinition` by ID.
   - Resolve credentials via a `CredentialResolver` helper.
   - Delegate client creation to `ProviderFactory`.
6. **Add tests** for:
   - Key resolution behavior.
   - Handling of providers that do/do not require keys.
   - Error messages when keys are missing.

**Risks / mitigations**
- Risk of breaking provider selection in existing configs.
  - Mitigate by preserving provider IDs and env var names across refactor.

---

## 3. Configuration & Preferences Handling

**Current issues**
- Multiple modules independently manage files under `~/.personal-cli` (`auth`, `prefs`, `settings`, `mcp`).
- Repeated path construction, directory creation, and sync FS usage.
- Only some data is validated by schemas.

**Goals**
- Provide a single, cohesive configuration service.
- Enforce schemas on all persisted data.
- Make config logic easier to test and migrate.

**Steps**
1. **Define schemas** for all config types (if not already):
   - Auth store, prefs, settings, MCP config.
   - Use Zod in a shared `config/schema.ts` module.
2. **Introduce a `ConfigStore` service** in `packages/core/src/config/store.ts`:
   - Typed APIs for `getAuth`, `setAuth`, `getPrefs`, `updatePrefs`, `getSettings`, etc.
   - Centralize directory and file handling.
3. **Refactor existing modules** (`auth.ts`, `prefs.ts`, `loader.ts`, `mcp.ts`) to:
   - Become thin wrappers around `ConfigStore`, or be merged if appropriate.
4. **Add tests** for `ConfigStore` covering:
   - Default values.
   - Missing/corrupt files.
   - Permissions and directory creation.

**Risks / mitigations**
- Risk of breaking existing user configs due to schema changes.
  - Mitigate via migration logic in `ConfigStore` (e.g., handling missing fields and old shapes).

---

## 4. Command & Keybinding Registry Complexity

**Current issues**
- `packages/cli/src/commands/registry.ts` is a large, multi-purpose file.
- Commands parse `args` manually with inconsistent patterns.
- Keybindings are defined separately and not strongly tied to commands.

**Goals**
- Modularize commands by concern.
- Make command arguments typed and consistently parsed.
- Bind keybindings to high-level actions/commands.

**Steps**
1. **Introduce a `CommandDef` type** in `packages/cli/src/types/commands.ts`:
   - Generic over `Args`: `{ name; aliases?; parseArgs; handler; category?; description? }`.
2. **Split `commands/registry.ts`** into smaller modules:
   - `commands/conversation.ts` (rename, compact, clear, export, history).
   - `commands/files.ts` (attach, open, workspace management).
   - `commands/tools.ts` (tools listing, plugins, macros).
   - `commands/zen.ts` (Zen gateway–specific commands).
   - `commands/system.ts` (help, models, status, settings).
3. **Create a new `commands/index.ts`** that aggregates `CommandDef`s and exposes:
   - `getCommands()`
   - `dispatch()`
   - `tryMatchIntent()` (moved into its own module if needed).
4. **Refactor keybindings** to map to actions that invoke command handlers:
   - Define an `Action` enum or type.
   - Have keybindings map keys → actions, and a central dispatcher map actions → command invocations.
5. **Add tests** for:
   - Command parsing for tricky arguments.
   - Intent matching and “did you mean” suggestions.

**Risks / mitigations**
- Risk of subtle behavior changes in command parsing.
  - Mitigate by snapshotting current behavior with tests before refactor.

---

## 5. Streaming Protocol & Multi-Tool Usage Duplication

*(Related to Section 1 but tracked separately to emphasize coordination with other components.)*

**Current issues**
- Multiple components understand the custom streaming markup: `agent.ts`, `thought-transform.ts`, `useAgent.ts`.
- Any change in protocol requires changes in multiple places.

**Goals**
- Make the streaming protocol a first-class, well-documented concept.
- Ensure a single implementation of protocol parsing.

**Steps**
1. **Document the streaming protocol** in `docs/streaming_protocol.md` (new):
   - Tag formats (`<thought>`, `<multi_tool_use.parallel>`).
   - Expected JSON or attribute structure for tool calls.
   - Semantics of events.
2. **Align parser implementation** (Section 1) with this spec.
3. **Update consumers** (`Agent`, `useAgent`, any MCP or server code) to rely on typed `StreamEvent`s instead of parsing tags.

**Risks / mitigations**
- Same as Section 1; primary mitigation is comprehensive tests and docs.

---

## 6. Monorepo Tests & Tooling Alignment

**Current issues**
- Root-level health check doesn\'t detect tests (even though packages have tests).
- `npm outdated` / `npm audit` commands are mismatched with `pnpm`-based workflow.

**Goals**
- Have a single, obvious way to run all tests and lint checks.
- Align dependency/security checks with `pnpm`.

**Steps**
1. **Update root `package.json` scripts**:
   - `"test": "turbo test"`
   - `"lint": "turbo lint"` (or equivalent existing commands).
2. **If you control project health tooling**, configure it to:
   - Prefer `pnpm outdated --recursive` and `pnpm audit` when `pnpm-lock.yaml` is present.
3. **Add CI workflows** (if not already) to run tests and lint across all packages.

**Risks / mitigations**
- Minimal; mostly scripting/config changes.

---

## 7. Filesystem & Environment Coupling in Core Logic

**Current issues**
- Core logic (agent, persistence, config) uses sync `fs` and direct homedir paths.
- This couples the library strongly to a local CLI + filesystem environment.

**Goals**
- Decouple core logic from concrete storage.
- Make it easier to test and to support alternative runtimes (e.g., server, remote agent).

**Steps**
1. **Define interfaces** for persistence in `packages/core/src/persistence/types.ts`:
   - `ConversationStore`, `WorkspaceStore`, `HistoryStore`, etc.
2. **Provide default FS-based implementations** in `persistence/fs-store.ts` using current logic.
3. **Update `Agent` and related modules** to depend on these interfaces instead of importing `fs`-backed functions directly.
4. **Add an in-memory store implementation** for testing.

**Risks / mitigations**
- Some constructor signatures will change (e.g., `AgentOptions` might accept stores).
  - Mitigate via optional parameters with sensible defaults.

---

## Suggested Execution Order

1. **Agent streaming & parser refactor** (Sections 1 & 5).
2. **Command registry modularization** (Section 4).
3. **Provider configuration centralization** (Section 2).
4. **Config service abstraction** (Section 3).
5. **Filesystem decoupling for persistence** (Section 7).
6. **Monorepo tooling alignment** (Section 6).

This order balances risk and impact: start with well-contained refactors that improve core behavior (streaming), then simplify developer-facing surfaces (commands, providers), and finally clean up infrastructure and tooling.
