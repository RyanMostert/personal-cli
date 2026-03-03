import { tool } from 'ai';
import { z } from 'zod';
import type { QuestionCallback } from '../types.js';

export function createQuestionTool(questionFn?: QuestionCallback) {
  return tool({
    description:
      'Pause the current task and ask the user a clarifying question before proceeding. Use this when you need information that would meaningfully change your approach — e.g., choosing between two valid implementations, deciding on scope, or resolving ambiguity. Provide options when applicable; leave options empty for free-text answers.',
    inputSchema: z.object({
      header: z.string().describe('The question to ask the user'),
      options: z
        .array(z.string())
        .optional()
        .describe('Numbered choices for the user to pick from. Omit for free-text.'),
    }),
    execute: async ({ header, options }) => {
      if (!questionFn) {
        return { answer: '(no question handler available — proceed with best judgment)' };
      }
      const answer = await questionFn(header, options ?? []);
      return { answer };
    },
  });
}
