import { Injectable } from '@nestjs/common';

export interface Chunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

@Injectable()
export class ChunkerService {
  private readonly TARGET_CHARS = 2000; // ~500 tokens at ~4 chars/token
  private readonly OVERLAP_CHARS = 200; // ~50 tokens overlap

  chunk(text: string): Chunk[] {
    if (!text || text.trim().length === 0) return [];

    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= this.TARGET_CHARS) {
      return [
        {
          content: cleaned,
          chunkIndex: 0,
          tokenCount: this.estimateTokens(cleaned),
        },
      ];
    }

    const chunks: Chunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < cleaned.length) {
      let end = Math.min(start + this.TARGET_CHARS, cleaned.length);

      // Try to break at sentence boundary
      if (end < cleaned.length) {
        const sentenceBreak = this.findSentenceBreak(cleaned, start, end);
        if (sentenceBreak > start) {
          end = sentenceBreak;
        }
      }

      const content = cleaned.slice(start, end).trim();
      if (content.length > 0) {
        chunks.push({
          content,
          chunkIndex,
          tokenCount: this.estimateTokens(content),
        });
        chunkIndex++;
      }

      // Move start forward, accounting for overlap
      const nextStart = end - this.OVERLAP_CHARS;
      start = nextStart > start ? nextStart : end; // prevent going backwards

      if (end >= cleaned.length) break;
    }

    return chunks;
  }

  private findSentenceBreak(
    text: string,
    start: number,
    end: number,
  ): number {
    // Search backwards from end for sentence-ending punctuation
    const searchRegion = text.slice(start, end);
    const lastPeriod = searchRegion.lastIndexOf('. ');
    const lastNewline = searchRegion.lastIndexOf('\n');
    const breakPoint = Math.max(lastPeriod, lastNewline);

    if (breakPoint > 0 && breakPoint > searchRegion.length * 0.5) {
      return start + breakPoint + 1; // +1 to include the period/newline
    }
    return end;
  }

  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }
}
