import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1709700000000 implements MigrationInterface {
  name = 'InitialSchema1709700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Statements table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "statements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "filename" varchar(255) NOT NULL,
        "file_type" varchar(10) NOT NULL,
        "file_path" varchar(500) NOT NULL,
        "file_size" int NOT NULL,
        "raw_text" text,
        "uploaded_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_statements" PRIMARY KEY ("id")
      )
    `);

    // Transactions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "statement_id" uuid NOT NULL,
        "date" date NOT NULL,
        "description" varchar(500) NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "type" varchar(10) NOT NULL,
        "category" varchar(100),
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_statement" FOREIGN KEY ("statement_id")
          REFERENCES "statements"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_transactions_statement_id"
        ON "transactions" ("statement_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_transactions_date"
        ON "transactions" ("date")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_transactions_category"
        ON "transactions" ("category")
    `);

    // Embeddings table with pgvector column
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "embeddings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "statement_id" uuid NOT NULL,
        "chunk_index" int NOT NULL,
        "content" text NOT NULL,
        "token_count" int NOT NULL,
        "embedding" vector(1024),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_embeddings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_embeddings_statement" FOREIGN KEY ("statement_id")
          REFERENCES "statements"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_embeddings_statement_id"
        ON "embeddings" ("statement_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_embeddings_vector"
        ON "embeddings" USING ivfflat ("embedding" vector_cosine_ops)
        WITH (lists = 100)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "embeddings"');
    await queryRunner.query('DROP TABLE IF EXISTS "transactions"');
    await queryRunner.query('DROP TABLE IF EXISTS "statements"');
    await queryRunner.query('DROP EXTENSION IF EXISTS vector');
  }
}
