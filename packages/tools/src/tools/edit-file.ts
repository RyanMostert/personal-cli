import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { PermissionCallback, WriteCallback } from '../types.js';

export function createEditFile(permissionFn?: PermissionCallback, onWrite?: WriteCallback) {
  return tool({
    description:
      'Apply a surgical edit to a file by replacing an exact string with a new string. Use this for all code changes. Provide enough context in oldText to make it unique.',
    inputSchema: z.object({
      path: z.string().describe('File path to edit'),
      oldText: z.string().describe('The EXACT text to find in the file. Include surrounding lines for uniqueness.'),
      newText: z.string().describe('The replacement text.'),
      allowMultiple: z.boolean().optional().default(false).describe('If true, replaces all occurrences.'),
    }),
    execute: async ({ path, oldText, newText, allowMultiple }) => {
      if (permissionFn) {
        const ok = await permissionFn('edit_file', { path, oldText: oldText.slice(0, 100) });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      const abs = resolve(process.cwd(), path);
      if (!existsSync(abs)) return { error: `File not found: ${path}` };

      try {
        const originalContent = readFileSync(abs, 'utf-8');
        
        // 1. Try exact match (including line endings normalization)
        const normalizedOriginal = originalContent.replace(/\r\n/g, '\n');
        const normalizedOld = oldText.replace(/\r\n/g, '\n');
        const normalizedNew = newText.replace(/\r\n/g, '\n');

        if (normalizedOriginal.includes(normalizedOld)) {
          const content = allowMultiple 
            ? normalizedOriginal.split(normalizedOld).join(normalizedNew)
            : normalizedOriginal.replace(normalizedOld, normalizedNew);
          
          writeFileSync(abs, content, 'utf-8');
          if (onWrite) onWrite(abs, originalContent, content);
          return { output: `SUCCESS: Surgical edit applied to ${path}` };
        }

        // 2. Try line-by-line trimmed match (handles indentation differences)
        const origLines = normalizedOriginal.split('\n');
        const oldLines = normalizedOld.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        if (oldLines.length === 0) return { error: "oldText is empty after trimming" };

        let foundIdx = -1;
        for (let i = 0; i <= origLines.length - oldLines.length; i++) {
          let match = true;
          for (let j = 0; j < oldLines.length; j++) {
            if (origLines[i + j].trim() !== oldLines[j]) {
              match = false;
              break;
            }
          }
          if (match) {
            foundIdx = i;
            break;
          }
        }

        if (foundIdx !== -1) {
          const newLines = normalizedNew.split('\n');
          const resultLines = [...origLines];
          // We need to find how many original lines we are replacing.
          // Since we matched trimmed lines, we should replace the block from foundIdx
          // but we need to be careful about which lines in origLines actually matched oldLines.
          // For simplicity, we'll replace the block starting at foundIdx with length equal to the 
          // number of lines we found in oldText.
          
          resultLines.splice(foundIdx, normalizedOld.split('\n').length, ...newLines);
          const content = resultLines.join('\n');
          
          writeFileSync(abs, content, 'utf-8');
          if (onWrite) onWrite(abs, originalContent, content);
          return { output: `SUCCESS: Applied edit to ${path} using fuzzy whitespace matching.` };
        }

        return { 
          error: `FAILED: Could not find exact or fuzzy match for the provided oldText in ${path}. \n\n` +
                 `TIP: Ensure you are copying the code EXACTLY as it appears in the file, including all punctuation.`
        };
      } catch (err) {
        return { error: `CRITICAL_ERROR during file edit: ${String(err)}` };
      }
    },
  });
}
