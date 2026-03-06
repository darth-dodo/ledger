# Ledger — Architecture Document

---

## 1. System Overview

```mermaid
graph TB
    subgraph Frontend ["Angular Frontend :4200"]
        UP[Upload Module]
        DASH[Dashboard]
        CHAT[Chat Interface]
        TX[Transactions View]
        SET[Settings]
    end

    subgraph Backend ["NestJS Backend :3000"]
        UC[Upload Controller]
        TC[Transactions Controller]
        AC[Analytics Controller]
        RC[RAG Controller]

        US[Upload Service]
        PS[Parser Service]
        CS[Chunker Service]
        ES[Embedding Service]
        RS[RAG Service]
        AS[Analytics Service]
        MS[Mistral Service]
    end

    subgraph Data ["PostgreSQL + pgvector"]
        ST[(statements)]
        TT[(transactions)]
        EM[(embeddings)]
        CSS[(chat_sessions)]
        CM[(chat_messages)]
    end

    subgraph External ["Mistral AI"]
        ME[Embed API]
        MC[Chat API]
    end

    UP -->|HTTP POST /upload| UC
    TX -->|HTTP GET /transactions| TC
    DASH -->|HTTP GET /analytics/*| AC
    CHAT -->|HTTP POST /chat| RC

    UC --> US --> PS --> CS --> ES
    ES --> MS --> ME
    RS --> MS --> MC
    RS --> ES

    US --> ST
    US --> TT
    ES --> EM
    RS --> CSS
    RS --> CM
    AS --> TT

    style Frontend fill:#e8f4f8
    style Backend fill:#fff3cd
    style Data fill:#d4edda
    style External fill:#f8d7da
```

---

## 2. Data Flow — Upload & Ingest Pipeline

```mermaid
flowchart TD
    A[User uploads PDF/CSV] --> B{Detect file type}

    B -->|PDF| C[PDF Parser<br/><i>pdf-parse</i>]
    B -->|CSV| D[CSV Parser<br/><i>csv-parse</i>]

    C --> E[Bank-Specific Strategy<br/><i>Detect bank format automatically</i>]
    D --> E

    E --> F[Extract Transactions<br/><i>date, description, amount, type</i>]

    F --> G[AI Category Assignment<br/><i>Mistral classifies each transaction</i>]

    G --> H[Store in PostgreSQL<br/><i>statements + transactions tables</i>]

    F --> I[Chunk Statement Text<br/><i>~500 tokens with overlap</i>]

    I --> J[Generate Embeddings<br/><i>Mistral Embed API → 1024-dim vectors</i>]

    J --> K[Store in pgvector<br/><i>embeddings table</i>]

    H --> L[Done]
    K --> L

    style A fill:#e8f4f8
    style L fill:#d4edda
    style E fill:#fff3cd
```

---

## 3. Data Flow — RAG Chat Pipeline

```mermaid
sequenceDiagram
    participant User
    participant Angular
    participant NestJS
    participant Mistral as Mistral AI (Vercel AI SDK)
    participant pgvector as PostgreSQL + pgvector

    User->>Angular: Types question
    Angular->>NestJS: POST /chat { sessionId?, message, currency }

    rect rgb(255, 243, 205)
        Note over NestJS: 1. Session + message persistence
        NestJS->>pgvector: Create/load ChatSession
        NestJS->>pgvector: Save user ChatMessage
        NestJS->>pgvector: Load conversation history (last 10)
    end

    rect rgb(248, 215, 218)
        Note over NestJS,Mistral: 2. Streaming tool-calling loop
        NestJS->>Mistral: streamText() with tools + history (SSE)
        loop Up to 3 tool-calling steps
            Mistral-->>NestJS: Tool call (vector_search or sql_query)
            alt vector_search
                NestJS->>Mistral: Embed query → 1024-dim vector
                Mistral-->>NestJS: Query vector
                NestJS->>pgvector: Cosine search (top 5 chunks)
                pgvector-->>NestJS: Relevant chunks
            else sql_query
                NestJS->>NestJS: Validate SQL (SELECT-only, transactions table)
                NestJS->>pgvector: Execute read-only query (LIMIT 100)
                pgvector-->>NestJS: Query results
            end
            NestJS->>Mistral: Tool result
        end
        Mistral-->>NestJS: Final text response (streamed)
    end

    NestJS-->>Angular: SSE stream (UI message stream format)
    Angular-->>User: Render markdown + streaming tokens

    rect rgb(212, 237, 218)
        Note over NestJS,pgvector: 3. Background persistence
        NestJS->>pgvector: Save assistant ChatMessage
        NestJS->>pgvector: Auto-title session (first message)
    end
```

The RAG pipeline uses a **tool-calling loop** via Vercel AI SDK's `streamText()` with `stopWhen: stepCountIs(3)`. The LLM autonomously decides which tools to invoke based on the question -- `vector_search` for contextual lookups, `sql_query` for calculations and aggregations. Responses stream to the frontend as SSE in the AI SDK v6 UI message stream format.

### RAG System Prompt

The system prompt is built dynamically with the user's selected currency. It provides:
- Tool descriptions and when to use each one
- Full `transactions` table schema for SQL generation
- Example SQL queries (PostgreSQL syntax) for common financial questions
- Currency formatting instructions

```
SYSTEM:
You are a helpful financial assistant analyzing the user's bank statements
and transactions.

You have access to two tools:
- vector_search: Search through bank statement text chunks using semantic
  similarity. Best for contextual questions.
- sql_query: Query the PostgreSQL transactions database directly with SQL.
  Best for calculations and aggregations.

The transactions table schema (PostgreSQL):
  id, statement_id, date, description, amount, category, type

The user's preferred currency is {currency}. Format all monetary amounts
using {currency}.
```

---

## 4. Database Schema

```mermaid
erDiagram
    statements {
        uuid id PK
        varchar filename
        varchar file_type "pdf | csv"
        varchar file_path "UUID filename on disk"
        int file_size "bytes"
        text raw_text "nullable, populated by M3"
        timestamptz uploaded_at
    }

    transactions {
        uuid id PK
        uuid statement_id FK
        date date
        varchar description
        decimal amount "12,2"
        varchar category "AI-assigned"
        varchar type "debit | credit"
    }

    embeddings {
        uuid id PK
        uuid statement_id FK
        int chunk_index
        text content "chunk text"
        int token_count
        vector embedding "1024-dim, nullable"
        timestamptz created_at
    }

    chat_sessions {
        uuid id PK
        varchar title "nullable, auto-generated"
        timestamptz created_at
        timestamptz updated_at
    }

    chat_messages {
        uuid id PK
        uuid session_id FK
        varchar role "user | assistant"
        text content
        jsonb sources "nullable, chunk references"
        timestamptz created_at
    }

    statements ||--o{ transactions : "has many"
    statements ||--o{ embeddings : "has many"
    chat_sessions ||--o{ chat_messages : "has many (CASCADE delete)"
```

### Key Indexes

```sql
-- Vector similarity search (IVFFlat for approximate nearest neighbor)
CREATE INDEX ON embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Transaction queries
CREATE INDEX ON transactions (date);
CREATE INDEX ON transactions (category);
CREATE INDEX ON transactions (statement_id);

-- Chat message lookup by session
CREATE INDEX ON chat_messages (session_id);
```

---

## 5. NestJS Backend Structure

```mermaid
graph TD
    subgraph AppModule
        subgraph UploadModule
            UC2[UploadController]
            US2[UploadService]
            PDF[PdfParser]
            CSV[CsvParser]
        end

        subgraph TransactionsModule
            TC2[TransactionsController]
            TS2[TransactionsService]
            TE[Transaction Entity]
        end

        subgraph EmbeddingsModule
            ES2[EmbeddingsService]
            CHK[ChunkerService]
            EE[Embedding Entity]
        end

        subgraph RagModule ["RagModule ✅ M5"]
            RC2[RagController]
            RS2[RagService]
            CSE[ChatSession Entity]
            CME[ChatMessage Entity]
            VST[vector_search Tool]
            SQT[sql_query Tool]
        end

        subgraph AnalyticsModule ["AnalyticsModule 🚧 M6"]
            AC2[AnalyticsController]
            AS2[AnalyticsService]
        end

        subgraph MistralModule
            MS2[MistralService]
        end

        DB["db/ (migrations + data-source)"]
    end

    style UploadModule fill:#e8f4f8
    style TransactionsModule fill:#d4edda
    style EmbeddingsModule fill:#fff3cd
    style RagModule fill:#f8d7da
    style AnalyticsModule fill:#e2d9f3
    style MistralModule fill:#fce4ec
```

### Directory Layout

```
backend/
├── src/
│   ├── app.module.ts              # Conditional TypeORM + module registration
│   ├── app.controller.ts          # Root controller
│   ├── main.ts                    # Bootstrap with graceful shutdown
│   ├── config.ts                  # Typed env config loader
│   ├── logger.ts                  # Structured JSON logger
│   ├── health/                    # ✅ M1
│   │   ├── health.module.ts
│   │   └── health.controller.ts
│   ├── upload/                    # ✅ M2
│   │   ├── upload.module.ts
│   │   ├── upload.controller.ts
│   │   ├── upload.service.ts
│   │   ├── entities/
│   │   │   └── statement.entity.ts
│   │   ├── dto/
│   │   │   └── upload-response.dto.ts
│   │   └── parsers/               # ✅ M3
│   │       ├── parser.interface.ts
│   │       ├── pdf.parser.ts
│   │       └── csv.parser.ts
│   ├── transactions/              # ✅ M3
│   │   ├── transactions.module.ts
│   │   ├── transactions.controller.ts
│   │   ├── transactions.service.ts
│   │   └── entities/
│   │       └── transaction.entity.ts
│   ├── embeddings/                # ✅ M4
│   │   ├── embeddings.module.ts
│   │   ├── embeddings.service.ts
│   │   ├── chunker.service.ts
│   │   └── entities/
│   │       └── embedding.entity.ts
│   ├── mistral/                   # ✅ M3
│   │   ├── mistral.module.ts
│   │   └── mistral.service.ts
│   ├── db/                        # ✅ M4
│   │   ├── data-source.ts
│   │   ├── migrate.ts
│   │   └── migrations/
│   │       ├── index.ts
│   │       ├── 1709700000000-InitialSchema.ts
│   │       └── 1709700000001-AddChatTables.ts
│   ├── rag/                       # ✅ M5
│   │   ├── rag.module.ts
│   │   ├── rag.controller.ts      #   POST /chat (SSE), GET sessions, DELETE session
│   │   ├── rag.service.ts         #   Session mgmt, message persistence, tool-calling loop
│   │   ├── entities/
│   │   │   ├── chat-session.entity.ts
│   │   │   └── chat-message.entity.ts
│   │   └── tools/
│   │       ├── vector-search.tool.ts  # Semantic search via embeddings
│   │       └── sql-query.tool.ts      # Read-only SELECT with safety validation
│   ├── analytics/                 # 🚧 M6 (planned)
│   └── common/                    # 🚧 M7 (planned)
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## 6. Angular Frontend Structure

### Component Architecture

```mermaid
graph TD
    subgraph AppComponent
        NAV[Navigation Bar]

        subgraph UploadPage ["/upload"]
            DZ[FileDropzone]
            SL[StatementsList]
        end

        subgraph TransactionsPage ["/transactions"]
            TF[TransactionFilters]
            TT2[TransactionsTable]
        end

        subgraph ChatPage ["/chat"]
            SB[Session Sidebar]
            MA[Message Area]
            MI[MessageInput]
            MD[MarkdownPipe]
        end

        subgraph SettingsPage ["/settings"]
            CS[CurrencySelector]
        end

        subgraph DashboardPage ["/dashboard"]
            STAT[StatCards]
            CAT[CategoryBreakdown]
            MTR[MonthlyTrends]
            HM[DailyHeatmap]
            REC[RecurringList]
        end
    end

    style UploadPage fill:#e8f4f8
    style TransactionsPage fill:#d4edda
    style ChatPage fill:#f8d7da
    style SettingsPage fill:#fce4ec
    style DashboardPage fill:#e2d9f3
```

### Directory Layout

```
frontend/
├── src/
│   ├── app/
│   │   ├── app.component.ts           # Nav bar + router outlet
│   │   ├── app.config.ts              # provideRouter + provideHttpClient
│   │   ├── app.routes.ts              # Lazy-loaded routes
│   │   ├── core/
│   │   │   └── services/
│   │   │       ├── api.service.ts          # ✅ M2: HTTP client wrapper
│   │   │       ├── transactions.service.ts # ✅ M3: Transaction HTTP client
│   │   │       ├── chat.service.ts         # ✅ M5: SSE streaming + session CRUD
│   │   │       └── settings.service.ts     # ✅ M5: Currency localStorage persistence
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   └── file-dropzone/          # ✅ M2: Drag-and-drop
│   │   │   └── pipes/
│   │   │       └── markdown.pipe.ts        # ✅ M5: Markdown rendering (marked)
│   │   └── features/
│   │       ├── upload/                     # ✅ M2: Upload page
│   │       ├── transactions/               # ✅ M3: Transactions page
│   │       ├── chat/                       # ✅ M5: RAG chat interface
│   │       │   └── chat.component.ts       #   Session sidebar + SSE streaming
│   │       ├── settings/                   # ✅ M5: User preferences
│   │       │   └── settings.component.ts   #   Currency selector
│   │       └── dashboard/                  # 🚧 M6 (planned)
│   └── styles.scss
├── angular.json
├── tsconfig.json
└── package.json
```

---

## 7. API Endpoints

### Upload

| Method | Endpoint          | Description                                      |
| ------ | ----------------- | ------------------------------------------------ |
| POST   | `/upload`         | Upload PDF/CSV → triggers parse + embed pipeline |
| GET    | `/statements`     | List all uploaded statements                     |
| GET    | `/statements/:id` | Statement detail + parsed transactions           |
| DELETE | `/statements/:id` | Delete statement + related data                  |

### Transactions

| Method | Endpoint            | Description                                          |
| ------ | ------------------- | ---------------------------------------------------- |
| GET    | `/transactions`     | List transactions (filter by date, category, amount) |
| PATCH  | `/transactions/:id` | Edit category or description                         |

### Analytics

| Method | Endpoint                | Description                                |
| ------ | ----------------------- | ------------------------------------------ |
| GET    | `/analytics/summary`    | Total in/out, top categories, savings rate |
| GET    | `/analytics/categories` | Spending by category                       |
| GET    | `/analytics/monthly`    | Month-over-month breakdown                 |
| GET    | `/analytics/daily`      | Daily spending data (for heatmap)          |

### Chat (RAG)

| Method | Endpoint                       | Description                                                            |
| ------ | ------------------------------ | ---------------------------------------------------------------------- |
| POST   | `/chat`                        | Send message → SSE stream (tool-calling loop, returns X-Session-Id)    |
| GET    | `/chat/sessions`               | List all chat sessions (ordered by updatedAt DESC)                     |
| GET    | `/chat/sessions/:id/messages`  | Get messages for a session (ordered by createdAt ASC)                  |
| DELETE | `/chat/sessions/:id`           | Delete a session and its messages (CASCADE)                            |

### Health

| Method | Endpoint  | Description          |
| ------ | --------- | -------------------- |
| GET    | `/health` | Backend health check |

---

## 8. Mistral AI Integration

### Three API capabilities:

**1. Embeddings** — text → 1024-dim vector (via `@mistralai/mistralai` SDK)

```typescript
// mistral.service.ts
async embed(texts: string[]): Promise<number[][]> {
  const response = await this.client.embeddings.create({
    model: 'mistral-embed',
    inputs: texts,
  });
  return response.data.map(d => d.embedding);
}
```

**2. Chat Categorization** — batch transaction classification (via `@mistralai/mistralai` SDK)

```typescript
async categorize(descriptions: string[]): Promise<(string | null)[]> {
  const response = await this.client.chat.complete({
    model: 'mistral-large-latest',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(descriptions) },
    ],
    responseFormat: { type: 'json_object' },
  });
  // Parse and validate against VALID_CATEGORIES set
}
```

**3. Streaming Chat with Tools** — tool-calling loop (via Vercel AI SDK `@ai-sdk/mistral`)

```typescript
// mistral.service.ts — uses createMistral() from @ai-sdk/mistral
chatStream(params: {
  system: string;
  messages: ModelMessage[];
  tools?: ToolSet;
  maxSteps?: number;
}): ReturnType<typeof streamText> {
  return streamText({
    model: this.aiModel,          // createMistral({ apiKey })('mistral-large-latest')
    system: params.system,
    messages: params.messages,
    tools: params.tools,
    stopWhen: stepCountIs(params.maxSteps ?? 3),
  });
}
```

The `MistralService` maintains two clients: the native `@mistralai/mistralai` SDK for embeddings and categorization, and a Vercel AI SDK model instance (`@ai-sdk/mistral`) for streaming chat with tool-calling support. Both gracefully degrade when `MISTRAL_API_KEY` is not set.

---

## 9. Parser Strategy Pattern

```mermaid
classDiagram
    class ParserInterface {
        <<interface>>
        +canParse(buffer: Buffer, filename: string) boolean
        +parse(buffer: Buffer) Transaction[]
    }

    class PdfParser {
        +canParse(buffer, filename) boolean
        +parse(buffer) Transaction[]
    }

    class CsvParser {
        +canParse(buffer, filename) boolean
        +parse(buffer) Transaction[]
    }

    class GenericPdfParser {
        +canParse(buffer, filename) boolean
        +parse(buffer) Transaction[]
    }

    class BankAPdfParser {
        +canParse(buffer, filename) boolean
        +parse(buffer) Transaction[]
    }

    class UploadService {
        -parsers: ParserInterface[]
        +processFile(file) Transaction[]
    }

    ParserInterface <|.. PdfParser
    ParserInterface <|.. CsvParser
    ParserInterface <|.. GenericPdfParser
    ParserInterface <|.. BankAPdfParser
    UploadService --> ParserInterface : uses
```

The `UploadService` iterates through registered parsers, calling `canParse()` to find the right one. This makes adding new bank formats trivial — implement the interface and register it. Start with a generic PDF/CSV parser, then add bank-specific parsers as needed for formats that don't parse cleanly.

---

## 10. Environment Variables

```env
# .env (never commit)
DATABASE_URL=postgresql://ledger:ledger@localhost:5432/ledger
MISTRAL_API_KEY=your-key-here
JWT_SECRET=your-jwt-secret
UPLOAD_DIR=./uploads
```

---

## 11. Docker Compose (M3+)

```yaml
# docker-compose.yml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: ledger
      POSTGRES_USER: ledger
      POSTGRES_PASSWORD: ledger
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## 12. Key Dependencies

### Backend (NestJS)

| Package                       | Purpose                                  |
| ----------------------------- | ---------------------------------------- |
| `@nestjs/core`                | NestJS framework                         |
| `@nestjs/typeorm` + `typeorm` | ORM + database                           |
| `pg`                          | PostgreSQL driver                        |
| `@mistralai/mistralai`        | Mistral AI SDK (embeddings, categorize)  |
| `ai`                          | Vercel AI SDK (streamText, tool-calling) |
| `@ai-sdk/mistral`             | Vercel AI SDK Mistral provider           |
| `zod`                         | Schema validation (tool input schemas)   |
| `pdf-parse`                   | PDF text extraction                      |
| `csv-parse`                   | CSV parsing                              |
| `multer`                      | File upload handling                     |

### Frontend (Angular)

| Package                        | Purpose                          |
| ------------------------------ | -------------------------------- |
| `@angular/core`                | Angular framework                |
| `tailwindcss` + `daisyui`      | Utility-first CSS + components   |
| `marked`                       | Markdown rendering in chat       |
| `@tailwindcss/typography`      | Prose styling for markdown       |
