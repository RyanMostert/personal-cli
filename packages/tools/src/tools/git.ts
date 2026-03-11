import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { TOOL_OUTPUT_MAX_CHARS } from '@personal-cli/shared';
import type { PermissionCallback } from '../types.js';

const execAsync = promisify(exec);

async function git(args: string, cwd?: string): Promise<string> {
  const { stdout, stderr } = await execAsync(`git ${args}`, {
    cwd: cwd ?? process.cwd(),
    maxBuffer: 1024 * 512,
  });
  return (stdout + (stderr ? `\n[stderr] ${stderr}` : '')).trim();
}

export const gitStatus = tool({
  description: 'Show the working tree status (modified, staged, untracked files).',
  inputSchema: z.object({
    cwd: z.string().optional().describe('Repository path'),
  }),
  execute: async ({ cwd }) => {
    try {
      const output = await git('status', cwd);
      return { output: output || 'Nothing to report.' };
    } catch (err) {
      return { error: String(err) };
    }
  },
});

export const gitDiff = tool({
  description: 'Show file diffs. If no file is specified, shows all changes.',
  inputSchema: z.object({
    staged: z.boolean().default(false).describe('Show staged changes only'),
    file: z.string().optional().describe('Specific file to diff (omit for all changes)'),
    cwd: z.string().optional(),
  }),
  execute: async ({ staged, file, cwd }) => {
    try {
      const workingDir = cwd ?? process.cwd();
      let fileToDiff = file;

      // If file is specified, validate it exists - if not, ignore and run full diff
      if (file) {
        const filePath = path.resolve(workingDir, file);
        if (!fs.existsSync(filePath)) {
          fileToDiff = undefined; // Fall back to full diff
        }
      }

      const args = ['diff', staged ? '--staged' : '', fileToDiff ?? ''].filter(Boolean).join(' ');
      let output = await git(args, workingDir);
      if (!output) output = 'No differences found.';
      if (output.length > TOOL_OUTPUT_MAX_CHARS) {
        output = output.slice(0, TOOL_OUTPUT_MAX_CHARS) + '\n... (truncated)';
      }
      return { output };
    } catch (err) {
      return { error: String(err) };
    }
  },
});

export const gitLog = tool({
  description: 'Show recent git commit history.',
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).default(10).describe('Number of commits to show'),
    cwd: z.string().optional(),
  }),
  execute: async ({ limit, cwd }) => {
    try {
      const output = await git(`log --oneline --decorate -${limit}`, cwd);
      return { output: output || 'No commits found.' };
    } catch (err) {
      return { error: String(err) };
    }
  },
});

export function createGitCommit(permissionFn?: PermissionCallback) {
  return tool({
    description: 'Create a git commit with the given message.',
    inputSchema: z.object({
      message: z.string().describe('Commit message'),
      cwd: z.string().optional(),
    }),
    execute: async ({ message, cwd }) => {
      if (permissionFn) {
        const ok = await permissionFn('gitCommit', { message });
        if (!ok) return { error: 'Permission denied by user.' };
      }
      try {
        const output = await git(`commit -m "${message.replace(/"/g, '\\"')}"`, cwd);
        return { output };
      } catch (err) {
        return { error: String(err) };
      }
    },
  });
}
