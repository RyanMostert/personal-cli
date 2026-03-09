import { tool } from 'ai';
import { z } from 'zod';
import { readdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { TOOL_OUTPUT_MAX_CHARS } from '@personal-cli/shared';

const IGNORE = new Set([
  '.git',
  'node_modules',
  'dist',
  '.turbo',
  '.next',
  '__pycache__',
  '.cache',
]);

function listRecursive(dir: string, root: string, depth: number, maxDepth: number): string[] {
  if (depth > maxDepth) return [];
  const entries: string[] = [];
  try {
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (IGNORE.has(item.name)) continue;
      const prefix = '  '.repeat(depth);
      if (item.isDirectory()) {
        entries.push(`${prefix}${item.name}/`);
        entries.push(...listRecursive(join(dir, item.name), root, depth + 1, maxDepth));
      } else {
        entries.push(`${prefix}${item.name}`);
      }
    }
  } catch {
    // Ignore directories that cannot be read (e.g., due to permissions)
  }
  return entries;
}

export const listDir = tool({
  description: 'List the contents of a directory. Shows a tree view.',
  inputSchema: z.object({
    path: z.string().default('.').describe('Directory path (default: current directory)'),
    recursive: z.boolean().default(false).describe('List recursively'),
    maxDepth: z.number().int().min(1).max(6).default(2).describe('Max depth for recursive listing'),
  }),
  execute: async ({ path, recursive, maxDepth }) => {
    const abs = resolve(process.cwd(), path);
    if (!existsSync(abs)) return { error: `Directory not found: ${path}` };

    try {
      const lines = recursive
        ? listRecursive(abs, abs, 0, maxDepth)
        : readdirSync(abs, { withFileTypes: true }).map((e) =>
            e.isDirectory() ? `${e.name}/` : e.name,
          );

      let output = lines.join('\n');
      if (output.length > TOOL_OUTPUT_MAX_CHARS) {
        output = output.slice(0, TOOL_OUTPUT_MAX_CHARS) + '\n... (truncated)';
      }

      return { output: output || '(empty directory)', count: lines.length };
    } catch (err) {
      return { error: String(err) };
    }
  },
});
