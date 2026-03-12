import { tool } from 'ai';
import { z } from 'zod';

export function createThinkTool() {
  return tool({
    description:
      'Use this tool to think through your approach before acting. Write your reasoning about what tools to call and why. This helps you plan multi-step analyses.',
    inputSchema: z.object({
      thought: z.string().describe('Your reasoning about what to do next'),
    }),
    execute: async ({ thought }: { thought: string }) => {
      return { thought };
    },
  });
}
