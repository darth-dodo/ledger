import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock variables (available inside vi.mock factories)
// ---------------------------------------------------------------------------

const { mockChatComplete, mockStreamText, mockStepCountIs, mockCreateMistral } = vi.hoisted(() => ({
  mockChatComplete: vi.fn(),
  mockStreamText: vi.fn(),
  mockStepCountIs: vi.fn(),
  mockCreateMistral: vi.fn(),
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

    it('calls streamText with correct params', () => {
      process.env.MISTRAL_API_KEY = 'test-api-key';
      mockStepCountIs.mockReturnValue('stop-condition');
      mockStreamText.mockReturnValue('stream-result');

      const service = new MistralService();
      const tools = { myTool: {} } as unknown as Record<string, unknown>;
      const messages = [{ role: 'user', content: 'hello' }] as unknown[];

      const result = service.chatStream({
        system: 'You are a helper',
        messages,
        tools,
        maxSteps: 5,
      });

      expect(mockStreamText).toHaveBeenCalledWith({
        model: 'mock-model',
        system: 'You are a helper',
        messages,
        tools,
        stopWhen: 'stop-condition',
      });
      expect(mockStepCountIs).toHaveBeenCalledWith(5);
      expect(result).toBe('stream-result');
    });

    it('uses default maxSteps of 3 when not specified', () => {
      process.env.MISTRAL_API_KEY = 'test-api-key';
      mockStepCountIs.mockReturnValue('stop-default');
      mockStreamText.mockReturnValue('stream-result');

      const service = new MistralService();

      service.chatStream({
        system: 'system prompt',
        messages: [] as unknown[],
      });

      expect(mockStepCountIs).toHaveBeenCalledWith(3);
    });

    it('passes custom maxSteps when provided', () => {
      process.env.MISTRAL_API_KEY = 'test-api-key';
      mockStepCountIs.mockReturnValue('stop-10');
      mockStreamText.mockReturnValue('stream-result');

      const service = new MistralService();

      service.chatStream({
        system: 'system prompt',
        messages: [] as unknown[],
        maxSteps: 10,
      });

      expect(mockStepCountIs).toHaveBeenCalledWith(10);
    });
  });
});
