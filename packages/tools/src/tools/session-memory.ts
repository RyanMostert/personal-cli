import { tool } from 'ai';
import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

/** Workspace-scoped memory file (.pcli-memory.json at project root). */
function getMemoryPath(): string {
  return resolve(process.cwd(), '.pcli-memory.json');
}

type MemoryStore = Record<string, { value: string; updatedAt: number }>;

function loadStore(): MemoryStore {
  const p = getMemoryPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return {};
  }
}

function saveStore(store: MemoryStore): void {
  writeFileSync(getMemoryPath(), JSON.stringify(store, null, 2), 'utf-8');
}

export const memoryWrite = tool({
  description:
    'Store a named fact or note in the workspace memory. The model should use this to remember project conventions, user preferences, and important context that should persist across sessions.',
  inputSchema: z.object({
    key: z.string().describe('A short, unique key like "preferred-test-runner" or "api-base-url"'),
    value: z.string().describe('The value to store (text, JSON string, etc.)'),
  }),
  execute: async ({ key, value }) => {
    try {
      const store = loadStore();
      store[key] = { value, updatedAt: Date.now() };
      saveStore(store);
      return { output: `Stored memory[${key}]` };
    } catch (err) {
      return { error: `Failed to write memory: ${String(err)}` };
    }
  },
});

export const memoryRead = tool({
  description:
    'Read one or all entries from workspace memory. Call with no key to get all stored facts at the start of a session.',
  inputSchema: z.object({
    key: z.string().optional().describe('Specific key to read, or omit to read all entries'),
  }),
  execute: async ({ key }) => {
    try {
      const store = loadStore();

      if (key) {
        const entry = store[key];
        if (!entry) return { output: `No memory found for key: ${key}` };
        return { output: entry.value, key, updatedAt: new Date(entry.updatedAt).toISOString() };
      }

      const keys = Object.keys(store);
      if (keys.length === 0) return { output: 'Memory store is empty.' };

      const formatted = keys
        .map((k) => `${k}: ${store[k].value}`)
        .join('\n');

      return { output: formatted, count: keys.length };
    } catch (err) {
      return { error: `Failed to read memory: ${String(err)}` };
    }
  },
});

export const memoryDelete = tool({
  description: 'Delete a specific key from workspace memory.',
  inputSchema: z.object({
    key: z.string().describe('The key to delete'),
  }),
  execute: async ({ key }) => {
    try {
      const store = loadStore();
      if (!(key in store)) return { output: `Key not found: ${key}` };
      delete store[key];
      saveStore(store);
      return { output: `Deleted memory[${key}]` };
    } catch (err) {
      return { error: `Failed to delete memory: ${String(err)}` };
    }
  },
});

/** Returns all memory entries as a formatted string for system prompt injection. */
export function loadMemoryForPrompt(): string {
  try {
    const store = loadStore();
    const keys = Object.keys(store);
    if (keys.length === 0) return '';
    const lines = keys.map((k) => `- ${k}: ${store[k].value}`);
    return `## Workspace Memory\n${lines.join('\n')}`;
  } catch {
    return '';
  }
}
