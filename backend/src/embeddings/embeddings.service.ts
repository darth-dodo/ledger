import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Mistral } from '@mistralai/mistralai';
import { Embedding } from './entities/embedding.entity';
import { ChunkerService } from './chunker.service';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly client: Mistral | null;

  constructor(
    @InjectRepository(Embedding)
    private readonly embeddingRepo: Repository<Embedding>,
    @Inject(ChunkerService)
    private readonly chunkerService: ChunkerService,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      this.logger.warn('MISTRAL_API_KEY not set — embeddings will be disabled');
      this.client = null;
    } else {
      this.client = new Mistral({ apiKey });
    }
  }

  async embedStatement(statementId: string, rawText: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('Skipping embedding — Mistral client not available');
      return;
    }

    if (!rawText || rawText.trim().length === 0) {
      this.logger.warn(`Statement ${statementId} has no text to embed`);
      return;
    }

    // Delete existing embeddings for idempotency
    await this.removeByStatement(statementId);

    // Chunk the text
    const chunks = this.chunkerService.chunk(rawText);
    if (chunks.length === 0) return;

    // Get embeddings from Mistral
    const vectors = await this.getEmbeddings(chunks.map((c) => c.content));
    if (!vectors) return;

    // Persist chunks + embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const embedding = this.embeddingRepo.create({
        statementId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
      });
      const saved = await this.embeddingRepo.save(embedding);

      // Update the vector column via raw SQL (TypeORM cannot handle pgvector type)
      const vector = vectors[i];
      if (vector) {
        const vectorStr = `[${vector.join(',')}]`;
        await this.dataSource.query('UPDATE embeddings SET embedding = $1::vector WHERE id = $2', [
          vectorStr,
          saved.id,
        ]);
      }
    }

    this.logger.log(`Embedded ${chunks.length} chunks for statement ${statementId}`);
  }

  async removeByStatement(statementId: string): Promise<void> {
    await this.embeddingRepo.delete({ statementId });
  }

  async similaritySearch(
    queryVector: number[],
    limit = 5,
  ): Promise<
    Array<{
      id: string;
      content: string;
      statementId: string;
      distance: number;
    }>
  > {
    const vectorStr = `[${queryVector.join(',')}]`;
    const results = await this.dataSource.query(
      `SELECT id, content, statement_id as "statementId",
              embedding <=> $1::vector as distance
       FROM embeddings
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, limit],
    );
    return results;
  }

  async getEmbeddings(texts: string[]): Promise<number[][] | null> {
    if (!this.client || texts.length === 0) return null;

    try {
      const response = await this.client.embeddings.create({
        model: 'mistral-embed',
        inputs: texts,
      });

      return response.data.map((d) => d.embedding as number[]);
    } catch (error) {
      this.logger.error(
        `Embedding failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async getQueryEmbedding(query: string): Promise<number[] | null> {
    const result = await this.getEmbeddings([query]);
    return result?.[0] ?? null;
  }
}
