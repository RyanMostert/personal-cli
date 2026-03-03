import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TOOL_OUTPUT_MAX_CHARS } from '@personal-cli/shared';
import type { PermissionCallback } from '../types.js';

const execAsync = promisify(exec);

export function createRunCommand(permissionFn?: PermissionCallback) {
  return tool({
    description:
      'Execute a shell command and return stdout/stderr. Use for running tests, builds, scripts, etc.',
    inputSchema: z.object({
      command: z.string().describe('Shell command to run'),
      cwd: z.string().optional().describe('Working directory (default: cwd)'),
      timeout: z
        .number()
        .int()
        .min(1000)
        .max(120_000)
        .default(30_000)
        .describe('Timeout in ms (default: 30s, max: 120s)'),
    }),
    execute: async ({ command, cwd, timeout }) => {
      if (permissionFn) {
        const ok = await permissionFn('run_command', { command, cwd });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: cwd ?? process.cwd(),
          timeout,
          maxBuffer: 1024 * 1024 * 4,
        });

        let output = '';
        if (stdout.trim()) output += stdout.trim();
        if (stderr.trim()) output += (output ? '\n[stderr]\n' : '[stderr]\n') + stderr.trim();
        if (!output) output = '(no output)';

        if (output.length > TOOL_OUTPUT_MAX_CHARS) {
          output = output.slice(0, TOOL_OUTPUT_MAX_CHARS) + '\n... (truncated)';
        }

        return { output };
      } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string; message?: string };
        const out = [e.stdout?.trim(), e.stderr?.trim(), e.message].filter(Boolean).join('\n');
        return { error: out.slice(0, TOOL_OUTPUT_MAX_CHARS) };
      }
    },
  });
}
