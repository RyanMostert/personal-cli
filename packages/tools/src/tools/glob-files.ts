import { tool } from 'ai';
import { z } from 'zod';
import fg from 'fast-glob';
import { TOOL_OUTPUT_MAX_CHARS } from '@personal-cli/shared';

export const globFiles = tool({
  description: 'Find files matching a glob pattern (e.g. "src/**/*.ts", "**/*.test.js").',
  parameters: z.object({
    pattern: z.string().describe('Glob pattern to match files'),
    cwd: z.string().optional().describe('Base directory (default: cwd)'),
    ignore: z
      .array(z.string())
      .optional()
      .default(['**/node_modules/**', '**/dist/**', '**/.git/**'])
      .describe('Patterns to ignore'),
  }),
  execute: async ({ pattern, cwd, ignore }) => {
    try {
      const files = await fg(pattern, {
        cwd: cwd ?? process.cwd(),
        ignore,
        onlyFiles: true,
        dot: false,
      });

      if (files.length === 0) return { output: 'No files matched.' };

      let output = files.sort().join('\n');
      if (output.length > TOOL_OUTPUT_MAX_CHARS) {
        output = output.slice(0, TOOL_OUTPUT_MAX_CHARS) + '\n... (truncated)';
      }

      return { output, count: files.length };
    } catch (err) {
      return { error: String(err) };
    }
  },
});
