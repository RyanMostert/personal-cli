/**
 * TUI package entrypoint (skeleton).
 * Implement terminal UI (Ink recommended) and export a start function.
 */

export type TUI = {
  start: (opts?: { dev?: boolean }) => Promise<void>;
};

export function createTUI(): TUI {
  return {
    async start(opts?: { dev?: boolean }) {
      // Placeholder: the real TUI should initialize terminal UI, hook into Agent and ProviderManager,
      // and render streaming messages incrementally.
      // This skeleton is intentionally minimal; replace with Ink-based implementation.
      if (opts?.dev) {
        console.log('TUI (dev) started — replace with real Ink implementation.');
      } else {
        console.log('TUI started (placeholder).');
      }
    },
  };
}
