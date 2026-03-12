import { Injectable, Logger } from '@nestjs/common';
import { Mistral } from '@mistralai/mistralai';
import { createMistral } from '@ai-sdk/mistral';
import { streamText, stepCountIs, type ModelMessage, type ToolSet } from 'ai';
import { VALID_CATEGORIES } from '../shared/categories.js';

const SYSTEM_PROMPT = `You are a bank transaction categorizer. For each transaction description, assign exactly one category from this list:
groceries, dining, transport, utilities, entertainment, shopping, health, education, travel, income, transfer, other

Respond with ONLY a JSON array of category strings in the same order as the input descriptions. No explanation, no markdown, just the JSON array.

Example input: ["WALMART GROCERY", "UBER TRIP", "NETFLIX"]
Example output: ["groceries","transport","entertainment"]`;

@Injectable()
export class MistralService {
  private readonly logger = new Logger(MistralService.name);
  private readonly client: Mistral | null;
  private readonly aiModel: ReturnType<ReturnType<typeof createMistral>> | null;

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      this.logger.warn('MISTRAL_API_KEY not set — AI categorization will be disabled');
      this.client = null;
      this.aiModel = null;
    } else {
      this.client = new Mistral({ apiKey });
      this.aiModel = createMistral({ apiKey })('mistral-large-latest');
    }
  }

  async categorize(descriptions: string[]): Promise<(string | null)[]> {
    if (!this.client || descriptions.length === 0) {
      return descriptions.map(() => null);
    }

    // Batch large lists to avoid response mismatches
    const BATCH_SIZE = 20;
    if (descriptions.length > BATCH_SIZE) {
      const results: (string | null)[] = [];
      for (let i = 0; i < descriptions.length; i += BATCH_SIZE) {
        const batch = descriptions.slice(i, i + BATCH_SIZE);
        const batchResults = await this.categorizeBatch(batch);
        results.push(...batchResults);
      }
      return results;
    }

    return this.categorizeBatch(descriptions);
  }

  private async categorizeBatch(descriptions: string[]): Promise<(string | null)[]> {
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

      // The response may be:
      // 1. A bare array of strings: ["groceries", "dining"]
      // 2. An object wrapping an array: { categories: ["groceries", "dining"] }
      // 3. An array of objects: [{ category: "groceries" }, ...]
      let categories: unknown[];
      if (Array.isArray(parsed)) {
        categories = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Find the first array property in the response object
        const values = Object.values(parsed as Record<string, unknown>);
        const arr = values.find((v) => Array.isArray(v));
        categories = Array.isArray(arr) ? arr : [];
      } else {
        categories = [];
      }

      // Normalize: if items are objects with a "category" property, extract it
      const normalized = categories.map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          return typeof obj.category === 'string' ? obj.category : null;
        }
        return null;
      });

      if (normalized.length !== descriptions.length) {
        this.logger.warn(
          `Category count mismatch: expected ${descriptions.length}, got ${normalized.length}`,
        );
        return descriptions.map(() => null);
      }

      return normalized.map((cat) => {
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

  chatStream(params: {
    system: string;
    messages: ModelMessage[];
    tools?: ToolSet;
    stopWhen?: unknown;
    onStepFinish?: (step: Record<string, unknown>) => void | Promise<void>;
  }): ReturnType<typeof streamText> {
    if (!this.aiModel) {
      throw new Error('Mistral API key not configured');
    }

    return streamText({
      model: this.aiModel,
      system: params.system,
      messages: params.messages,
      tools: params.tools,
      stopWhen: params.stopWhen ?? stepCountIs(3),
      onStepFinish: params.onStepFinish,
    });
  }
}
