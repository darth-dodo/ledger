import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock variables (available inside vi.mock factories)
// ---------------------------------------------------------------------------

const { mockChatComplete, mockStreamText, mockStepCountIs, mockCreateMistral, mockGenerateObject } =
  vi.hoisted(() => ({
    mockChatComplete: vi.fn(),
    mockStreamText: vi.fn(),
    mockStepCountIs: vi.fn(),
    mockCreateMistral: vi.fn(),
    mockGenerateObject: vi.fn(),
  }));

// ---------------------------------------------------------------------------
// Mock the @mistralai/mistralai module
// ---------------------------------------------------------------------------

vi.mock('@mistralai/mistralai', () => ({
  Mistral: vi.fn().mockImplementation(() => ({
    chat: {
      complete: mockChatComplete,
    },
  })),
}));

// ---------------------------------------------------------------------------
// Mock @ai-sdk/mistral and ai modules
// ---------------------------------------------------------------------------

vi.mock('@ai-sdk/mistral', () => ({
  createMistral: (...args: unknown[]) => {
    mockCreateMistral(...args);
    return () => 'mock-model';
  },
}));

vi.mock('ai', () => ({
  streamText: mockStreamText,
  stepCountIs: mockStepCountIs,
  generateObject: mockGenerateObject,
}));

import { MistralService } from './mistral.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMistralResponse(content: string) {
  return {
    choices: [
      {
        message: { content },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MistralService', () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.MISTRAL_API_KEY;
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore the env var
    if (originalApiKey !== undefined) {
      process.env.MISTRAL_API_KEY = originalApiKey;
    } else {
      delete process.env.MISTRAL_API_KEY;
    }
  });

  // ---------------------------------------------------------------
  // No API key
  // ---------------------------------------------------------------
  describe('when MISTRAL_API_KEY is not set', () => {
    it('returns nulls for all descriptions', async () => {
      delete process.env.MISTRAL_API_KEY;
      const service = new MistralService();

      const result = await service.categorize(['Coffee', 'Rent', 'Netflix']);

      expect(result).toEqual([null, null, null]);
      expect(mockChatComplete).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // With API key
  // ---------------------------------------------------------------
  describe('when MISTRAL_API_KEY is set', () => {
    let service: MistralService;

    beforeEach(() => {
      process.env.MISTRAL_API_KEY = 'test-api-key';
      service = new MistralService();
    });

    it('returns empty array for empty input', async () => {
      const result = await service.categorize([]);

      expect(result).toEqual([]);
      expect(mockChatComplete).not.toHaveBeenCalled();
    });

    it('parses valid category response as bare array', async () => {
      mockChatComplete.mockResolvedValue(makeMistralResponse('["groceries","dining","transport"]'));

      const result = await service.categorize(['WALMART GROCERY', 'PIZZA HUT', 'UBER TRIP']);

      expect(result).toEqual(['groceries', 'dining', 'transport']);
    });

    it('parses valid category response as object with categories key', async () => {
      mockChatComplete.mockResolvedValue(
        makeMistralResponse('{"categories":["entertainment","shopping","health"]}'),
      );

      const result = await service.categorize(['NETFLIX', 'AMAZON', 'PHARMACY']);

      expect(result).toEqual(['entertainment', 'shopping', 'health']);
    });

    it('parses response as array of objects with category property', async () => {
      mockChatComplete.mockResolvedValue(
        makeMistralResponse(
          '[{"transaction":"WALMART","category":"groceries"},{"transaction":"UBER","category":"transport"}]',
        ),
      );

      const result = await service.categorize(['WALMART', 'UBER']);

      expect(result).toEqual(['groceries', 'transport']);
    });

    it('returns nulls when response count mismatches input count', async () => {
      mockChatComplete.mockResolvedValue(makeMistralResponse('["groceries","dining"]'));

      // Sending 3 descriptions but response only has 2
      const result = await service.categorize(['WALMART', 'PIZZA HUT', 'GAS STATION']);

      expect(result).toEqual([null, null, null]);
    });

    it('returns nulls when response is not valid JSON', async () => {
      mockChatComplete.mockResolvedValue(makeMistralResponse('not valid json at all'));

      const result = await service.categorize(['WALMART']);

      expect(result).toEqual([null]);
    });

    it('returns nulls when response content is not a string', async () => {
      mockChatComplete.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const result = await service.categorize(['WALMART']);

      expect(result).toEqual([null]);
    });

    it('returns nulls when choices array is empty', async () => {
      mockChatComplete.mockResolvedValue({ choices: [] });

      const result = await service.categorize(['WALMART']);

      expect(result).toEqual([null]);
    });

    it('returns nulls on network error', async () => {
      mockChatComplete.mockRejectedValue(new Error('Network timeout'));

      const result = await service.categorize(['WALMART', 'UBER']);

      expect(result).toEqual([null, null]);
    });

    it('validates categories against the allowed set', async () => {
      mockChatComplete.mockResolvedValue(
        makeMistralResponse('["groceries","INVALID_CATEGORY","dining"]'),
      );

      const result = await service.categorize(['WALMART', 'UNKNOWN', 'PIZZA HUT']);

      expect(result).toEqual(['groceries', null, 'dining']);
    });

    it('normalizes category casing to lowercase', async () => {
      mockChatComplete.mockResolvedValue(makeMistralResponse('["Groceries","DINING","Transport"]'));

      const result = await service.categorize(['WALMART', 'PIZZA HUT', 'UBER']);

      expect(result).toEqual(['groceries', 'dining', 'transport']);
    });

    it('returns null for non-string items in the categories array', async () => {
      mockChatComplete.mockResolvedValue(makeMistralResponse('[123,"dining",null]'));

      const result = await service.categorize(['WALMART', 'PIZZA HUT', 'UBER']);

      expect(result).toEqual([null, 'dining', null]);
    });

    it('sends the correct model and message format', async () => {
      mockChatComplete.mockResolvedValue(makeMistralResponse('["groceries"]'));

      await service.categorize(['WALMART']);

      expect(mockChatComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'mistral-large-latest',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({
              role: 'user',
              content: '["WALMART"]',
            }),
          ]),
        }),
      );
    });

    it('returns nulls when parsed JSON is an object without categories key', async () => {
      mockChatComplete.mockResolvedValue(makeMistralResponse('{"result":"something"}'));

      const result = await service.categorize(['WALMART']);

      // Empty array parsed, count mismatch with input of 1 -> nulls
      expect(result).toEqual([null]);
    });

    it('handles all valid category values', async () => {
      const allCategories = [
        'groceries',
        'dining',
        'transport',
        'utilities',
        'entertainment',
        'shopping',
        'health',
        'education',
        'travel',
        'income',
        'transfer',
        'other',
      ];

      mockChatComplete.mockResolvedValue(makeMistralResponse(JSON.stringify(allCategories)));

      const descriptions = allCategories.map((c) => `desc-for-${c}`);
      const result = await service.categorize(descriptions);

      expect(result).toEqual(allCategories);
    });
  });

  // ---------------------------------------------------------------
  // chatStream
  // ---------------------------------------------------------------
  describe('chatStream', () => {
    it('throws error when API key not configured', () => {
      delete process.env.MISTRAL_API_KEY;
      const service = new MistralService();

      expect(() =>
        service.chatStream({
          system: 'You are a helper',
          messages: [{ role: 'user', content: 'hello' }] as unknown[],
        }),
      ).toThrow('Mistral API key not configured');
    });

    it('passes stopWhen directly to streamText', () => {
      process.env.MISTRAL_API_KEY = 'test-api-key';
      mockStreamText.mockReturnValue('stream-result');

      const service = new MistralService();
      const tools = { myTool: {} } as unknown as Record<string, unknown>;
      const messages = [{ role: 'user', content: 'hello' }] as unknown[];
      const stopWhen = ['mock-stop-condition'];

      service.chatStream({
        system: 'You are a helper',
        messages,
        tools,
        stopWhen,
      });

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          stopWhen,
          tools,
        }),
      );
    });

    it('defaults stopWhen to stepCountIs(3) when not provided', () => {
      process.env.MISTRAL_API_KEY = 'test-api-key';
      mockStepCountIs.mockReturnValue('stop-default');
      mockStreamText.mockReturnValue('stream-result');

      const service = new MistralService();

      service.chatStream({
        system: 'system prompt',
        messages: [] as unknown[],
      });

      expect(mockStepCountIs).toHaveBeenCalledWith(3);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          stopWhen: 'stop-default',
        }),
      );
    });

    it('passes onStepFinish callback when provided', () => {
      process.env.MISTRAL_API_KEY = 'test-api-key';
      mockStreamText.mockReturnValue('stream-result');

      const service = new MistralService();
      const onStepFinish = vi.fn();

      service.chatStream({
        system: 'system prompt',
        messages: [] as unknown[],
        onStepFinish,
      });

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          onStepFinish,
        }),
      );
    });
  });
});

describe('decomposeQuery', () => {
  let service: MistralService;

  beforeEach(() => {
    process.env.MISTRAL_API_KEY = 'test-key';
    service = new MistralService();
    mockGenerateObject.mockReset();
  });

  afterEach(() => {
    delete process.env.MISTRAL_API_KEY;
  });

  it('returns a single sub-query for a simple message', async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        subQueries: [{ query: 'total spend last month', intent: 'sql_aggregate' }],
      },
    });

    const result = await service.decomposeQuery('How much did I spend last month?');

    expect(result).toEqual([{ query: 'total spend last month', intent: 'sql_aggregate' }]);
  });

  it('returns multiple sub-queries for a compound message', async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        subQueries: [
          { query: 'total groceries last month', intent: 'sql_aggregate' },
          { query: 'total dining last month', intent: 'sql_aggregate' },
          { query: 'Uber charges', intent: 'vector_search' },
        ],
      },
    });

    const result = await service.decomposeQuery(
      'How much on groceries vs dining, and find Uber charges?',
    );

    expect(result).toHaveLength(3);
    expect(result[2].intent).toBe('vector_search');
  });

  it('falls back to hybrid intent when generateObject throws', async () => {
    mockGenerateObject.mockRejectedValue(new Error('API error'));

    const message = 'What are my biggest expenses?';
    const result = await service.decomposeQuery(message);

    expect(result).toEqual([{ query: message, intent: 'hybrid' }]);
  });

  it('returns hybrid fallback when API key is not set', async () => {
    delete process.env.MISTRAL_API_KEY;
    const noKeyService = new MistralService();

    const message = 'Show me my transactions';
    const result = await noKeyService.decomposeQuery(message);

    expect(result).toEqual([{ query: message, intent: 'hybrid' }]);
  });
});
