# GitHub Copilot instructions — personal-cli

Purpose: concise guidance for Copilot-powered automation and code edits in this repository. Use these notes to find build/test/lint commands, understand the monorepo layout, and follow repository-specific conventions.

---

## Quick environment & requirements

- Node.js: >= 22
- pnpm: >= 9 (repo uses `pnpm@9.15.0` as packageManager)
- Workspace: pnpm workspace + Turbo (turbo) for builds

---

## Build, test, and lint commands (root)

- Install dependencies:
  - `pnpm install`

- Build (full workspace):
  - `pnpm run build`  # runs `turbo build`

- Dev / watch (monorepo):
  - `pnpm run dev` or `pnpm run build:dev`  # runs `turbo dev`

- Lint / format:
  - `pnpm run lint`        # eslint across packages
  - `pnpm run lint:fix`    # eslint --fix
  - `pnpm run format`      # prettier --write

- Tests:
  - `pnpm run test`        # vitest run (full suite)
  - `pnpm run test:watch`  # vitest (watch mode)

- Run built CLI (production build):
  - `pnpm run pcli`        # wrapper script
  - or `node --max-old-space-size=8192 packages\cli\dist\bin.js`

- Clean:
  - `pnpm run clean`       # turbo clean

### Running a single test (examples)

The repo uses Vitest. To run a specific test file or test name, run Vitest directly via pnpm:

- Single test file (path relative to repo root):
  - `pnpm exec vitest run packages/cli/src/__tests__/my.test.ts`

- Run tests only for a package (filter):
  - `pnpm --filter ./packages/cli exec vitest run`  # runs vitest in the cli package

- Run a single test by name/pattern:
  - `pnpm exec vitest -t "should do X"`  # match test name/pattern

Notes:
- If a package defines its own `test` script, `cd packages/<pkg> && pnpm run test -- <vitest-args>` also works.

---

## High-level architecture (big-picture)

- Monorepo (pnpm workspace) with orchestrated builds via Turbo.
- Packages of interest:
  - `packages/cli` — React + Ink terminal application; bundles to `dist/` (tsup) and exposes `pcli` binary.
  - `packages/core` — agent logic, conversation persistence, provider management.
  - `packages/tools` — built-in tools (git, web fetch/search, filesystem, semantic search, patch, etc.).
  - `packages/shared` — shared types and utilities.
  - `packages/mcp-client` — MCP client implementation.
  - `packages/zen-mcp-server` — example/implementation of an MCP server.
  - `packages/tui` — terminal UI primitives/components.

- Build flow:
  - `pnpm run build` → runs `turbo build` which invokes per-package build steps (tsup in many packages).
  - `tsup` bundles the CLI package and typically marks workspace packages as externals to reduce bundle size.

- Test & CI:
  - Tests run with Vitest (root script runs vitest across packages).

---

## Key conventions and repo-specific patterns

- Node engine and package manager are strict: Node >=22, pnpm@9+. Use node version manager to match.
- Branch naming: `rm-dev/<feature-name>` (used in repo history).
- Packages are private workspace packages (do not publish to npm). Use `workspace:` protocol for internal deps.
- ESM vs CommonJS:
  - Root `package.json` may be CommonJS (`type: "commonjs"`) while individual packages can be ESM; be careful with default vs named imports and tsup bundling.
- Config & user data:
  - User config (including `mcp.json`) is stored under `~/.personal-cli/` (CONFIG_DIR = '.personal-cli').
- CLI runtime:
  - The built CLI uses `node --max-old-space-size=8192` in some scripts to avoid memory issues for large builds.
- Linting & formatting:
  - ESLint and Prettier are configured at the repo root. Prefer running the root scripts so CI and local runs match.
- Running package-scoped commands:
  - Use pnpm filters when targeting a single package: `pnpm --filter ./packages/cli run build` or `pnpm --filter @scope/cli run test`.
- Tests:
  - Tests may be colocated inside packages or in a top-level `tests/` directory. Use vitest's path or `-t` to target specific tests.
- PR checklist (follow locally before opening PR):
  - `pnpm run test && pnpm run lint && pnpm run format && pnpm run build`

---

## Where to look for authoritative docs

- `README.md` — project overview
- `QUICKSTART.md` — quick start & workflow modes
- `dev-guide.md` — developer-focused instructions (install/build/test/lint examples)
- `docs/` and `packages/*/README.md` — package-specific notes

---

## Notes for Copilot sessions

- Prefer using package-level scripts and package-specific README files when available.
- When making cross-package edits, run `pnpm run build` (or `pnpm --filter <pkg> run build`) to validate changes.
- For CLI behavior changes, run `pnpm run dev` in `packages/cli` for hot reload during development.
- Use Vitest direct invocations for quick focused test runs as shown above.

---

## AI assistant / other config files

- Key docs integrated: `README.md`, `QUICKSTART.md`, `dev-guide.md`, `IMPLEMENTATION_SUMMARY.md` — consult these first.

---

Created by automation; keep this file concise and update when project scripts or architecture change.
