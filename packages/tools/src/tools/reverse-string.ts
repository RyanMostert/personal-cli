import { tool } from 'ai';
import { z } from 'zod';
import type { PermissionCallback } from '../types.js';

let _permissionFn: PermissionCallback | undefined;

export function setReverseStringPermission(fn: PermissionCallback) {
  _permissionFn = fn;
}

// tool to get a string and reverse it
export const reverseString = tool({
  description: 'Reverse a given string',
  inputSchema: z.object({
    text: z.string().describe('Text to reverse'),
  }),
  execute: async ({ text }) => {
    if (_permissionFn) {
      const ok = await _permissionFn('reverseString', { text });
      if (!ok) return { error: 'Permission denied for reverseString' };
    }

    return { output: text.split('').reverse().join('') };
  },
});
