Onboarding & Feature Flags
=========================

This document describes how to use the new feature flags, streaming POC, and provider onboarding helpers added to Personal-CLI.

Feature Flags
-------------
- Feature flags are persisted under your user settings at ~/.personal-cli/settings.json in the "featureFlags" object.
- Use the CLI command to manipulate flags:
  - List settings: /settings list
  - Get a flag: /settings get-flag <FLAG_NAME>
  - Set a flag: /settings set-flag <FLAG_NAME> <on|off>

Examples:
- /settings set-flag PERSONAL_CLI_STREAMING_POC on
- /settings get-flag PERSONAL_CLI_MODEL_PICKER_POC

Streaming POC
-------------
- Experimental streaming behavior is available behind the PERSONAL_CLI_STREAMING_POC flag.
- When enabled, the agent flushes token deltas more frequently to reduce perceived latency. The default flush cadence is conservative to avoid jitter; the POC lowers the flush delay for interactive flows.
- To experiment without changing env vars, flip the flag with /settings set-flag PERSONAL_CLI_STREAMING_POC on.

ModelPicker behavior
--------------------
- The ModelPicker now sources GitHub Copilot models from the core copilot fetcher (the authoritative source) rather than a stale static registry.
- Cached GitHub Copilot entries are intentionally ignored to prevent stale cache values from overriding the authoritative list.
- Non-Copilot providers continue to use cached entries for faster startup; caches have per-provider staleness defaults.

Provider onboarding
-------------------
- Open provider manager with /provider and follow the in-CLI prompts to attach API keys or test a connection.
- Keys may also be set in ~/.personal-cli/mcp.json (for MCP providers) or via the underlying provider config files described in the repo docs.

Notes for contributors
----------------------
- All experimental UI/UX changes are behind feature flags persisted to ConfigStore to allow safe opt-in testing.
- Tests for the streaming parser and the in-memory persistence store were added to help stabilize refactors.

