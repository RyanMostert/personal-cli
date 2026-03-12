/**
 * Tool for searching for text inside a specific file.
 *
 * Patterns summary:
 * - z.string() - creates a Zod string schema for validation
 * - .describe() - adds a description to the schema for documentation
 * - tool({ ... }) - defines a tool with description, inputSchema, and execute logic
 * - setSearchFilePermission(fn) - sets a permission callback for the tool
 * - setReadFilePermission(fn) - sets a permission callback for the read-file tool (MAW)
 * - setProviderKey(provider, key) - sets a provider key for authentication (MAW)
 * - setPersistenceStore(s) - sets the persistence store (MAW)
 * - setTelemetryEnabled(enabled) - enables/disables telemetry (MAW)
 * - setTheme(name) - sets the theme (MAW)
 *
 * Functions:
 *
 * z.string() - Creates a Zod schema that validates string values.
 * .describe('...') - Attaches a human-readable description to the schema, used for docs/UI.
 * tool({ ... }) - Registers a tool with a description, input schema, and execute function.
 * setSearchFilePermission(fn) - Sets a permission callback to control access to the tool.
 * setReadFilePermission(fn) - Sets a permission callback for the read-file tool. (MAW)
 * setProviderKey(provider, key) - Sets a provider key for authentication. (MAW)
 * setPersistenceStore(s) - Sets the persistence store. (MAW)
 * setTelemetryEnabled(enabled) - Enables/disables telemetry. (MAW)
 * setTheme(name) - Sets the theme. (MAW)
 * resolve(...) - Resolves a sequence of paths or path segments into an absolute path.
 * process.cwd() - Returns the current working directory of the Node.js process.
 * existsSync(path) - Checks if the given path exists in the filesystem (returns boolean).
 * readFileSync(path, encoding) - Reads the content of a file synchronously.
 * content.split('\n') - Splits a string into an array of lines.
 * lines[i].includes(query) - Checks if a line contains the query string.
 * matches.push({ ... }) - Adds a match object to the matches array.
 *
 * Input/Output:
 * - Input: { path: string, query: string }
 * - Output: { matches: Array<{ line: number, text: string }>, count: number } | { output: string } | { error: string }
 */
import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { PermissionCallback } from '../types.js';

let _permissionFn: PermissionCallback | undefined;
/**
 * Sets the permission callback for searchFile tool.
 * @param fn - PermissionCallback function
 */
export function setSearchFilePermission(fn: PermissionCallback) {
  _permissionFn = fn;
}

/**
 * Tool to search for text inside a specific file.
 * Input: { path: string, query: string }
 * Output: { matches: Array<{ line: number, text: string }>, count: number } | { output: string } | { error: string }
 */
export const searchFile = tool({
  description: 'Search for text inside a specific file',
  inputSchema: z.object({
    path: z.string().describe('Path to the file (absolute or relative to cwd)'),
    query: z.string().describe('Text to search for'),
  }),
  execute: async ({ path, query }) => {
    if (_permissionFn) {
      const ok = await _permissionFn('searchFile', { path, query });
      if (!ok) return { error: 'Permission denied for searchFile' };
    }

    const abs = resolve(process.cwd(), path);
    if (!existsSync(abs)) return { error: `File not found: ${path}` };

    try {
      const content = readFileSync(abs, 'utf-8');
      const lines = content.split('\n');
      const matches: { line: number; text: string }[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(query)) {
          matches.push({ line: i + 1, text: lines[i].trim() });
        }
      }

      if (matches.length === 0) return { output: 'No matches found.' };

      return { matches, count: matches.length };
    } catch (error) {
      const err = error as Error;
      return { error: `Error searching file: ${err.message}` };
    }
  },
});
