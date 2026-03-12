import { tool } from 'ai';
import { z } from 'zod';
import type { DataSource } from 'typeorm';
import { validateSql } from './validate-sql.js';

export function createSqlQueryTool(dataSource: DataSource) {
  return tool({
    description:
      'Query the transactions database directly with SQL. Best for calculations and aggregations like totals, averages, counts, and date-range filtering. The transactions table has columns: id, statement_id, date, description, amount, category, type (debit/credit).',
    inputSchema: z.object({
      sql: z.string().describe('A SELECT query against the transactions table'),
    }),
    execute: async ({ sql }: { sql: string }) => {
      const error = validateSql(sql);
      if (error) {
        return { error, results: [] };
      }

      // Append LIMIT 100 if not present
      let safeSql = sql.trim();
      if (!/\bLIMIT\b/i.test(safeSql)) {
        safeSql = `${safeSql} LIMIT 100`;
      }

      try {
        const results = await dataSource.query(safeSql);
        return { results, rowCount: (results as unknown[]).length };
      } catch (err) {
        return {
          error: `SQL execution failed: ${err instanceof Error ? err.message : String(err)}`,
          results: [],
        };
      }
    },
  });
}
