import 'reflect-metadata';
import { describe, test, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { Statement } from './entities/statement.entity';

const TEST_UPLOAD_DIR = path.join(__dirname, '../../.test-uploads');

let uuidCounter = 0;
function nextFakeUuid(): string {
  uuidCounter++;
  const hex = uuidCounter.toString(16).padStart(12, '0');
  return `aaaaaaaa-aaaa-4aaa-8aaa-${hex}`;
}

describe('Upload Integration', () => {
  let app: INestApplication;
  let statements: Statement[];
  let mockRepo: Partial<Repository<Statement>>;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;
    fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });

    mockRepo = {
      create: vi.fn((data: Partial<Statement>) => ({
        id: nextFakeUuid(),
        rawText: null,
        uploadedAt: new Date('2026-03-04T10:00:00Z'),
        ...data,
      })),
      save: vi.fn((entity: Statement) => {
        statements.push(entity);
        return Promise.resolve(entity);
      }),
      find: vi.fn(() => Promise.resolve(statements)),
      findOne: vi.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(statements.find((s) => s.id === id) ?? null),
      ),
      remove: vi.fn((entity: Statement) => {
        statements = statements.filter((s) => s.id !== entity.id);
        return Promise.resolve();
      }),
    };

    // Build the module manually to avoid emitDecoratorMetadata dependency.
    // We provide UploadService explicitly with the mock repo.
    const uploadService = new UploadService(mockRepo as unknown as Repository<Statement>);

    const moduleRef = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        { provide: UploadService, useValue: uploadService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    statements = [];
    uuidCounter = 0;
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
  });

  describe('POST /upload', () => {
    test('uploads a PDF file and returns statement metadata', async () => {
      const response = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', Buffer.from('%PDF-1.4 test content'), {
          filename: 'bank-statement.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.filename).toBe('bank-statement.pdf');
      expect(response.body.fileType).toBe('pdf');
      expect(response.body.fileSize).toBeGreaterThan(0);
      expect(response.body.uploadedAt).toBeDefined();
      expect(response.body).not.toHaveProperty('filePath');
      expect(response.body).not.toHaveProperty('rawText');
    });

    test('uploads a CSV file', async () => {
      const csvContent = 'date,description,amount\n2026-01-01,Coffee,5.00';
      const response = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', Buffer.from(csvContent), {
          filename: 'transactions.csv',
          contentType: 'text/csv',
        })
        .expect(201);

      expect(response.body.filename).toBe('transactions.csv');
      expect(response.body.fileType).toBe('csv');
    });

    test('rejects non-PDF/CSV files with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', Buffer.from('fake image'), {
          filename: 'photo.png',
          contentType: 'image/png',
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid file type');
    });

    test('rejects spoofed MIME type with wrong extension', async () => {
      const response = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', Buffer.from('executable'), {
          filename: 'malware.exe',
          contentType: 'application/pdf',
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid file extension');
    });

    test('rejects request without file', async () => {
      const response = await request(app.getHttpServer())
        .post('/upload')
        .expect(400);

      expect(response.body.message).toContain('No file provided');
    });

    test('stores file on disk with UUID filename', async () => {
      const existingFiles = fs.readdirSync(TEST_UPLOAD_DIR);
      existingFiles.forEach((f) => fs.unlinkSync(path.join(TEST_UPLOAD_DIR, f)));

      await request(app.getHttpServer())
        .post('/upload')
        .attach('file', Buffer.from('%PDF-1.4'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      const files = fs.readdirSync(TEST_UPLOAD_DIR);
      expect(files.length).toBe(1);
      expect(files[0]).not.toBe('test.pdf');
      expect(files[0]).toMatch(/\.pdf$/);
    });
  });

  describe('GET /statements', () => {
    test('returns empty list when no statements exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/statements')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    test('returns list of uploaded statements', async () => {
      await request(app.getHttpServer())
        .post('/upload')
        .attach('file', Buffer.from('%PDF-1.4'), {
          filename: 'first.pdf',
          contentType: 'application/pdf',
        });

      await request(app.getHttpServer())
        .post('/upload')
        .attach('file', Buffer.from('a,b\n1,2'), {
          filename: 'second.csv',
          contentType: 'text/csv',
        });

      const response = await request(app.getHttpServer())
        .get('/statements')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /statements/:id', () => {
    test('returns statement detail including rawText', async () => {
      const uploadResponse = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', Buffer.from('%PDF-1.4'), {
          filename: 'detail-test.pdf',
          contentType: 'application/pdf',
        });

      const id = uploadResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/statements/${id}`)
        .expect(200);

      expect(response.body.id).toBe(id);
      expect(response.body).toHaveProperty('rawText');
    });

    test('returns 404 for nonexistent statement', async () => {
      await request(app.getHttpServer())
        .get('/statements/00000000-0000-4000-8000-000000000000')
        .expect(404);
    });

    test('returns 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/statements/not-a-uuid')
        .expect(400);
    });
  });

  describe('DELETE /statements/:id', () => {
    test('deletes a statement', async () => {
      const uploadResponse = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', Buffer.from('%PDF-1.4'), {
          filename: 'delete-test.pdf',
          contentType: 'application/pdf',
        });

      const id = uploadResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/statements/${id}`)
        .expect(200);

      expect(mockRepo.remove).toHaveBeenCalled();
    });

    test('returns 404 when deleting nonexistent statement', async () => {
      await request(app.getHttpServer())
        .delete('/statements/00000000-0000-4000-8000-000000000000')
        .expect(404);
    });
  });
});
