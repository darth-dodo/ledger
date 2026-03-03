# Ledge — Architecture Document

---

## 1. System Overview

```mermaid
graph TB
    subgraph Frontend ["Angular Frontend :4200"]
        UP[Upload Module]
        DASH[Dashboard]
        CHAT[Chat Interface]
        TX[Transactions View]
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
    participant Mistral as Mistral AI
    participant pgvector as PostgreSQL + pgvector

    User->>Angular: Types question
    Angular->>NestJS: POST /chat { message }

    rect rgb(255, 243, 205)
        Note over NestJS,Mistral: 1. Embed the query
        NestJS->>Mistral: Embed user question
        Mistral-->>NestJS: Query vector (1024-dim)
    end

    rect rgb(212, 237, 218)
        Note over NestJS,pgvector: 2. Vector similarity search
        NestJS->>pgvector: Cosine search (top 5 chunks)
        pgvector-->>NestJS: Relevant transaction chunks
    end

    rect rgb(248, 215, 218)
        Note over NestJS,Mistral: 3. Generate response
        NestJS->>NestJS: Build prompt (system + context + query)
        NestJS->>Mistral: Chat completion
        Mistral-->>NestJS: AI response
    end

    NestJS->>pgvector: Store chat message + sources
    NestJS-->>Angular: { response, sources[] }
    Angular-->>User: Display answer + source cards
```

### RAG Prompt Template

```
SYSTEM:
You are a financial assistant analyzing the user's bank statements.
Answer questions using ONLY the provided context. If the context
doesn't contain the answer, say so. Always cite specific transactions.

CONTEXT:
{retrieved chunks from pgvector search}

USER:
{user's question}
```

---

## 4. Database Schema

```mermaid
erDiagram
    statements {
        uuid id PK
        varchar filename
        varchar file_type "pdf | csv"
        text raw_text
        timestamp uploaded_at
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
        text chunk_text
        vector embedding "1024-dim"
        timestamp created_at
    }

    chat_messages {
        uuid id PK
        varchar role "user | assistant"
        text content
        jsonb sources "chunk IDs used"
        timestamp created_at
    }

    statements ||--o{ transactions : "has many"
    statements ||--o{ embeddings : "has many"
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
            CHK[ChunkerService]
        end

        subgraph TransactionsModule
            TC2[TransactionsController]
            TS2[TransactionsService]
            TE[Transaction Entity]
        end

        subgraph EmbeddingsModule
            ES2[EmbeddingsService]
            EE[Embedding Entity]
        end

        subgraph RagModule
            RC2[RagController]
            RS2[RagService]
        end

        subgraph AnalyticsModule
            AC2[AnalyticsController]
            AS2[AnalyticsService]
        end

        subgraph MistralModule
            MS2[MistralService]
            MC2[MistralConfig]
        end

        subgraph CommonModule
            DTO[Shared DTOs]
            INT[Interceptors]
        end
    end

    style UploadModule fill:#e8f4f8
    style TransactionsModule fill:#d4edda
    style EmbeddingsModule fill:#fff3cd
    style RagModule fill:#f8d7da
    style AnalyticsModule fill:#e2d9f3
    style MistralModule fill:#fce4ec
    style CommonModule fill:#f5f5f5
```

### Directory Layout

```
backend/
├── src/
│   ├── app.module.ts
│   ├── upload/
│   │   ├── upload.module.ts
│   │   ├── upload.controller.ts
│   │   ├── upload.service.ts
│   │   ├── parsers/
│   │   │   ├── parser.interface.ts      # Strategy interface
│   │   │   ├── pdf.parser.ts
│   │   │   └── csv.parser.ts
│   │   └── chunker.service.ts
│   ├── transactions/
│   │   ├── transactions.module.ts
│   │   ├── transactions.controller.ts
│   │   ├── transactions.service.ts
│   │   └── entities/
│   │       └── transaction.entity.ts
│   ├── embeddings/
│   │   ├── embeddings.module.ts
│   │   ├── embeddings.service.ts
│   │   └── entities/
│   │       └── embedding.entity.ts
│   ├── rag/
│   │   ├── rag.module.ts
│   │   ├── rag.controller.ts
│   │   └── rag.service.ts
│   ├── analytics/
│   │   ├── analytics.module.ts
│   │   ├── analytics.controller.ts
│   │   └── analytics.service.ts
│   ├── mistral/
│   │   ├── mistral.module.ts
│   │   ├── mistral.service.ts
│   │   └── mistral.config.ts
│   └── common/
│       ├── dto/
│       └── interceptors/
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
            MI[MessageInput]
            MB[MessageBubble]
            SC[SourceCard]
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
    style DashboardPage fill:#e2d9f3
```

### Directory Layout

```
frontend/
├── src/
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.routes.ts
│   │   ├── core/
│   │   │   └── services/
│   │   │       ├── api.service.ts          # HTTP client wrapper
│   │   │       ├── upload.service.ts
│   │   │       ├── transactions.service.ts
│   │   │       ├── chat.service.ts
│   │   │       └── analytics.service.ts
│   │   ├── shared/
│   │   │   └── components/
│   │   │       ├── file-dropzone/
│   │   │       ├── loading-spinner/
│   │   │       └── stat-card/
│   │   └── features/
│   │       ├── upload/
│   │       ├── transactions/
│   │       ├── chat/
│   │       └── dashboard/
│   ├── environments/
│   └── styles.scss
├── angular.json
├── tsconfig.json
└── package.json
```

---

## 7. API Endpoints

### Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload PDF/CSV → triggers parse + embed pipeline |
| GET | `/statements` | List all uploaded statements |
| GET | `/statements/:id` | Statement detail + parsed transactions |
| DELETE | `/statements/:id` | Delete statement + related data |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions` | List transactions (filter by date, category, amount) |
| PATCH | `/transactions/:id` | Edit category or description |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/summary` | Total in/out, top categories, savings rate |
| GET | `/analytics/categories` | Spending by category |
| GET | `/analytics/monthly` | Month-over-month breakdown |
| GET | `/analytics/daily` | Daily spending data (for heatmap) |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat` | Send message → RAG-powered response |
| GET | `/chat/history` | Past chat messages |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Backend health check |

---

## 8. Mistral AI Integration

### Two API calls used:

**1. Embeddings** — text → 1024-dim vector

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

**2. Chat Completion** — context + question → answer

```typescript
async chat(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await this.client.chat.complete({
    model: 'mistral-large-latest',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });
  return response.choices[0].message.content;
}
```

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
DATABASE_URL=postgresql://ledge:ledge@localhost:5432/ledge
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
      POSTGRES_DB: ledge
      POSTGRES_USER: ledge
      POSTGRES_PASSWORD: ledge
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## 12. Key Dependencies

### Backend (NestJS)

| Package | Purpose |
|---------|---------|
| `@nestjs/core` | NestJS framework |
| `@nestjs/typeorm` + `typeorm` | ORM + database |
| `pg` + `pgvector` | PostgreSQL driver + vector support |
| `@mistralai/mistralai` | Mistral AI SDK |
| `pdf-parse` | PDF text extraction |
| `csv-parse` | CSV parsing |
| `multer` | File upload handling |
| `@nestjs/jwt` + `@nestjs/passport` | Authentication (M7) |

### Frontend (Angular)

| Package | Purpose |
|---------|---------|
| `@angular/core` | Angular framework |
| `chart.js` + `ng2-charts` | Data visualization |
