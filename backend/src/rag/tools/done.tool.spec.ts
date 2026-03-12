import { describe, it, expect } from 'vitest';
import { createDoneTool } from './done.tool';

describe('createDoneTool', () => {
  const tool = createDoneTool();

  it('echoes back the summary string', async () => {
    const result = await tool.execute(
      { summary: 'You spent $127.50 on Uber this month' },
      {} as Record<string, never>,
    );

    expect(result).toEqual({ summary: 'You spent $127.50 on Uber this month' });
  });

  it('handles empty summary', async () => {
    const result = await tool.execute({ summary: '' }, {} as Record<string, never>);

    expect(result).toEqual({ summary: '' });
  });
});
