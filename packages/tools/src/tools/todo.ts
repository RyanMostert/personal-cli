import { tool } from 'ai';
import { z } from 'zod';
import type { TodoItem } from '@personal-cli/shared';

export type TodoUpdateCallback = (todos: TodoItem[]) => void;

export function createTodoTools(onUpdate?: TodoUpdateCallback) {
  // Per-instance in-memory task list — scoped to the agent lifecycle
  const todoList: TodoItem[] = [];
  let nextId = 1;

  const todoWrite = tool({
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
      onUpdate?.([...todoList]);
      const pending = todoList.filter((t) => !t.done).length;
      const done = todoList.filter((t) => t.done).length;
      return { output: `Task list updated: ${done} done, ${pending} pending` };
    },
  });

  const todoRead = tool({
    description:
      'Read the current session task list. Use this to check which tasks are done and what remains before continuing multi-step work.',
    inputSchema: z.object({}),
    execute: async () => {
      if (todoList.length === 0) return { output: 'No tasks in list.' };
      const lines = todoList.map((t) => `${t.done ? '[x]' : '[ ]'} [${t.id}] ${t.text}`);
      return { output: lines.join('\n') };
    },
  });

  return { todoWrite, todoRead };
}
