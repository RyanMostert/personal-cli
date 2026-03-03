import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { PermissionCallback } from '../types.js';

export function createEditFile(permissionFn?: PermissionCallback) {
  return tool({
    description:
      'Apply a surgical edit to a file by replacing an exact string with a new string. The oldText must match exactly (including whitespace/indentation).',
    inputSchema: z.object({
      path: z.string().describe('File path to edit'),
      oldText: z.string().describe('Exact text to find and replace'),
      newText: z.string().describe('Text to replace it with'),
      replaceAll: z.boolean().optional().default(false).describe('Replace all occurrences (default: first only)'),
    }),
    execute: async ({ path, oldText, newText, replaceAll }) => {
      if (permissionFn) {
        const ok = await permissionFn('edit_file', { path, oldText: oldText.slice(0, 100) });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      const abs = resolve(process.cwd(), path);
      if (!existsSync(abs)) return { error: `File not found: ${path}` };

      try {
        let content = readFileSync(abs, 'utf-8');
        if (!content.includes(oldText)) {
          return { error: `Text not found in ${path}:\n${oldText.slice(0, 200)}` };
        }

        const before = content.split(oldText).length - 1;
        if (replaceAll) {
          content = content.split(oldText).join(newText);
        } else {
          content = content.replace(oldText, newText);
        }

        writeFileSync(abs, content, 'utf-8');
        return {
          output: `Replaced ${replaceAll ? before : 1} occurrence(s) in ${path}`,
        };
      } catch (err) {
        return { error: String(err) };
      }
    },
  });
}
