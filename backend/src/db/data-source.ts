/**
 * TypeORM DataSource for CLI migrations.
 *
 * Usage:
 *   pnpm migration:generate src/db/migrations/MigrationName
 *   pnpm migration:run
 *   pnpm migration:revert
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Statement } from '../upload/entities/statement.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Embedding } from '../embeddings/entities/embedding.entity';
import { migrations } from './migrations';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Statement, Transaction, Embedding],
  migrations,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
