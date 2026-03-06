import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Embedding } from './entities/embedding.entity';
import { ChunkerService } from './chunker.service';
import { EmbeddingsService } from './embeddings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Embedding])],
  providers: [ChunkerService, EmbeddingsService],
  exports: [EmbeddingsService, ChunkerService],
})
export class EmbeddingsModule {}
