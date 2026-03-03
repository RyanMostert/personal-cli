import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { PermissionCallback, WriteCallback } from '../types.js';

export function createPatch(permissionFn?: PermissionCallback, onWrite?: WriteCallback) {
  return tool({
    description:
      'Apply a unified diff (patch) to a file. The diff must be in standard unified format (output of `diff -u` or `git diff`). Use this when you have a patch string and want to apply it precisely.',
    inputSchema: z.object({
      path: z.string().describe('File path to patch'),
      diff: z.string().describe('Unified diff string to apply'),
    }),
    execute: async ({ path, diff }) => {
      if (permissionFn) {
        const ok = await permissionFn('patch', { path });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      const abs = resolve(process.cwd(), path);
      if (!existsSync(abs)) return { error: `File not found: ${path}` };

      try {
        const before = readFileSync(abs, 'utf-8');
        const after = applyUnifiedDiff(before, diff);
        if (onWrite) onWrite(abs, before, after);
        writeFileSync(abs, after, 'utf-8');
        return { output: `Patch applied to ${path}` };
      } catch (err) {
        return { error: `Failed to apply patch: ${err}` };
      }
    },
  });
}

/**
 * Applies a unified diff to the original string.
 * Handles standard hunks: context lines (' '), removals ('-'), additions ('+').
 */
function applyUnifiedDiff(original: string, diff: string): string {
  const origLines = original.split('\n');
  const diffLines = diff.split('\n');
  const result = [...origLines];
  let lineOffset = 0;

  let i = 0;
  while (i < diffLines.length) {
    const hunkMatch = diffLines[i].match(/^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/);
    if (!hunkMatch) { i++; continue; }

    const origStart = parseInt(hunkMatch[1]) - 1; // convert to 0-indexed
    i++;

    // Collect hunk lines until next hunk or EOF
    const toRemove: string[] = []; // lines being replaced (context + '-' lines)
    const toAdd: string[] = [];    // replacement lines (context + '+' lines)

    while (i < diffLines.length && !diffLines[i].match(/^@@ /)) {
      const line = diffLines[i];
      if (line.startsWith('-')) {
        toRemove.push(line.slice(1));
      } else if (line.startsWith('+')) {
        toAdd.push(line.slice(1));
      } else {
        // Context line: appears in both old and new
        const content = line.startsWith(' ') ? line.slice(1) : line;
        toRemove.push(content);
        toAdd.push(content);
      }
      i++;
    }

    const at = origStart + lineOffset;
    result.splice(at, toRemove.length, ...toAdd);
    lineOffset += toAdd.length - toRemove.length;
  }

  return result.join('\n');
}
