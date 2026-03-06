import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { UploadModule } from './upload/upload.module';
import { TransactionsModule } from './transactions/transactions.module';
import { MistralModule } from './mistral/mistral.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { Statement } from './upload/entities/statement.entity';
import { Transaction } from './transactions/entities/transaction.entity';
import { Embedding } from './embeddings/entities/embedding.entity';
import { migrations } from './db/migrations';

const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL !== 'fake';

@Module({
  imports: [
    HealthModule,
    MistralModule,
    ...(hasDatabase
      ? [
          TypeOrmModule.forRoot({
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [Statement, Transaction, Embedding],
            migrations,
            migrationsRun: true,
            synchronize: false,
            logging: process.env.NODE_ENV === 'development',
          }),
          UploadModule,
          TransactionsModule,
          EmbeddingsModule,
        ]
      : []),
  ],
  controllers: [AppController],
})
export class AppModule {}
