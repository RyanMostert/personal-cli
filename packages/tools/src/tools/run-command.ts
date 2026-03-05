import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { PermissionCallback } from '../types.js';

const execAsync = promisify(exec);

export function createRunCommand(permissionFn?: PermissionCallback) {
  return tool({
    description: 'Execute a shell command. Use this for testing, building, or gathering system diagnostics.',
    inputSchema: z.object({
      command: z.string().describe('The shell command to run'),
      cwd: z.string().optional().describe('Working directory for the command'),
    }),
    execute: async ({ command, cwd }) => {
      if (permissionFn) {
        const ok = await permissionFn('runCommand', { command, cwd });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      try {
        // Set a timeout to prevent hanging processes
        const { stdout, stderr } = await execAsync(command, { 
          cwd: cwd || process.cwd(),
          timeout: 60000, // 60s limit
          maxBuffer: 10 * 1024 * 1024 // 10MB
        });

        let output = '';
        if (stdout) output += stdout;
        if (stderr) output += `\n[STDERR]\n${stderr}`;

        // Truncate if output is massive to avoid token budget issues
        const limit = 20000;
        const finalOutput = output.length > limit
          ? output.slice(0, limit) + "\n\n[OUTPUT_TRUNCATED_DUE_TO_SIZE]"
          : output;

        return { 
          output: finalOutput || '(Command completed with no output)',
          exitCode: 0 
        };
      } catch (err: any) {
        return { 
          error: `COMMAND_FAILED: ${err.message}`,
          stdout: err.stdout,
          stderr: err.stderr,
          exitCode: err.code || 1
        };
      }
    },
  });
}
