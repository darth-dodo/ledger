import { tool } from 'ai';
import { z } from 'zod';
import type { EmbeddingsService } from '../../embeddings/embeddings.service';

export function createVectorSearchTool(embeddingsService: EmbeddingsService) {
  return tool({
    description:
      'Search through bank statement text chunks using semantic similarity. Best for contextual questions about specific transactions, merchants, or statement details.',
    inputSchema: z.object({
      query: z.string().describe('The search query to find relevant bank statement chunks'),
    }),
    execute: async ({ query }: { query: string }) => {
      const vector = await embeddingsService.getQueryEmbedding(query);
      if (!vector) {
        return { results: [], error: 'Embedding service unavailable' };
      }

      const results = await embeddingsService.similaritySearch(vector, 5);
      return {
        results: results.map((r) => ({
          content: r.content,
          statementId: r.statementId,
          relevanceScore: 1 - r.distance,
        })),
      };
    },
  });
}
