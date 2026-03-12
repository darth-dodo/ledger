import { describe, it, expect } from 'vitest';
import { createThinkTool } from './think.tool';

describe('createThinkTool', () => {
  const tool = createThinkTool();

  it('echoes back the thought string', async () => {
    const result = await tool.execute(
      { thought: 'I need to check spending for March' },
      {} as Record<string, never>,
    );

    expect(result).toEqual({ thought: 'I need to check spending for March' });
  });

  it('handles empty thought string', async () => {
    const result = await tool.execute({ thought: '' }, {} as Record<string, never>);

    expect(result).toEqual({ thought: '' });
  });
});
