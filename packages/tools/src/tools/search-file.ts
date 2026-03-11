import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { PermissionCallback } from '../types.js';

let _permissionFn: PermissionCallback | undefined;
export function setSearchFilePermission(fn: PermissionCallback) {
  _permissionFn = fn;
}

export const searchFile = tool({
  description: 'Search for text inside a specific file',
  inputSchema: z.object({
    path: z.string().describe('Path to the file (absolute or relative to cwd)'),
    query: z.string().describe('Text to search for'),
  }),
  execute: async ({ path, query }) => {
    if (_permissionFn) {
      const ok = await _permissionFn('searchFile', { path, query });
      if (!ok) return { error: 'Permission denied for searchFile' };
    }

    const abs = resolve(process.cwd(), path);
    if (!existsSync(abs)) return { error: `File not found: ${path}` };

    try {
      const content = readFileSync(abs, 'utf-8');
      const lines = content.split('\n');
      const matches: { line: number; text: string }[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(query)) {
          matches.push({ line: i + 1, text: lines[i].trim() });
        }
      }

      if (matches.length === 0) return { output: 'No matches found.' };

      return { matches, count: matches.length };
    } catch (error) {
      const err = error as Error;
      return { error: `Error searching file: ${err.message}` };
    }
  },
});
