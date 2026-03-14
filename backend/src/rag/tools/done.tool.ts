import { tool } from 'ai';
import { z } from 'zod';

export function createDoneTool() {
  return tool({
    description:
      'Call this tool when you have gathered enough information and are ready to give your final answer. Provide a brief summary of what you found.',
    inputSchema: z.object({
      summary: z.string().describe('Brief summary of your findings before responding to the user'),
    }),
    execute: async ({ summary }: { summary: string }) => {
      return { summary };
    },
  });
}
