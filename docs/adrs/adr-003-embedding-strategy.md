# ADR-003: Embedding Strategy for RAG

**Status**: Accepted (amended 2026-03-06 — switched to TypeORM migrations)
**Date**: 2026-03-06
**Milestone**: M4 — Chunk & Embed

---

## Context

Ledger needs to support RAG (Retrieval Augmented Generation) chat in M5. To enable similarity search over bank statement content, uploaded statement text needs to be chunked into smaller segments, embedded as vectors, and stored for retrieval.

Key constraints:

- The Statement entity already has `rawText` populated by parsers in M3
- Mistral AI SDK (`@mistralai/mistralai`) is already a project dependency for transaction categorization
- The Docker setup already uses `pgvector/pgvector:pg16`, so pgvector is available
- Embeddings must be deletable per-statement to support the existing delete-and-reparse idempotency pattern
- Embedding failures should not block the upload flow (same graceful degradation pattern as categorization)

---

## Decisions

### 1. Chunking Strategy: ~500 Token Character-Based Chunks

**Choice**: Character-based chunking targeting ~500 tokens (~2000 characters) with configurable overlap (default 200 characters / ~50 tokens).

**Splitting rules**:

- Split on paragraph boundaries (`\n\n`) when possible
- Fall back to sentence boundaries (`. `) when paragraphs are too large
- Fall back to character split at the target size as a last resort
- Each chunk stores: content text, `statementId` FK, `chunkIndex` (ordering), token count estimate

**Why ~500 tokens**: Small enough for precise retrieval, large enough to preserve context. Financial text is information-dense — a 500-token chunk typically covers a meaningful cluster of transactions or a section of statement metadata.

**Token estimation**: Use a simple `Math.ceil(text.length / 4)` heuristic rather than importing a tokenizer. This is accurate enough for chunking decisions.

**Alternative considered**:

- **Token-based chunking**: Requires a tokenizer dependency (e.g., `tiktoken` or Mistral's tokenizer). Adds complexity and a new dependency for minimal benefit with financial text, which has relatively uniform token density.

### 2. Embedding Model: Mistral Embed (mistral-embed)

**Choice**: Use Mistral's `mistral-embed` model for generating embeddings.

- 1024-dimensional vectors
- Reuses the existing `@mistralai/mistralai` SDK already in the project (via `MistralModule`)
- Batch embedding support — multiple chunks can be embedded in a single API call
- Graceful degradation if `MISTRAL_API_KEY` is missing: skip embedding silently, same pattern as `MistralService.categorize()`

**Alternative considered**:

- **OpenAI text-embedding-3-small**: Strong model, but would add another SDK dependency (`openai`) and a second API key requirement. Not justified when Mistral is already integrated and performs well for this use case.

### 3. pgvector Storage with IVFFlat Index

**Choice**: Store embeddings in an `embeddings` table with a `vector(1024)` column, using the pgvector extension and an IVFFlat index for cosine similarity search.

- **Extension**: pgvector is already available via the `pgvector/pgvector:pg16` Docker image
- **Index type**: IVFFlat with `lists = 100` (default, appropriate for <100K rows)
- **Distance metric**: Cosine similarity via the `<=>` operator
- **Extension creation**: Enable via TypeORM migration (`CREATE EXTENSION IF NOT EXISTS vector`)

**Why IVFFlat over HNSW**:

- Lower memory usage — HNSW builds an in-memory graph that grows with dataset size
- Simpler to maintain at this scale — IVFFlat works well for datasets under 1M rows
- Can migrate to HNSW later if the dataset grows beyond 1M rows and query latency becomes an issue

**Alternative considered**:

- **HNSW index**: Better recall and faster queries at large scale, but higher memory usage and longer index build times. Over-engineered for the expected dataset size (thousands of statements, not millions).

### 4. Embedding Entity Schema

**Choice**: A flat `embeddings` table with a foreign key to `statements`.

```
embeddings table:
- id: UUID (PK)
- statement_id: UUID (FK -> statements, CASCADE delete)
- chunk_index: int (ordering within statement)
- content: text (the chunk text)
- token_count: int (estimated tokens)
- embedding: vector(1024) (Mistral embedding)
- created_at: timestamptz
```

**Key design decisions**:

- **CASCADE delete on `statement_id`**: When a statement is deleted or re-uploaded, all its embeddings are automatically cleaned up. Consistent with the transactions table pattern.
- **`chunk_index` for ordering**: Preserves the original order of chunks within a statement, useful for reassembling context during RAG retrieval.
- **`content` stored alongside embedding**: Avoids a second lookup when returning search results. The text duplication is minimal — chunks are ~2000 characters each.
- **`token_count` stored**: Useful for M5 RAG context window budgeting without re-estimating at query time.

### 5. Schema Management: TypeORM Migrations (not synchronize)

**Choice**: Use TypeORM migrations with `migrationsRun: true` instead of `synchronize: true`.

**Problem discovered**: TypeORM's `synchronize: true` has a known bug ([typeorm#10056](https://github.com/typeorm/typeorm/issues/10056)) where its schema diff algorithm cannot properly compare `vector(N)` column types. On every server restart, it treats the vector column as "changed" and drops/recreates it — destroying all embedding data.

**Solution**:

- `synchronize: false` + `migrationsRun: true` in TypeORM config
- Entity declares `@Column('vector', { length: 1024 })` using TypeORM 0.3.27+ native support
- Initial migration creates all tables including the `vector(1024)` column and IVFFlat index via explicit SQL
- `data-source.ts` exports the DataSource for CLI migration commands
- Migration classes are imported explicitly (no glob patterns) for tsx compatibility

**Migration infrastructure**:

- `pnpm migrate` — run pending migrations
- `pnpm migration:run` — run via TypeORM CLI
- `pnpm migration:revert` — revert last migration
- `make db-migrate` / `make db-migrate-revert` — Makefile shortcuts

**Why not synchronize + onModuleInit workaround**: The initial approach used `synchronize: true` with an `onModuleInit` hook that ALTERed the column type from `text` to `vector(1024)` after TypeORM finished syncing. This was fragile: race conditions with tsx watch restarts, silent failures, and the fundamental design flaw of fighting TypeORM's schema manager. Migrations are the production-standard approach.

### 6. NestJS Module Structure

**Choice**: A dedicated `EmbeddingsModule` with two services.

```
backend/src/embeddings/
├── embeddings.module.ts
├── chunker.service.ts
├── embeddings.service.ts
└── entities/
    └── embedding.entity.ts
```

- **`EmbeddingsModule`**: Imports `MistralModule` (to reuse the Mistral client for embedding calls) and `TypeOrmModule.forFeature([Embedding])`
- **`ChunkerService`**: Pure logic, no external dependencies. Takes raw text and returns chunks with metadata. Easy to unit test without mocks.
- **`EmbeddingsService`**: Orchestrates the pipeline: chunking (via `ChunkerService`) -> embedding (via `MistralService`) -> storage (via TypeORM repository). Exposes `embedStatement(statementId)` and `searchSimilar(queryVector, limit)` methods.

**Rationale**: Separating chunking from embedding keeps each service focused and independently testable. `ChunkerService` is a pure function wrapper; `EmbeddingsService` handles I/O and orchestration.

### 7. Integration with Upload Pipeline

**Choice**: Extend the existing upload flow to include embedding as a final step.

The upload pipeline becomes: **store file -> parse -> categorize -> persist transactions -> chunk rawText -> embed chunks -> persist embeddings**.

**Idempotency**: On re-upload, delete existing embeddings for the statement (via CASCADE or explicit delete) and re-embed. Same delete-and-recreate pattern used for transactions in ADR-002.

**Error handling**: Chunking and embedding failures should not block the upload. If the Mistral embed API is unavailable or the API key is missing, the upload succeeds without embeddings. Embeddings can be backfilled later. This follows the same graceful degradation pattern established for Mistral categorization.

**Alternative considered**:

- **Separate embedding endpoint**: Would require the user or a background job to trigger embedding independently. Worse UX and more moving parts for no clear benefit at this scale.

### 8. Cosine Similarity Search

**Choice**: Use pgvector's cosine distance operator for retrieval queries.

```sql
SELECT id, statement_id, chunk_index, content, token_count,
       embedding <=> $1 AS distance
FROM embeddings
ORDER BY embedding <=> $1
LIMIT 5;
```

- The `<=>` operator computes cosine distance (1 - cosine similarity)
- Lower distance = more similar
- Default limit of 5 chunks provides enough context for RAG without overwhelming the LLM context window
- The IVFFlat index accelerates this query by narrowing the search to relevant clusters

**Usage**: This query will be consumed by the M5 RAG module. The query embedding is generated by calling `mistral-embed` on the user's chat question, then passed as `$1` to retrieve the most relevant statement chunks.

---

## Consequences

**Positive**:

- Reuses existing Mistral SDK — no new dependencies for embedding
- pgvector is already available in the Docker image — no infrastructure changes
- Follows established patterns: CASCADE deletes, graceful degradation, synchronous pipeline
- `ChunkerService` is pure logic and trivially testable
- Storing `content` alongside embeddings avoids joins during retrieval
- IVFFlat index provides fast similarity search with low memory overhead

**Negative**:

- IVFFlat needs periodic `REINDEX` after large data changes (bulk uploads may degrade index quality until reindexed)
- Character-based chunking is approximate — actual token counts may vary by ~10-20% from estimates
- Storing `content` in the embeddings table duplicates text from `rawText` on the statement (acceptable trade-off for query simplicity)

**Risks**:

- Mistral embed API rate limits could slow bulk uploads with many chunks. Mitigation: batch multiple chunks per API call and add retry logic with backoff.
- Embedding dimensions are fixed at 1024 — switching to a different model later requires re-embedding all data. Mitigation: the delete-and-recreate pattern makes re-embedding straightforward.
- IVFFlat index quality degrades if data distribution changes significantly. Mitigation: schedule periodic `REINDEX` or switch to HNSW if scale demands it.

---

## References

- [docs/architecture.md](../architecture.md) — System architecture overview
- [docs/milestones/m3-parse-persist.md](../milestones/m3-parse-persist.md) — M3 Parse & Persist design (rawText population)
- [docs/adrs/adr-002-parser-strategy.md](adr-002-parser-strategy.md) — Parser strategy pattern and idempotency decisions
