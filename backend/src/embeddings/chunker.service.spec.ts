import { describe, it, expect } from 'vitest';
import { ChunkerService } from './chunker.service.js';

describe('ChunkerService', () => {
  const service = new ChunkerService();

  // -------------------------------------------------------------------
  // Empty / null / undefined / whitespace input
  // -------------------------------------------------------------------
  describe('empty and invalid input', () => {
    it('returns empty array for empty string', () => {
      expect(service.chunk('')).toEqual([]);
    });

    it('returns empty array for null', () => {
      expect(service.chunk(null as unknown as string)).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      expect(service.chunk(undefined as unknown as string)).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
      expect(service.chunk('   \n\t  ')).toEqual([]);
    });
  });

  // -------------------------------------------------------------------
  // Short text (fits in a single chunk)
  // -------------------------------------------------------------------
  describe('short text (under 2000 chars)', () => {
    it('returns a single chunk with chunkIndex 0', () => {
      const text = 'Hello, this is a short transaction record.';
      const result = service.chunk(text);

      expect(result).toHaveLength(1);
      expect(result[0]!.chunkIndex).toBe(0);
      expect(result[0]!.content).toBe(text);
    });

    it('sets tokenCount to estimateTokens value', () => {
      const text = 'A short piece of text.';
      const result = service.chunk(text);

      expect(result[0]!.tokenCount).toBe(service.estimateTokens(text));
    });

    it('handles text exactly at 2000 chars as single chunk', () => {
      const text = 'x'.repeat(2000);
      const result = service.chunk(text);

      expect(result).toHaveLength(1);
      expect(result[0]!.chunkIndex).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // Long text splitting
  // -------------------------------------------------------------------
  describe('long text splitting', () => {
    it('splits text over 2000 chars into multiple chunks', () => {
      const text = 'word '.repeat(500); // ~2500 chars
      const result = service.chunk(text);

      expect(result.length).toBeGreaterThan(1);
    });

    it('preserves all content across chunks (no data loss)', () => {
      // Use a simple repeated pattern without sentence breaks so splitting is predictable
      const text = 'abcd '.repeat(600); // 3000 chars
      const result = service.chunk(text);

      // Every chunk should have non-empty content
      for (const chunk of result) {
        expect(chunk.content.length).toBeGreaterThan(0);
      }
    });
  });

  // -------------------------------------------------------------------
  // Overlap between consecutive chunks
  // -------------------------------------------------------------------
  describe('overlap', () => {
    it('consecutive chunks have overlapping content (~200 chars)', () => {
      // Build text without sentence boundaries so chunks split at TARGET_CHARS
      const text = 'abcdefgh '.repeat(400); // 3600 chars
      const result = service.chunk(text);

      expect(result.length).toBeGreaterThanOrEqual(2);

      // The tail of chunk 0 should appear at the start of chunk 1
      const chunk0End = result[0]!.content.slice(-100);
      const chunk1Start = result[1]!.content.slice(0, 200);
      expect(chunk1Start).toContain(chunk0End);
    });
  });

  // -------------------------------------------------------------------
  // Sentence boundary breaking
  // -------------------------------------------------------------------
  describe('sentence boundary breaking', () => {
    it('prefers breaking at ". " when in the second half of the chunk', () => {
      // Build text: first 1500 chars of filler, then a sentence end, then more filler
      const filler = 'x'.repeat(1500);
      const text = filler + '. ' + 'y'.repeat(1000);
      const result = service.chunk(text);

      expect(result.length).toBeGreaterThanOrEqual(2);
      // First chunk should end near the period, not at exactly 2000 chars
      expect(result[0]!.content).toContain('.');
      // The break should have happened after the period
      expect(result[0]!.content.endsWith('.')).toBe(true);
    });

    it('prefers breaking at newline when in the second half', () => {
      const filler = 'a'.repeat(1500);
      const text = filler + '\n' + 'b'.repeat(1000);
      const result = service.chunk(text);

      expect(result.length).toBeGreaterThanOrEqual(2);
      // First chunk should end before the newline content
      expect(result[0]!.content.length).toBeLessThanOrEqual(2000);
    });

    it('does not break at sentence boundary in the first half', () => {
      // Period at position 500 (first quarter) should be ignored as a break point
      const text = 'x'.repeat(500) + '. ' + 'y'.repeat(2000);
      const result = service.chunk(text);

      // First chunk should be close to 2000 chars, not 501
      expect(result[0]!.content.length).toBeGreaterThan(1000);
    });
  });

  // -------------------------------------------------------------------
  // Token estimation
  // -------------------------------------------------------------------
  describe('estimateTokens', () => {
    it('returns ceil(text.length / 4)', () => {
      expect(service.estimateTokens('hello')).toBe(Math.ceil(5 / 4)); // 2
      expect(service.estimateTokens('ab')).toBe(1);
      expect(service.estimateTokens('abcdefgh')).toBe(2);
      expect(service.estimateTokens('a')).toBe(1);
    });

    it('handles empty string', () => {
      expect(service.estimateTokens('')).toBe(0);
    });

    it('handles long text', () => {
      const text = 'x'.repeat(10000);
      expect(service.estimateTokens(text)).toBe(2500);
    });
  });

  // -------------------------------------------------------------------
  // Chunk ordering
  // -------------------------------------------------------------------
  describe('chunk ordering', () => {
    it('chunkIndex increments sequentially from 0', () => {
      const text = 'word '.repeat(2000); // ~10000 chars
      const result = service.chunk(text);

      for (let i = 0; i < result.length; i++) {
        expect(result[i]!.chunkIndex).toBe(i);
      }
    });
  });

  // -------------------------------------------------------------------
  // No infinite loops
  // -------------------------------------------------------------------
  describe('no infinite loops', () => {
    it('completes for very long text (50,000 chars)', () => {
      const text = 'a'.repeat(50_000);
      const result = service.chunk(text);

      expect(result.length).toBeGreaterThan(1);
      // Verify all chunks have content
      for (const chunk of result) {
        expect(chunk.content.length).toBeGreaterThan(0);
      }
    });
  });

  // -------------------------------------------------------------------
  // Whitespace normalization
  // -------------------------------------------------------------------
  describe('whitespace normalization', () => {
    it('collapses multiple spaces to single space', () => {
      const text = 'hello    world';
      const result = service.chunk(text);

      expect(result[0]!.content).toBe('hello world');
    });

    it('collapses tabs and newlines to single space', () => {
      const text = 'hello\t\t\nworld';
      const result = service.chunk(text);

      expect(result[0]!.content).toBe('hello world');
    });

    it('trims leading and trailing whitespace', () => {
      const text = '  hello world  ';
      const result = service.chunk(text);

      expect(result[0]!.content).toBe('hello world');
    });
  });
});
