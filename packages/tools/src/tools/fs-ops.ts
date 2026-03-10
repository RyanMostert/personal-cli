import { tool } from 'ai';
import { z } from 'zod';
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  renameSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'fs';
import { resolve, dirname, basename, join } from 'path';
import { tmpdir } from 'os';
import type { PermissionCallback, WriteCallback } from '../types.js';

/** Soft-delete dir: ~/.personal-cli/.trash/<timestamp>/ */
function getTrashDir(): string {
  const trashBase = join(process.env.HOME || tmpdir(), '.personal-cli', '.trash');
  mkdirSync(trashBase, { recursive: true });
  return trashBase;
}

export function createMoveFile(permissionFn?: PermissionCallback, onWrite?: WriteCallback) {
  return tool({
    description:
      'Move (rename) a file or directory from one path to another. Creates destination parent directories as needed.',
    inputSchema: z.object({
      source: z.string().describe('Source file or directory path'),
      destination: z.string().describe('Destination path'),
      overwrite: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, overwrites destination if it exists'),
    }),
    execute: async ({ source, destination, overwrite }) => {
      if (permissionFn) {
        const ok = await permissionFn('moveFile', { source, destination });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      try {
        const absSrc = resolve(process.cwd(), source);
        const absDst = resolve(process.cwd(), destination);

        if (!existsSync(absSrc)) return { error: `Source not found: ${source}` };
        if (existsSync(absDst) && !overwrite) {
          return {
            error: `Destination already exists: ${destination}. Use overwrite: true to replace.`,
          };
        }

        mkdirSync(dirname(absDst), { recursive: true });

        // Capture before state for undo
        let before: string | null = null;
        if (existsSync(absDst)) {
          try {
            before = readFileSync(absDst, 'utf-8');
          } catch {
            /* binary or dir */
          }
        }

        renameSync(absSrc, absDst);

        if (onWrite) {
          try {
            const after = readFileSync(absDst, 'utf-8');
            onWrite(absDst, before, after);
          } catch {
            /* binary or dir — skip undo tracking */
          }
        }

        return { output: `Moved ${source} → ${destination}` };
      } catch (err) {
        return { error: String(err) };
      }
    },
  });
}

export function createCopyFile(permissionFn?: PermissionCallback, onWrite?: WriteCallback) {
  return tool({
    description:
      'Copy a file (or recursively copy a directory) to a new location. Creates parent directories as needed.',
    inputSchema: z.object({
      source: z.string().describe('Source file or directory path'),
      destination: z.string().describe('Destination path'),
      overwrite: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, overwrites destination if it exists'),
    }),
    execute: async ({ source, destination, overwrite }) => {
      if (permissionFn) {
        const ok = await permissionFn('copyFile', { source, destination });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      try {
        const absSrc = resolve(process.cwd(), source);
        const absDst = resolve(process.cwd(), destination);

        if (!existsSync(absSrc)) return { error: `Source not found: ${source}` };
        if (existsSync(absDst) && !overwrite) {
          return {
            error: `Destination already exists: ${destination}. Use overwrite: true to replace.`,
          };
        }

        mkdirSync(dirname(absDst), { recursive: true });

        const srcStat = statSync(absSrc);
        if (srcStat.isDirectory()) {
          copyDirRecursive(absSrc, absDst);
          return { output: `Copied directory ${source} → ${destination}` };
        }

        copyFileSync(absSrc, absDst);

        if (onWrite) {
          try {
            const after = readFileSync(absDst, 'utf-8');
            onWrite(absDst, null, after);
          } catch {
            /* binary — skip */
          }
        }

        return { output: `Copied ${source} → ${destination}` };
      } catch (err) {
        return { error: String(err) };
      }
    },
  });
}

function copyDirRecursive(src: string, dst: string) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcEntry = join(src, entry);
    const dstEntry = join(dst, entry);
    if (statSync(srcEntry).isDirectory()) {
      copyDirRecursive(srcEntry, dstEntry);
    } else {
      copyFileSync(srcEntry, dstEntry);
    }
  }
}

export function createDeleteFile(permissionFn?: PermissionCallback, onWrite?: WriteCallback) {
  return tool({
    description:
      'Delete a file or directory. Files are soft-deleted to a trash directory so /undo can recover them. Use recursive: true for directories.',
    inputSchema: z.object({
      path: z.string().describe('File or directory path to delete'),
      recursive: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, deletes directories recursively'),
    }),
    execute: async ({ path, recursive }) => {
      if (permissionFn) {
        const ok = await permissionFn('deleteFile', { path, recursive });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      try {
        const abs = resolve(process.cwd(), path);
        if (!existsSync(abs)) return { error: `Path not found: ${path}` };

        const st = statSync(abs);
        const trashDir = getTrashDir();
        const stamp = Date.now();
        const trashPath = join(trashDir, `${stamp}_${basename(abs)}`);

        // Soft-delete: move to trash
        renameSync(abs, trashPath);

        // Track for undo (files only)
        if (onWrite && !st.isDirectory()) {
          try {
            const before = readFileSync(trashPath, 'utf-8');
            // onWrite with after='' signals deletion; undo restores before
            onWrite(abs, before, '');
          } catch {
            /* binary */
          }
        }

        return {
          output: `Deleted ${path} (recoverable from trash: ${trashPath})`,
          trashPath,
        };
      } catch (err) {
        return { error: String(err) };
      }
    },
  });
}
