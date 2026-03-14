import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DataSource } from 'typeorm';
import { createUpdateCategoryTool } from './update-category.tool';

const mockQuery = vi.fn();
const mockDataSource = { query: mockQuery } as unknown as DataSource;

function buildTool() {
  return createUpdateCategoryTool(mockDataSource);
}

async function execute(transactionId: string, newCategory: string) {
  const tool = buildTool();
  return tool.execute({ transactionId, newCategory }, {} as Record<string, never>);
}

describe('createUpdateCategoryTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates category and returns old + new', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 'tx-1', category: 'groceries' }]);
    mockQuery.mockResolvedValueOnce([]);

    const result = await execute('tx-1', 'dining');

    expect(result).toEqual({
      success: true,
      transactionId: 'tx-1',
      oldCategory: 'groceries',
      newCategory: 'dining',
    });
  });

  it('rejects invalid category', async () => {
    const result = await execute('tx-1', 'invalid-category');

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining('Invalid category'),
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns error when transaction not found', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const result = await execute('nonexistent-id', 'dining');

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining('not found'),
    });
  });

  it('returns error on database failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection lost'));

    const result = await execute('tx-1', 'dining');

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining('connection lost'),
    });
  });
});
