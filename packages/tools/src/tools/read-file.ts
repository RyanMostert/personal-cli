import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { TOOL_OUTPUT_MAX_CHARS } from '@personal-cli/shared';

export const readFile = tool({
  description:
    'Read the contents of a file. Optionally specify a line range. Returns truncated output for very large files.',
  parameters: z.object({
    path: z.string().describe('Path to the file (absolute or relative to cwd)'),
    startLine: z.number().int().positive().optional().describe('First line to read (1-indexed)'),
    endLine: z.number().int().positive().optional().describe('Last line to read (inclusive)'),
  }),
  execute: async ({ path, startLine, endLine }) => {
    const abs = resolve(process.cwd(), path);
    if (!existsSync(abs)) return { error: `File not found: ${path}` };

    try {
      const raw = readFileSync(abs, 'utf-8');
      let lines = raw.split('\n');
      const totalLines = lines.length;

      if (startLine || endLine) {
        const s = (startLine ?? 1) - 1;
        const e = endLine ?? totalLines;
        lines = lines.slice(s, e);
      }

      let content = lines.map((l, i) => `${(startLine ?? 1) + i}: ${l}`).join('\n');

      if (content.length > TOOL_OUTPUT_MAX_CHARS) {
        content = content.slice(0, TOOL_OUTPUT_MAX_CHARS) + `\n... (truncated, ${totalLines} total lines)`;
      }

      return { output: content, totalLines };
    } catch (err) {
      return { error: String(err) };
    }
  },
});
