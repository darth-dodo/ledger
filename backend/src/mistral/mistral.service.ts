import { Injectable, Logger } from '@nestjs/common';
import { Mistral } from '@mistralai/mistralai';

const VALID_CATEGORIES = new Set([
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
]);

const SYSTEM_PROMPT = `You are a bank transaction categorizer. For each transaction description, assign exactly one category from this list:
groceries, dining, transport, utilities, entertainment, shopping, health, education, travel, income, transfer, other

Respond with ONLY a JSON array of category strings in the same order as the input descriptions. No explanation, no markdown, just the JSON array.

Example input: ["WALMART GROCERY", "UBER TRIP", "NETFLIX"]
Example output: ["groceries","transport","entertainment"]`;

@Injectable()
export class MistralService {
  private readonly logger = new Logger(MistralService.name);
  private readonly client: Mistral | null;

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'MISTRAL_API_KEY not set — AI categorization will be disabled',
      );
      this.client = null;
    } else {
      this.client = new Mistral({ apiKey });
    }
  }

  async categorize(descriptions: string[]): Promise<(string | null)[]> {
    if (!this.client || descriptions.length === 0) {
      return descriptions.map(() => null);
    }

    try {
      const response = await this.client.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify(descriptions),
          },
        ],
        responseFormat: { type: 'json_object' as const },
      });

      const raw = response.choices?.[0]?.message?.content;
      if (typeof raw !== 'string') {
        this.logger.warn('Mistral returned non-string content');
        return descriptions.map(() => null);
      }

      const parsed: unknown = JSON.parse(raw);

      // The response may be a bare array or an object wrapping one
      const categories: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as Record<string, unknown>).categories)
          ? (parsed as Record<string, unknown>).categories as unknown[]
          : [];

      if (categories.length !== descriptions.length) {
        this.logger.warn(
          `Category count mismatch: expected ${descriptions.length}, got ${categories.length}`,
        );
        return descriptions.map(() => null);
      }

      return categories.map((cat) => {
        if (typeof cat === 'string' && VALID_CATEGORIES.has(cat.toLowerCase())) {
          return cat.toLowerCase();
        }
        return null;
      });
    } catch (error) {
      this.logger.error(
        `Categorization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return descriptions.map(() => null);
    }
  }
}
