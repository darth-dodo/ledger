import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DataSource } from 'typeorm';
import { createSqlQueryTool } from './sql-query.tool.js';

// ---------------------------------------------------------------------------
// Mock DataSource
// ---------------------------------------------------------------------------

const mockQuery = vi.fn();
const mockDataSource = { query: mockQuery } as unknown as DataSource;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildTool() {
  return createSqlQueryTool(mockDataSource);
}

async function execute(sql: string) {
  const tool = buildTool();
  return tool.execute({ sql }, {} as Record<string, never>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createSqlQueryTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------
  // SQL Validation
  // -----------------------------------------------------------------
  describe('SQL validation', () => {
    describe('rejects non-SELECT queries', () => {
      const forbidden = [
        ['INSERT', 'INSERT INTO transactions VALUES (1)'],
        ['UPDATE', 'UPDATE transactions SET amount = 0'],
        ['DELETE', 'DELETE FROM transactions'],
        ['DROP', 'DROP TABLE transactions'],
        ['ALTER', 'ALTER TABLE transactions ADD COLUMN foo TEXT'],
        ['CREATE', 'CREATE TABLE evil (id INT)'],
        ['TRUNCATE', 'TRUNCATE TABLE transactions'],
      ] as const;

      for (const [keyword, sql] of forbidden) {
        it(`rejects ${keyword} statement`, async () => {
          const result = await execute(sql);

          expect(result).toHaveProperty('error');
          expect(result.results).toEqual([]);
          expect(mockQuery).not.toHaveBeenCalled();
        });
      }
    });

    it('rejects queries with semicolons', async () => {
      const result = await execute('SELECT * FROM transactions; SELECT 1');

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('semicolons');
      expect(result.results).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('rejects queries referencing tables other than transactions', async () => {
      const result = await execute('SELECT * FROM users');

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('transactions');
      expect(result.error).toContain('users');
      expect(result.results).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('rejects queries with JOINs', async () => {
      const result = await execute(
        'SELECT * FROM transactions JOIN users ON transactions.id = users.id',
      );

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('JOIN');
      expect(result.results).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('accepts valid SELECT from transactions', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await execute('SELECT * FROM transactions');

      expect(result).not.toHaveProperty('error');
      expect(mockQuery).toHaveBeenCalled();
    });

    it('accepts queries with WHERE, GROUP BY, ORDER BY, LIMIT', async () => {
      mockQuery.mockResolvedValue([{ total: 500 }]);

      const result = await execute(
        "SELECT category, SUM(amount) AS total FROM transactions WHERE type = 'debit' GROUP BY category ORDER BY total DESC LIMIT 10",
      );

      expect(result).not.toHaveProperty('error');
      expect(result.results).toEqual([{ total: 500 }]);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('accepts subqueries within SELECT referencing transactions', async () => {
      mockQuery.mockResolvedValue([{ count: 42 }]);

      const result = await execute(
        'SELECT (SELECT COUNT(*) FROM transactions) AS count FROM transactions',
      );

      expect(result).not.toHaveProperty('error');
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------
  // Execution behavior
  // -----------------------------------------------------------------
  describe('execution', () => {
    it('returns results from dataSource.query()', async () => {
      const rows = [
        { id: 1, amount: 50, category: 'groceries' },
        { id: 2, amount: 120, category: 'dining' },
      ];
      mockQuery.mockResolvedValue(rows);

      const result = await execute('SELECT * FROM transactions');

      expect(result.results).toEqual(rows);
    });

    it('returns rowCount alongside results', async () => {
      const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
      mockQuery.mockResolvedValue(rows);

      const result = await execute('SELECT * FROM transactions');

      expect(result.rowCount).toBe(3);
    });

    it('auto-appends LIMIT 100 when no LIMIT present', async () => {
      mockQuery.mockResolvedValue([]);

      await execute('SELECT * FROM transactions');

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM transactions LIMIT 100');
    });

    it('does NOT add extra LIMIT when LIMIT already present', async () => {
      mockQuery.mockResolvedValue([]);

      await execute('SELECT * FROM transactions LIMIT 10');

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM transactions LIMIT 10');
    });

    it('returns error object on SQL execution failure', async () => {
      mockQuery.mockRejectedValue(new Error('relation "transactions" does not exist'));

      const result = await execute('SELECT * FROM transactions');

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('SQL execution failed');
      expect(result.error).toContain('relation "transactions" does not exist');
      expect(result.results).toEqual([]);
    });

    it('handles non-Error thrown values during execution', async () => {
      mockQuery.mockRejectedValue('some string error');

      const result = await execute('SELECT * FROM transactions');

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('SQL execution failed');
      expect(result.error).toContain('some string error');
      expect(result.results).toEqual([]);
    });
  });
});
