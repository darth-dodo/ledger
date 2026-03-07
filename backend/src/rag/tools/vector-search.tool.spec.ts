import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVectorSearchTool } from './vector-search.tool';
import type { EmbeddingsService } from '../../embeddings/embeddings.service';

const mockGetQueryEmbedding = vi.fn();
const mockSimilaritySearch = vi.fn();
const mockEmbeddingsService = {
  getQueryEmbedding: mockGetQueryEmbedding,
  similaritySearch: mockSimilaritySearch,
} as unknown as EmbeddingsService;

describe('createVectorSearchTool', () => {
  const vectorTool = createVectorSearchTool(mockEmbeddingsService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when embedding service returns null (unavailable)', async () => {
    mockGetQueryEmbedding.mockResolvedValue(null);

    const result = await vectorTool.execute(
      { query: 'dining expenses' },
      {} as Record<string, never>,
    );

    expect(result).toEqual({
      results: [],
      error: 'Embedding service unavailable',
    });
    expect(mockSimilaritySearch).not.toHaveBeenCalled();
  });

  it('returns mapped results with content, statementId, relevanceScore', async () => {
    const fakeVector = [0.1, 0.2, 0.3];
    mockGetQueryEmbedding.mockResolvedValue(fakeVector);
    mockSimilaritySearch.mockResolvedValue([
      { content: 'Lunch at cafe', statementId: 1, distance: 0.2 },
      { content: 'Dinner at restaurant', statementId: 2, distance: 0.4 },
    ]);

    const result = await vectorTool.execute(
      { query: 'dining expenses' },
      {} as Record<string, never>,
    );

    expect(result).toEqual({
      results: [
        { content: 'Lunch at cafe', statementId: 1, relevanceScore: 0.8 },
        {
          content: 'Dinner at restaurant',
          statementId: 2,
          relevanceScore: 0.6,
        },
      ],
    });
  });

  it('calculates relevanceScore as 1 - distance', async () => {
    const fakeVector = [0.5];
    mockGetQueryEmbedding.mockResolvedValue(fakeVector);
    mockSimilaritySearch.mockResolvedValue([
      { content: 'Payment', statementId: 3, distance: 0.15 },
    ]);

    const result = await vectorTool.execute({ query: 'payments' }, {} as Record<string, never>);

    expect(result.results[0].relevanceScore).toBeCloseTo(0.85);
  });

  it('calls getQueryEmbedding with the query string', async () => {
    mockGetQueryEmbedding.mockResolvedValue([0.1]);
    mockSimilaritySearch.mockResolvedValue([]);

    await vectorTool.execute({ query: 'grocery shopping' }, {} as Record<string, never>);

    expect(mockGetQueryEmbedding).toHaveBeenCalledWith('grocery shopping');
  });

  it('calls similaritySearch with vector and limit 5', async () => {
    const fakeVector = [0.1, 0.2];
    mockGetQueryEmbedding.mockResolvedValue(fakeVector);
    mockSimilaritySearch.mockResolvedValue([]);

    await vectorTool.execute({ query: 'rent payment' }, {} as Record<string, never>);

    expect(mockSimilaritySearch).toHaveBeenCalledWith(fakeVector, 5);
  });

  it('returns empty results array when no matches found', async () => {
    mockGetQueryEmbedding.mockResolvedValue([0.1]);
    mockSimilaritySearch.mockResolvedValue([]);

    const result = await vectorTool.execute(
      { query: 'nonexistent query' },
      {} as Record<string, never>,
    );

    expect(result).toEqual({ results: [] });
  });
});
