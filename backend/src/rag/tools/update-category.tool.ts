import { tool } from 'ai';
import { z } from 'zod';
import type { DataSource } from 'typeorm';
import { VALID_CATEGORIES } from '../../shared/categories.js';

export function createUpdateCategoryTool(dataSource: DataSource) {
  return tool({
    description:
      'Update the category of a specific transaction. Use this when the user wants to re-categorize a transaction. You must first find the transaction ID using sql_query.',
    inputSchema: z.object({
      transactionId: z.string().describe('The UUID of the transaction to update'),
      newCategory: z
        .string()
        .describe(
          'The new category (groceries, dining, transport, utilities, entertainment, shopping, health, education, travel, income, transfer, other)',
        ),
    }),
    execute: async ({
      transactionId,
      newCategory,
    }: {
      transactionId: string;
      newCategory: string;
    }) => {
      const normalized = newCategory.toLowerCase();
      if (!VALID_CATEGORIES.has(normalized)) {
        return {
          success: false,
          error: `Invalid category "${newCategory}". Must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
        };
      }

      try {
        const rows = await dataSource.query(
          'SELECT id, category FROM transactions WHERE id = $1',
          [transactionId],
        );

        if (rows.length === 0) {
          return { success: false, error: `Transaction ${transactionId} not found` };
        }

        const oldCategory = rows[0].category;

        await dataSource.query('UPDATE transactions SET category = $1 WHERE id = $2', [
          normalized,
          transactionId,
        ]);

        return {
          success: true,
          transactionId,
          oldCategory,
          newCategory: normalized,
        };
      } catch (err) {
        return {
          success: false,
          error: `Update failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  });
}
