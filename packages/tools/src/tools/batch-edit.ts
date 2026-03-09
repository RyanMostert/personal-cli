import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, writeFileSync } from 'fs';
import fg from 'fast-glob';
import type { PermissionCallback, WriteCallback } from '../types.js';

interface FileChange {
  path: string;
  occurrences: number;
  before: string;
  after: string;
}

export function createBatchEdit(permissionFn?: PermissionCallback, onWrite?: WriteCallback) {
  return tool({
    description:
      'Search-and-replace across multiple files matching a glob pattern. Returns a diff summary. Use for symbol renames, import updates, and bulk refactors.',
    inputSchema: z.object({
      pattern: z.string().describe('Text or regex pattern to find'),
      replacement: z
        .string()
        .describe('Replacement string (supports $1 capture groups when isRegex: true)'),
      glob: z
        .string()
        .describe('Glob pattern to select files, e.g. "src/**/*.ts" or "**/*.{ts,tsx}"')
        .default('**/*.ts'),
      isRegex: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, treats pattern as a JavaScript regex'),
      flags: z
        .string()
        .optional()
        .default('g')
        .describe('Regex flags when isRegex is true (default: "g" for global replace)'),
      dryRun: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, previews changes without writing files'),
    }),
    execute: async ({ pattern, replacement, glob: globPattern, isRegex, flags, dryRun }) => {
      if (!dryRun && permissionFn) {
        const ok = await permissionFn('batchEdit', { pattern, glob: globPattern });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      try {
        const cwd = process.cwd();

        // Resolve matching files using fast-glob (already a dependency)
        const files = await fg(globPattern, {
          cwd,
          ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
          absolute: true,
        });

        if (files.length === 0) {
          return { output: `No files matched glob pattern: ${globPattern}`, filesChanged: 0 };
        }

        const regex = isRegex ? new RegExp(pattern, flags ?? 'g') : null;
        const changes: FileChange[] = [];
        const errors: string[] = [];

        for (const filePath of files) {
          let original: string;
          try {
            original = readFileSync(filePath, 'utf-8');
          } catch {
            continue; // Skip binary files
          }

          let updated: string;
          let occurrences = 0;

          if (regex) {
            // Count occurrences first
            const matches = original.match(new RegExp(pattern, flags ?? 'g'));
            occurrences = matches?.length ?? 0;
            updated = original.replace(regex, replacement);
          } else {
            // Literal string replace — count occurrences
            occurrences = original.split(pattern).length - 1;
            updated = original.split(pattern).join(replacement);
          }

          if (occurrences === 0 || updated === original) continue;

          changes.push({ path: filePath, occurrences, before: original, after: updated });
        }

        if (changes.length === 0) {
          return {
            output: `Pattern not found in any of the ${files.length} matched files.`,
            filesChanged: 0,
          };
        }

        // Apply changes unless dry run
        if (!dryRun) {
          for (const change of changes) {
            try {
              writeFileSync(change.path, change.after, 'utf-8');
              if (onWrite) onWrite(change.path, change.before, change.after);
            } catch (err) {
              errors.push(`Failed to write ${change.path}: ${String(err)}`);
            }
          }
        }

        const summary = changes
          .map((c) => {
            const rel = c.path.replace(cwd + '/', '').replace(cwd + '\\', '');
            return `  ${dryRun ? '[DRY RUN] ' : ''}${rel} — ${c.occurrences} occurrence${c.occurrences > 1 ? 's' : ''}`;
          })
          .join('\n');

        const totalOccurrences = changes.reduce((acc, c) => acc + c.occurrences, 0);

        let output =
          `${dryRun ? 'DRY RUN — ' : ''}Replaced ${totalOccurrences} occurrence${totalOccurrences > 1 ? 's' : ''} ` +
          `across ${changes.length} file${changes.length > 1 ? 's' : ''}:\n\n${summary}`;

        if (errors.length > 0) {
          output += `\n\nErrors:\n${errors.join('\n')}`;
        }

        return {
          output,
          filesChanged: dryRun ? 0 : changes.length,
          occurrencesReplaced: totalOccurrences,
          dryRun,
        };
      } catch (err) {
        return { error: String(err) };
      }
    },
  });
}
