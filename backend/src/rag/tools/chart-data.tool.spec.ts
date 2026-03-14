import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DataSource } from 'typeorm';
import { createChartDataTool } from './chart-data.tool.js';

const mockQuery = vi.fn();
const mockDataSource = { query: mockQuery } as unknown as DataSource;

function buildTool() {
  return createChartDataTool(mockDataSource);
}

async function execute(type: string, title: string, sql: string) {
  const tool = buildTool();
  return tool.execute({ type, title, sql }, {} as Record<string, never>);
}

describe('createChartDataTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns structured chart data from SQL results', async () => {
    mockQuery.mockResolvedValue([
      { label: 'groceries', value: 500 },
      { label: 'dining', value: 300 },
      { label: 'transport', value: 150 },
    ]);

    const result = await execute(
      'pie',
      'Spending by Category',
      "SELECT category AS label, SUM(amount) AS value FROM transactions WHERE type = 'debit' GROUP BY category ORDER BY value DESC",
    );

    expect(result).toEqual({
      chartType: 'pie',
      title: 'Spending by Category',
      labels: ['groceries', 'dining', 'transport'],
      values: [500, 300, 150],
    });
  });

  it('rejects non-SELECT queries', async () => {
    const result = await execute('bar', 'Bad', 'DROP TABLE transactions');

    expect(result).toHaveProperty('error');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects queries referencing non-transactions tables', async () => {
    const result = await execute('bar', 'Bad', 'SELECT * FROM users');

    expect(result).toHaveProperty('error');
    expect(result.error).toContain('transactions');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns error on SQL execution failure', async () => {
    mockQuery.mockRejectedValue(new Error('syntax error'));

    const result = await execute(
      'bar',
      'Test',
      'SELECT category AS label, SUM(amount) AS value FROM transactions GROUP BY category',
    );

    expect(result).toHaveProperty('error');
    expect(result.error).toContain('syntax error');
  });

  it('handles empty results', async () => {
    mockQuery.mockResolvedValue([]);

    const result = await execute(
      'line',
      'Empty',
      'SELECT date AS label, SUM(amount) AS value FROM transactions GROUP BY date',
    );

    expect(result).toEqual({
      chartType: 'line',
      title: 'Empty',
      labels: [],
      values: [],
    });
  });
});
