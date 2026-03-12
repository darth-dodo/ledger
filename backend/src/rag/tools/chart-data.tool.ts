import { tool } from 'ai';
import { z } from 'zod';
import type { DataSource } from 'typeorm';
import { validateSql } from './validate-sql.js';

export function createChartDataTool(dataSource: DataSource) {
  return tool({
    description:
      'Generate chart-ready data by running a SQL query. The query MUST return rows with "label" and "value" columns (use AS aliases). Returns structured data with labels and values arrays.',
    inputSchema: z.object({
      type: z.enum(['pie', 'bar', 'line']).describe('Chart type'),
      title: z.string().describe('Chart title for display'),
      sql: z
        .string()
        .describe(
          'SELECT query returning "label" and "value" columns from the transactions table',
        ),
    }),
    execute: async ({ type, title, sql }: { type: string; title: string; sql: string }) => {
      const error = validateSql(sql);
      if (error) {
        return { error };
      }

      let safeSql = sql.trim();
      if (!/\bLIMIT\b/i.test(safeSql)) {
        safeSql = `${safeSql} LIMIT 100`;
      }

      try {
        const rows = (await dataSource.query(safeSql)) as Record<string, unknown>[];
        const labels = rows.map((r) => String(r.label ?? ''));
        const values = rows.map((r) => Number(r.value ?? 0));

        return { chartType: type, title, labels, values };
      } catch (err) {
        return {
          error: `Chart query failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  });
}
