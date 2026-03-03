import { tool } from 'ai';
import { z } from 'zod';

export const think = tool({
  description:
    'Use this tool to think step by step before responding. Useful for complex reasoning, planning, or breaking down multi-step problems. The thought is not shown to the user directly.',
  inputSchema: z.object({
    thought: z.string().describe('Your detailed reasoning or plan'),
  }),
  execute: async ({ thought }) => {
    return { output: `Thought recorded (${thought.split(' ').length} words).` };
  },
});
