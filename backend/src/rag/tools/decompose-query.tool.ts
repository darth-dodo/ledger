import { tool } from 'ai';
import { z } from 'zod';
import type { MistralService } from '../../mistral/mistral.service';

export function createDecomposeQueryTool(mistralService: MistralService) {
  return tool({
    description:
      'Decompose the user message into structured sub-queries with intent tags. Call this first on every message to plan your approach.',
    inputSchema: z.object({
      message: z.string().describe('The original user message to decompose into sub-queries'),
    }),
    execute: async ({ message }: { message: string }) => {
      const subQueries = await mistralService.decomposeQuery(message);
      return { subQueries };
    },
  });
}
