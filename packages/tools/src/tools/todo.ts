import { tool } from 'ai';
import { z } from 'zod';

// Session-scoped in-memory task list — persists for the duration of the process
const todoList: Array<{ id: number; text: string; done: boolean }> = [];
let nextId = 1;

export const todoWrite = tool({
  description:
    'Write or update the task list for the current session. Use this to track multi-step plans, mark tasks done, or add new items. Each call REPLACES the full list — pass all tasks, not just the new ones.',
  inputSchema: z.object({
    tasks: z
      .array(
        z.object({
          id: z.number().optional().describe('Existing task id to update; omit to create new'),
          text: z.string().describe('Task description'),
          done: z.boolean().default(false).describe('Whether the task is complete'),
        }),
      )
      .describe('The complete task list'),
  }),
  execute: async ({ tasks }) => {
    todoList.length = 0;
    for (const t of tasks) {
      todoList.push({ id: t.id ?? nextId++, text: t.text, done: t.done });
    }
    const pending = todoList.filter((t) => !t.done).length;
    const done = todoList.filter((t) => t.done).length;
    return { output: `Task list updated: ${done} done, ${pending} pending` };
  },
});

export const todoRead = tool({
  description:
    'Read the current session task list. Use this to check which tasks are done and what remains before continuing multi-step work.',
  inputSchema: z.object({}),
  execute: async () => {
    if (todoList.length === 0) return { output: 'No tasks in list.' };
    const lines = todoList.map((t) => `${t.done ? '✅' : '⬜'} [${t.id}] ${t.text}`);
    return { output: lines.join('\n') };
  },
});
