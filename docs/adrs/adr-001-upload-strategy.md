# ADR-001: File Upload Strategy

**Status**: Accepted
**Date**: 2026-03-04
**Milestone**: M2 — File Upload

---

## Context

Ledger needs to accept PDF and CSV bank statements from users. The upload system must validate files, store them, persist metadata to PostgreSQL, and lay the groundwork for the M3 parsing pipeline.

Key constraints:

- Single-user local application (no multi-tenancy)
- Files are bank statements (PDF/CSV), typically 50KB–5MB
- The upload and parsing steps are separate milestones (M2 upload, M3 parse)
- Config already defines `UPLOAD_DIR` (default: `./uploads`)

---

## Decisions

### 1. Storage: Local Filesystem

**Choice**: Store uploaded files on the local filesystem under `UPLOAD_DIR`.

**Alternatives considered**:

- **Database BLOB**: Simpler (single source of truth), but PostgreSQL is not optimized for file storage and would bloat the database.
- **Object storage (S3/R2)**: Production-grade but unnecessary complexity for a single-user app.

**Rationale**: Local storage is simplest, aligns with the existing `UPLOAD_DIR` config, and can be swapped to object storage later via a `StorageService` interface if needed.

**File naming**: `{uuid}.{ext}` to avoid collisions and path traversal issues. Original filename stored in the `statements` table.

### 2. File Handling: Multer via @nestjs/platform-express

**Choice**: Use Multer (bundled with `@nestjs/platform-express`) for multipart file handling.

**Rationale**: Already available as a transitive dependency — no new packages needed. NestJS has first-class support via `@UseInterceptors(FileInterceptor())` and `@UploadedFile()` decorators.

**Configuration**:

- Max file size: 10MB
- Accepted MIME types: `application/pdf`, `text/csv`
- Storage: Multer `diskStorage` writing to `UPLOAD_DIR`

### 3. Validation Strategy: Layered

Validation happens at three levels:

| Layer          | Check                            | Response              |
| -------------- | -------------------------------- | --------------------- |
| **Multer**     | File size limit (10MB)           | 413 Payload Too Large |
| **Controller** | MIME type (PDF/CSV only)         | 400 Bad Request       |
| **Controller** | File extension matches MIME type | 400 Bad Request       |

**Rationale**: Multer rejects oversized files before they hit the application. The controller validates type and extension. No need for magic-byte detection at this stage — MIME type + extension is sufficient for a personal finance app.

### 4. Database Schema: `statements` Table

```sql
CREATE TABLE statements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename    VARCHAR(255) NOT NULL,
  file_type   VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'csv')),
  file_path   VARCHAR(500) NOT NULL,
  file_size   INTEGER NOT NULL,
  raw_text    TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Notes**:

- `raw_text` is nullable — populated later by M3 parsers
- `file_path` stores the path relative to `UPLOAD_DIR`
- `file_size` in bytes for display and validation
- The schema matches `docs/architecture.md` section 4 with the addition of `file_path` and `file_size`

### 5. Upload Flow: Synchronous

**Choice**: The `POST /upload` endpoint is synchronous — it stores the file, creates the `statements` row, and returns.

**Rationale**: Parsing and embedding (M3, M4) will be triggered separately. M2 only handles file acceptance and metadata persistence. No need for async job queues at this stage.

**Response**:

```json
{
  "id": "uuid",
  "filename": "statement.pdf",
  "fileType": "pdf",
  "fileSize": 204800,
  "uploadedAt": "2026-03-04T10:30:45.123Z"
}
```

### 6. API Design

| Method | Endpoint          | Description                    |
| ------ | ----------------- | ------------------------------ |
| POST   | `/upload`         | Upload a PDF/CSV file          |
| GET    | `/statements`     | List all uploaded statements   |
| GET    | `/statements/:id` | Get statement detail           |
| DELETE | `/statements/:id` | Delete statement + stored file |

**DELETE behavior**: Removes the database row AND the file from disk. Cascading deletes for related transactions/embeddings will be added in later milestones.

### 7. Module Structure

```
backend/src/upload/
├── upload.module.ts
├── upload.controller.ts
├── upload.service.ts
├── upload.controller.spec.ts
├── upload.service.spec.ts
├── upload.integration.spec.ts
├── dto/
│   └── upload-response.dto.ts
└── entities/
    └── statement.entity.ts
```

Follows the same pattern as the health module but adds a service layer (health was stateless, upload needs DB + filesystem interaction).

---

## Consequences

**Positive**:

- Simple and fast to implement — no new dependencies beyond what ships with NestJS
- Clean separation between upload (M2) and parsing (M3)
- File naming prevents path traversal and collisions
- Layered validation catches bad input at the earliest possible point

**Negative**:

- Local filesystem storage doesn't scale to multi-user or cloud deployment (acceptable for MVP)
- No virus scanning (deferred to M8)
- No duplicate file detection (acceptable for personal use)

**Risks**:

- Disk space: No automatic cleanup of orphaned files. Mitigated by DELETE endpoint.
- Concurrent uploads: Not a concern for single-user app.

---

## References

- [docs/architecture.md](../architecture.md) — Section 4 (Database Schema), Section 7 (API Endpoints)
- [docs/milestones/m1-m2-handoff.md](../milestones/m1-m2-handoff.md) — Handoff recommendations
- [NestJS File Upload docs](https://docs.nestjs.com/techniques/file-upload)
