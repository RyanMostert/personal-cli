# Developer Guide — personal-cli

This developer guide explains how to develop, build, test, and contribute to the personal-cli monorepo. It's a pragmatic, hands-on reference for new and returning contributors.

---

## Quick summary

- Monorepo managed with pnpm (pnpm workspace).
- Build system: turbo + tsup used inside packages.
- Language: TypeScript (Node >= 22 required).
- Runtime UI: React + Ink (terminal UI).
- Test runner: vitest.

---

## Prerequisites

- Node >= 22 (project declares node >=22.0.0)
- pnpm >= 9 (project uses pnpm workspace)
- Optional: Python 3.x (some helper tools may use Python)
- Recommended: VS Code with TypeScript and ESLint extensions

---

## Install & first run

1. Clone and install:

   git clone <repo-url>
   cd personal-cli
   pnpm install

2. Build the workspace:

   pnpm run build

3. Run the CLI (production build):

   pnpm start

Notes:
- There is a `pcli` entrypoint shipped by packages/cli; after building you can run the binary via node packages/cli/dist/bin.js or use the `pcli` command if installed globally.

---

## Useful scripts (root)

- pnpm run build → turbo build
- pnpm run dev / pnpm run build:dev → turbo dev (run the monorepo in dev/watch mode)
- pnpm run lint → run eslint across packages
- pnpm run lint:fix → eslint --fix
- pnpm run format → prettier --write
- pnpm run test → vitest run
- pnpm run test:watch → vitest (watch)
- pnpm run clean → turbo clean
- pnpm run pcli → node --max-old-space-size=8192 packages/cli/dist/bin.js

Tips:
- Many package-level builds (e.g., packages/cli) use tsup to bundle the CLI as ESM and emit d.ts.
- The root `build` uses turbo to orchestrate per-package builds.

---

## Repository layout (important directories)

- packages/
  - cli — Ink/React terminal application, exposes the `pcli` binary (packages/cli)
  - core — Agent logic, conversation persistence, provider management
  - tools — Built-in tools (git, web, fs, semantic search, etc.)
  - shared — Shared types and helpers used across packages
  - mcp-client — MCP (Model Context Protocol) client implementation
  - tui — Terminal UI primitives and components
  - zen-mcp-server — Example/implementation of an MCP server
- src/ — project-level source (if present for shared/experimental code)
- tests/ — test suites
- docs/ — supporting documentation

There are many planning and design docs in the repo root — read README.md, QUICKSTART.md and package-level READMEs first.

---

## How the CLI is built

- packages/cli uses tsup to bundle `src/bin.ts` and `src/app.tsx` into `dist/` as ESM. The bundle marks several large dependencies and workspace packages as externals to keep the runtime small and flexible.
- The package defines a `bin` entry `pcli` pointing at `./dist/bin.js`.
- For development you can run `pnpm --filter @personal-cli/cli dev` or `cd packages/cli && pnpm run dev` to start tsup in watch mode.

---

## Developing features

1. Create a feature branch off main. Branch naming convention used in repo: `rm-dev/<feature-name>`.
2. Add or modify code in the relevant package under `packages/`.
3. Keep changes scoped: prefer adding a new package if you introduce large new responsibilities.
4. Use the `workspace:*` protocol in package.json dependencies to refer to other workspace packages.

Adding a new package:
- Add a new folder under `packages/` with its own package.json and build/test scripts.
- Update pnpm workspace config if necessary (pnpm usually auto-discovers packages by pattern in pnpm-workspace.yaml).
- Run `pnpm install` and `pnpm -w build` to check the workspace resolution.

Cross-package imports:
- Import using the published package name (e.g. `@personal-cli/shared`) as configured in each package.json.

---

## Linting & Formatting

- ESLint is configured at the root. Run `pnpm run lint` to check TypeScript/JS files in `packages/**`.
- Auto-fix with `pnpm run lint:fix`.
- Format with Prettier: `pnpm run format`.

Editor integration:
- Enable format-on-save and the workspace ESLint/Prettier configs in your editor (VS Code recommended).

---

## Tests

- Test runner: vitest. Root script: `pnpm run test` (runs `vitest run`).
- Tests are colocated in `tests/` and may also live inside packages.
- For local TDD use `pnpm run test:watch`.

Writing tests:
- Keep unit tests fast and deterministic.
- Mock network, file system, and external tools where possible.
- Add tests alongside code changes and ensure CI runs them.

---

## Debugging & Running Locally

- To run the CLI in development mode (hot-reload):
  - cd packages/cli
  - pnpm run dev
- To run the built CLI binary locally:
  - cd repo root
  - pnpm run pcli
- Increase Node memory during builds via NODE_OPTIONS or the provided script flags when necessary.

---

## Build/Release notes

- The monorepo uses turbo to orchestrate builds. Run `pnpm run build` from repo root.
- Individual package builds (e.g. cli) use bundlers (tsup). Typical pattern:
  - Build root (turbo) → build package (tsup) → output to package/dist
- Produced dist artifacts are ESM; the root package.json has `type: commonjs`, but individual packages may be `module`.

---

## Coding conventions & guidelines

- TypeScript-first: prefer typed code and export types for public package APIs.
- Keep package boundaries clean: shared utilities in `@personal-cli/shared` only.
- Avoid large transitive dependencies in the CLI bundle — use externals in tsup as shown in packages/cli/package.json.
- Small, focused PRs are preferred.
- Run lint & tests locally before opening PRs.

Naming & exports:
- Use clear package-scoped names (e.g. `@personal-cli/tools`, `@personal-cli/core`).
- Export types and public APIs from an index file for each package.

---

## Common workflows / examples

Feature development workflow:
1. pnpm install
2. pnpm run dev (or `pnpm --filter @personal-cli/cli dev` for only cli package)
3. Make changes and verify hot-reload behavior in the TUI
4. Run tests and format/lint: `pnpm run test && pnpm run lint:fix && pnpm run format`
5. Push branch and open PR against `main`.

Release/workflow for local testing of CLI:
1. pnpm run build
2. node packages/cli/dist/bin.js

---

## CI expectations & pre-PR checklist

Before submitting a PR:
- [ ] Run unit tests: `pnpm run test`
- [ ] Run lint and auto-fix issues: `pnpm run lint` / `pnpm run lint:fix`
- [ ] Format code: `pnpm run format`
- [ ] Ensure build passes: `pnpm run build`
- [ ] Keep changes scoped and document behavior in PR description

---

## Where to find more docs

- README.md — high-level project overview
- QUICKSTART.md — step-by-step quick start instructions
- docs/ — additional documentation
- package-level READMEs under packages/*

---

## Notes & gotchas

- Node engine requirement is strict (>=22). Use a Node version manager to switch if needed.
- The CLI is built as ESM inside packages/cli; the root remains CommonJS. Be careful when authoring cross-package imports and when using default vs named exports.
- tsup builds mark several workspace packages as externals to avoid bundling them twice; updating those packages may require restarting dev watch/build so the CLI picks up new code.

---

If you'd like, I can:
- Add a small CONTRIBUTING.md file with the checklist above,
- Create per-package development notes (e.g. how core, tools, and mcp-client should be tested), or
- Open a PR with dev-guide.md added to the repo.

