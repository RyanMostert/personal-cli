import { tool } from 'ai';
import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { PermissionCallback } from '../types.js';

const execAsync = promisify(exec);

type TestRunner = 'vitest' | 'jest' | 'mocha' | 'unknown';

interface DetectedRunner {
  runner: TestRunner;
  command: string;
}

/** Detect the test runner from package.json scripts and dependencies. */
function detectRunner(cwd: string): DetectedRunner {
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) return { runner: 'unknown', command: 'npm test' };

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const scripts: Record<string, string> = pkg.scripts ?? {};
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // Check scripts for runner patterns
    for (const [name, cmd] of Object.entries(scripts)) {
      if (typeof cmd !== 'string') continue;
      if (cmd.includes('vitest')) return { runner: 'vitest', command: `npm run ${name}` };
      if (cmd.includes('jest')) return { runner: 'jest', command: `npm run ${name}` };
      if (cmd.includes('mocha')) return { runner: 'mocha', command: `npm run ${name}` };
    }

    // Fall back to dependency detection
    if ('vitest' in deps) return { runner: 'vitest', command: 'npx vitest run' };
    if ('jest' in deps) return { runner: 'jest', command: 'npx jest' };
    if ('mocha' in deps) return { runner: 'mocha', command: 'npx mocha' };

    // If there's a test script, use it
    if (scripts.test) return { runner: 'unknown', command: 'npm test' };
  } catch {
    // Ignore parse errors
  }

  return { runner: 'unknown', command: 'npm test' };
}

/** Parse test output for pass/fail counts from common runners. */
function parseResults(
  output: string,
  runner: TestRunner,
): {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
} {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  if (runner === 'vitest') {
    // Vitest: "Tests  12 passed | 2 failed | 1 skipped (15)"
    const m = output.match(
      /Tests\s+(\d+)\s+passed(?:\s+\|\s+(\d+)\s+failed)?(?:\s+\|\s+(\d+)\s+skipped)?/i,
    );
    if (m) {
      passed = parseInt(m[1] ?? '0', 10);
      failed = parseInt(m[2] ?? '0', 10);
      skipped = parseInt(m[3] ?? '0', 10);
    }
  } else if (runner === 'jest') {
    // Jest: "Tests: 2 failed, 10 passed, 1 skipped, 13 total"
    const passM = output.match(/(\d+)\s+passed/i);
    const failM = output.match(/(\d+)\s+failed/i);
    const skipM = output.match(/(\d+)\s+skipped/i);
    passed = parseInt(passM?.[1] ?? '0', 10);
    failed = parseInt(failM?.[1] ?? '0', 10);
    skipped = parseInt(skipM?.[1] ?? '0', 10);
  }

  return { passed, failed, skipped, total: passed + failed + skipped };
}

export function createRunTests(permissionFn?: PermissionCallback) {
  return tool({
    description:
      'Run the project test suite and return structured results. Auto-detects vitest, jest, or mocha from package.json. Optionally filter to a specific file or pattern.',
    inputSchema: z.object({
      filter: z
        .string()
        .optional()
        .describe(
          'Optional test file path or name pattern to run (e.g. "auth" or "src/auth.test.ts")',
        ),
      cwd: z.string().optional().describe('Working directory (defaults to project root)'),
    }),
    execute: async ({ filter, cwd: cwdArg }) => {
      const cwd = cwdArg ? resolve(process.cwd(), cwdArg) : process.cwd();

      if (permissionFn) {
        const ok = await permissionFn('runTests', { cwd, filter: filter ?? '' });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      const { runner, command } = detectRunner(cwd);
      let finalCommand = command;

      // Append filter if provided
      if (filter) {
        if (runner === 'vitest') finalCommand += ` ${filter}`;
        else if (runner === 'jest') finalCommand += ` --testPathPattern="${filter}"`;
        else if (runner === 'mocha') finalCommand += ` --grep "${filter}"`;
        else finalCommand += ` -- ${filter}`;
      }

      try {
        const { stdout, stderr } = await execAsync(finalCommand, {
          cwd,
          timeout: 5 * 60 * 1000, // 5 min max
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
        });

        const combined = [stdout, stderr].filter(Boolean).join('\n');
        const results = parseResults(combined, runner);

        const summary =
          `Runner: ${runner} (${finalCommand})\n` +
          `Passed: ${results.passed} | Failed: ${results.failed} | Skipped: ${results.skipped} | Total: ${results.total}\n\n` +
          combined.slice(0, 15000) +
          (combined.length > 15000 ? '\n\n[OUTPUT_TRUNCATED]' : '');

        return {
          output: summary,
          passed: results.passed,
          failed: results.failed,
          skipped: results.skipped,
          total: results.total,
          runner,
          success: results.failed === 0,
        };
      } catch (err: any) {
        // Non-zero exit (test failures) — still return the output
        const combined = [err.stdout, err.stderr].filter(Boolean).join('\n');
        const results = parseResults(combined, runner);

        return {
          output:
            `Runner: ${runner} (${finalCommand})\n` +
            `Exit code: ${err.code ?? 1}\n` +
            `Passed: ${results.passed} | Failed: ${results.failed} | Skipped: ${results.skipped}\n\n` +
            combined.slice(0, 15000) +
            (combined.length > 15000 ? '\n\n[OUTPUT_TRUNCATED]' : ''),
          passed: results.passed,
          failed: results.failed,
          skipped: results.skipped,
          total: results.total,
          runner,
          success: false,
        };
      }
    },
  });
}
