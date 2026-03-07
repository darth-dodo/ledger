import { tool } from 'ai';
import { z } from 'zod';
import type { DataSource } from 'typeorm';

const FORBIDDEN_KEYWORDS = /\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i;
const ALLOWED_TABLE = /\btransactions\b/i;

function validateSql(sql: string): string | null {
  const trimmed = sql.trim();

  if (!/^SELECT\b/i.test(trimmed)) {
    return 'Query must start with SELECT';
  }

  if (FORBIDDEN_KEYWORDS.test(trimmed)) {
    return 'Query contains forbidden keywords (DROP, DELETE, INSERT, UPDATE, ALTER, CREATE)';
  }

  if (trimmed.includes(';')) {
    return 'Query must not contain semicolons';
  }

  // Check that only the transactions table is referenced
  const fromMatches = trimmed.match(/\bFROM\s+(\w+)/gi);
  const joinMatches = trimmed.match(/\bJOIN\s+(\w+)/gi);

  if (fromMatches) {
    for (const match of fromMatches) {
      const tableName = match.replace(/\bFROM\s+/i, '').trim();
      if (!ALLOWED_TABLE.test(tableName)) {
        return `Only the "transactions" table may be queried, found: ${tableName}`;
      }
    }
  }

  if (joinMatches) {
    return 'JOINs to other tables are not allowed';
  }

  return null;
}

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
