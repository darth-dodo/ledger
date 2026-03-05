import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { UploadModule } from './upload/upload.module';
import { TransactionsModule } from './transactions/transactions.module';
import { MistralModule } from './mistral/mistral.module';
import { Statement } from './upload/entities/statement.entity';
import { Transaction } from './transactions/entities/transaction.entity';

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
            entities: [Statement, Transaction],
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV === 'development',
          }),
          UploadModule,
          TransactionsModule,
        ]
      : []),
  ],
  controllers: [AppController],
})
export class AppModule {}
