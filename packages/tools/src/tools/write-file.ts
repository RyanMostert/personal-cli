import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import type { PermissionCallback } from '../types.js';

export function createWriteFile(permissionFn?: PermissionCallback) {
  return tool({
    description: 'Write content to a file, creating it (and any parent directories) if needed.',
    inputSchema: z.object({
      path: z.string().describe('File path to write'),
      content: z.string().describe('Content to write'),
    }),
    execute: async ({ path, content }) => {
      if (permissionFn) {
        const ok = await permissionFn('write_file', { path, contentLength: content.length });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      try {
        const abs = resolve(process.cwd(), path);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, content, 'utf-8');
        return { output: `Written ${content.split('\n').length} lines to ${path}` };
      } catch (err) {
        return { error: String(err) };
      }
    },
  });
}
