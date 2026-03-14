import { Injectable, Logger } from '@nestjs/common';
import { Mistral } from '@mistralai/mistralai';
import { createMistral } from '@ai-sdk/mistral';
import {
  streamText,
  generateObject,
  stepCountIs,
  type ModelMessage,
  type ToolSet,
  type StopCondition,
} from 'ai';
import { z } from 'zod';
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
      const response = await this.client!.chat.complete({
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
    stopWhen?: StopCondition<ToolSet> | StopCondition<ToolSet>[];
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

  async decomposeQuery(
    message: string,
  ): Promise<
    Array<{ query: string; intent: 'sql_aggregate' | 'sql_filter' | 'vector_search' | 'hybrid' }>
  > {
    if (!this.aiModel) {
      return [{ query: message, intent: 'hybrid' }];
    }

    const DECOMPOSE_SYSTEM = `You are a query decomposition assistant for a financial transaction analysis system.
Decompose the user's question into independent sub-queries. For each sub-query, classify the intent:
- sql_aggregate: requires SUM, COUNT, AVG (e.g. "total spend on X", "how many times", "average amount")
- sql_filter: requires filtering/listing transactions (e.g. "find transactions at X", "show charges from Y")
- vector_search: semantic/contextual search (e.g. "anything related to X", "charges that look like Y", merchant names)
- hybrid: needs both SQL aggregation and semantic search
If the query is simple and doesn't need decomposition, return it as a single sub-query.`;

    try {
      const { object } = await generateObject({
        model: this.aiModel,
        system: DECOMPOSE_SYSTEM,
        prompt: message,
        schema: z.object({
          subQueries: z.array(
            z.object({
              query: z.string(),
              intent: z.enum(['sql_aggregate', 'sql_filter', 'vector_search', 'hybrid']),
            }),
          ),
        }),
      });
      return object.subQueries;
    } catch (err) {
      this.logger.warn(
        `Query decomposition failed, falling back to hybrid: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [{ query: message, intent: 'hybrid' }];
    }
  }
}
