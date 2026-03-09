import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { PermissionCallback, WriteCallback } from '../types.js';

export function createPatch(permissionFn?: PermissionCallback, onWrite?: WriteCallback) {
  return tool({
    description: 'Apply a unified diff (patch) to a file. Use this for complex multi-hunk changes.',
    inputSchema: z.object({
      path: z.string().describe('File path to patch'),
      patch: z.string().describe('The unified diff string'),
    }),
    execute: async ({ path, patch }) => {
      if (permissionFn) {
        const ok = await permissionFn('patch', { path, patch: patch.slice(0, 100) });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      const abs = resolve(process.cwd(), path);
      if (!existsSync(abs)) return { error: `File not found: ${path}` };

      try {
        const originalContent = readFileSync(abs, 'utf-8');
        const lines = originalContent.split(/\r?\n/);

        const hunks = parseUnifiedDiff(patch);
        if (hunks.length === 0) return { error: 'No valid hunks found in patch' };

        let resultLines = [...lines];
        let lineOffset = 0;

        for (const hunk of hunks) {
          const applied = applyHunk(resultLines, hunk, lineOffset);
          if (!applied.success) {
            return {
              error: `FAILED: Could not apply hunk at line ${hunk.oldStart} in ${path}. \nReason: ${applied.error}`,
            };
          }
          resultLines = applied.newLines;
          lineOffset += applied.offsetChange;
        }

        const newContent = resultLines.join('\n');
        writeFileSync(abs, newContent, 'utf-8');
        if (onWrite) onWrite(abs, originalContent, newContent);

        return { output: `SUCCESS: Applied ${hunks.length} hunk(s) to ${path}` };
      } catch (err) {
        return { error: `CRITICAL_ERROR during patch: ${String(err)}` };
      }
    },
  });
}

interface Hunk {
  oldStart: number;
  oldLength: number;
  newStart: number;
  newLength: number;
  lines: string[];
}

function parseUnifiedDiff(patch: string): Hunk[] {
  const lines = patch.split('\n');
  const hunks: Hunk[] = [];
  let currentHunk: Hunk | null = null;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      if (match) {
        currentHunk = {
          oldStart: parseInt(match[1], 10),
          oldLength: parseInt(match[2] || '1', 10),
          newStart: parseInt(match[3], 10),
          newLength: parseInt(match[4] || '1', 10),
          lines: [],
        };
        hunks.push(currentHunk);
      }
    } else if (currentHunk) {
      if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ')) {
        currentHunk.lines.push(line);
      }
    }
  }
  return hunks;
}

function applyHunk(
  lines: string[],
  hunk: Hunk,
  globalOffset: number,
): { success: boolean; newLines: string[]; offsetChange: number; error?: string } {
  const expectedStart = hunk.oldStart - 1 + globalOffset;

  // 1. Try exact match at expected location
  if (checkMatch(lines, expectedStart, hunk.lines, false)) {
    return doApply(lines, expectedStart, hunk);
  }

  // 2. Try fuzzy match (whitespace-agnostic) at expected location
  if (checkMatch(lines, expectedStart, hunk.lines, true)) {
    return doApply(lines, expectedStart, hunk);
  }

  // 3. Search for match within 200 lines of expected location
  const searchRadius = 200;
  for (let offset = 1; offset <= searchRadius; offset++) {
    // Try above
    if (expectedStart - offset >= 0) {
      if (checkMatch(lines, expectedStart - offset, hunk.lines, true)) {
        return doApply(lines, expectedStart - offset, hunk);
      }
    }
    // Try below
    if (expectedStart + offset <= lines.length - hunk.oldLength) {
      if (checkMatch(lines, expectedStart + offset, hunk.lines, true)) {
        return doApply(lines, expectedStart + offset, hunk);
      }
    }
  }

  return {
    success: false,
    newLines: lines,
    offsetChange: 0,
    error: 'Context not found (even with fuzzy matching)',
  };
}

function checkMatch(
  fileLines: string[],
  startIdx: number,
  hunkLines: string[],
  fuzzy: boolean,
): boolean {
  let filePtr = startIdx;

  for (const hLine of hunkLines) {
    if (hLine.startsWith('+')) continue; // Skip additions when matching context

    const context = hLine.slice(1);
    const target = fileLines[filePtr];

    if (target === undefined) return false;

    if (fuzzy) {
      if (target.trim() !== context.trim()) return false;
    } else {
      if (target !== context) return false;
    }

    filePtr++;
  }
  return true;
}

function doApply(
  lines: string[],
  startIdx: number,
  hunk: Hunk,
): { success: boolean; newLines: string[]; offsetChange: number } {
  const result = [...lines];
  const toRemove: number[] = [];
  const toAdd: string[] = [];

  let filePtr = startIdx;
  for (const hLine of hunk.lines) {
    if (hLine.startsWith(' ')) {
      filePtr++;
    } else if (hLine.startsWith('-')) {
      toRemove.push(filePtr);
      filePtr++;
    } else if (hLine.startsWith('+')) {
      toAdd.push(hLine.slice(1));
    }
  }

  // Remove lines from bottom up to maintain indices
  for (let i = toRemove.length - 1; i >= 0; i--) {
    result.splice(toRemove[i], 1);
  }

  // Insert new lines at the start position (plus adjustment for removed lines before this point)
  // Actually, it's easier to just use the original start index and insert all at once
  // since we already know exactly what we are replacing.

  const finalResult = [...lines];
  const oldLength = hunk.lines.filter((l) => !l.startsWith('+')).length;
  const newLines = hunk.lines.filter((l) => !l.startsWith('-')).map((l) => l.slice(1));

  finalResult.splice(startIdx, oldLength, ...newLines);

  return {
    success: true,
    newLines: finalResult,
    offsetChange: newLines.length - oldLength,
  };
}
