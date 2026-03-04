# Data Pipeline Workflow

**Purpose**: Structured workflow for multi-stage data transformation, ingestion, and ETL pipelines with validation at every boundary.

**Duration**: 2-6 hours (depending on pipeline complexity)

**Agents**: Architect → Developer → QA

---

## When to Use

- Building an ingest pipeline (file upload → parse → transform → store)
- Multi-stage data transformation with intermediate validation
- ETL/ELT workflows where data flows through discrete stages
- Pipelines involving external services (AI APIs, third-party parsers)

---

## Pipeline Anatomy

```
Input
  │  Validate format, size, type
  ▼
Stage 1: Extraction
  │  Parse raw input into structured data
  │  Validate: schema check
  ▼
Stage 2: Transformation
  │  Enrich, categorize, normalize
  │  Validate: business rules
  ▼
Stage 3: Loading
  │  Persist to database, index, cache
  │  Validate: data integrity
  ▼
Stage 4: Post-Processing (optional)
  │  Embeddings, analytics, notifications
  │  Validate: output quality
  ▼
Output
     Verification and completeness check
```

---

## Phase 1: Pipeline Design (Architect)

**Duration**: 30-60 minutes

**Objective**: Define stages, data contracts between stages, error handling strategy.

### Tasks

- [ ] Map input sources and expected formats
- [ ] Define pipeline stages with clear boundaries
- [ ] Specify data contract between each stage (input → output types)
- [ ] Design error handling: retry, skip, dead-letter, abort
- [ ] Identify idempotency requirements
- [ ] Plan for partial failure recovery
- [ ] Define validation checks at each stage boundary
- [ ] Document external service dependencies and fallbacks

### Outputs

**Pipeline Design Document**:

```markdown
# Pipeline: [Name]

## Overview
[What this pipeline does, end to end]

## Stages

### Stage 1: [Name]
- **Input**: [Type/format]
- **Output**: [Type/format]
- **Validation**: [What's checked at exit]
- **Error handling**: [retry N times / skip / abort]

### Stage 2: [Name]
- **Input**: [Output from Stage 1]
- **Output**: [Type/format]
- **Validation**: [What's checked at exit]
- **Error handling**: [strategy]

[Continue for each stage]

## Data Contracts
Stage 1 → Stage 2: [TypeScript interface or schema]
Stage 2 → Stage 3: [TypeScript interface or schema]

## Error Strategy
- **Transient failures** (network, timeout): Retry with backoff (3 attempts)
- **Validation failures** (bad data): Log, skip record, continue pipeline
- **Fatal failures** (schema mismatch): Abort pipeline, return partial results

## Idempotency
- [How re-running the pipeline is safe]
- [Deduplication strategy: hash, unique constraints, upsert]
```

---

## Phase 2: Implementation (Developer)

**Duration**: 2-4 hours

**Objective**: Implement pipeline stages with contracts, validation, and error handling.

### Implementation Principles

1. **Each stage is a function**: Clear input → output, testable in isolation
2. **Validate at boundaries**: Check data shape between every stage
3. **Fail fast on schema errors**: Don't propagate bad data
4. **Log at every stage**: Structured logging for debugging
5. **Make it idempotent**: Same input → same output, safe to re-run

### Tasks

- [ ] Implement Stage 1 with input validation
- [ ] Write unit tests for Stage 1 (happy path + malformed input)
- [ ] Implement Stage 2 with inter-stage validation
- [ ] Write unit tests for Stage 2
- [ ] Continue for each stage
- [ ] Implement pipeline orchestrator (chains stages)
- [ ] Add structured logging at each stage
- [ ] Implement error handling (retry, skip, abort)
- [ ] Write integration test for full pipeline
- [ ] Test idempotency (run pipeline twice with same input)

### Stage Implementation Pattern

```typescript
// Each stage follows this pattern:

interface StageResult<T> {
  data: T;
  warnings: string[];
  metadata: { duration_ms: number; records_processed: number };
}

async function stageN(input: StageNInput): Promise<StageResult<StageNOutput>> {
  // 1. Validate input
  // 2. Transform
  // 3. Validate output
  // 4. Return with metadata
}
```

### Pipeline Orchestrator Pattern

```typescript
// Orchestrator chains stages with validation gates

async function runPipeline(rawInput: RawInput): Promise<PipelineResult> {
  const stage1 = await extract(rawInput);
  validateContract(stage1.data, Stage1Schema);

  const stage2 = await transform(stage1.data);
  validateContract(stage2.data, Stage2Schema);

  const stage3 = await load(stage2.data);
  validateContract(stage3.data, Stage3Schema);

  return { stages: [stage1, stage2, stage3], success: true };
}
```

### Code Quality Checklist

- [ ] Each stage is independently testable
- [ ] Data contracts are enforced (runtime validation or types)
- [ ] Error handling covers: transient, validation, and fatal failures
- [ ] Structured logging at each stage entry/exit
- [ ] Idempotent: re-running produces same result
- [ ] No silent data loss (failed records are logged/returned)
- [ ] External service calls have timeouts and retries

---

## Phase 3: Validation (QA)

**Duration**: 1-2 hours

**Objective**: Verify pipeline correctness, error handling, edge cases, and data integrity.

### Test Categories

**Happy Path**:
- [ ] Valid input → all stages complete → correct output
- [ ] Multiple records → all processed correctly
- [ ] Different input formats (if applicable) → all handled

**Edge Cases**:
- [ ] Empty input → graceful handling (no crash, clear error)
- [ ] Single record → works (no off-by-one)
- [ ] Maximum size input → completes within time budget
- [ ] Duplicate input → idempotent (no duplicate records)

**Error Scenarios**:
- [ ] Malformed input → validation catches at Stage 1
- [ ] Invalid data mid-pipeline → handled per error strategy
- [ ] External service timeout → retry logic works
- [ ] External service down → fallback or clear error

**Data Integrity**:
- [ ] No records lost (input count = output count + error count)
- [ ] No records duplicated
- [ ] Data accuracy: spot-check transformed values against source
- [ ] Foreign keys / references are valid

### Validation Report

```markdown
## Pipeline Validation: [Name]

### Test Results
| Test Category | Pass | Fail | Notes |
|---------------|------|------|-------|
| Happy path | X/X | 0 | |
| Edge cases | X/X | 0 | |
| Error handling | X/X | 0 | |
| Data integrity | X/X | 0 | |

### Performance
- Small input (10 records): [X]ms
- Medium input (100 records): [X]ms
- Large input (1000 records): [X]ms

### Data Accuracy
- Records checked: [N]
- Accuracy: [X]%
- Issues found: [List or "None"]
```

---

## Example: Ledger Upload Pipeline

```
User uploads PDF/CSV
  │
  ▼
Stage 1: File Validation
  │  Check: file type, size < 10MB, not empty
  │  Output: { raw_content, file_type, filename }
  ▼
Stage 2: Parsing
  │  PDF → pdf-parse → raw text → bank-specific parser → transactions[]
  │  CSV → csv-parse → rows → bank-specific parser → transactions[]
  │  Check: at least 1 transaction, valid dates, valid amounts
  ▼
Stage 3: Categorization
  │  Mistral AI assigns category to each transaction
  │  Check: every transaction has a category, category is from known set
  │  Fallback: assign "Uncategorized" if AI fails
  ▼
Stage 4: Persistence
  │  Store statement + transactions in PostgreSQL
  │  Check: foreign keys valid, no duplicate statement
  ▼
Stage 5: Embedding
  │  Chunk statement text (~500 tokens)
  │  Generate embeddings via Mistral Embed API
  │  Store in pgvector
  │  Check: embedding dimensions = 1024, chunks stored
  ▼
Complete
  Return: { statement_id, transaction_count, chunk_count }
```

---

## Best Practices

### Design
- **Contracts over comments**: Define TypeScript interfaces between stages
- **Narrow stages**: Each stage does one transformation, not three
- **Explicit error handling**: Every stage has a defined failure mode

### Implementation
- **Test stages in isolation first**: Unit tests per stage before integration
- **Log everything**: Structured logs with stage name, duration, record count
- **Make re-runs safe**: Upserts, dedup keys, or idempotency tokens

### Validation
- **Count everything**: Input records = output records + error records
- **Spot-check accuracy**: Don't just check counts, verify actual values
- **Test the error paths**: Intentionally break stages to verify recovery
