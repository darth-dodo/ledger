import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { Statement } from './entities/statement.entity';

function createMockService(): Partial<UploadService> {
  return {
    createStatement: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    remove: vi.fn(),
  };
}

function createMockFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'statement.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    destination: './uploads',
    filename: 'abc-123.pdf',
    path: './uploads/abc-123.pdf',
    buffer: Buffer.from(''),
    stream: null as any,
    ...overrides,
  };
}

function createMockStatement(overrides: Partial<Statement> = {}): Statement {
  return {
    id: 'test-uuid',
    filename: 'statement.pdf',
    fileType: 'pdf',
    filePath: 'abc-123.pdf',
    fileSize: 1024,
    rawText: null,
    uploadedAt: new Date('2026-03-04T10:00:00Z'),
    ...overrides,
  } as Statement;
}

describe('UploadController', () => {
  let controller: UploadController;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    controller = new UploadController(mockService as UploadService);
  });

  describe('POST /upload', () => {
    test('uploads a valid PDF file', async () => {
      const file = createMockFile();
      const statement = createMockStatement();
      vi.mocked(mockService.createStatement!).mockResolvedValue(statement);

      const result = await controller.upload(file);

      expect(result.id).toBe('test-uuid');
      expect(result.filename).toBe('statement.pdf');
      expect(result.fileType).toBe('pdf');
      expect(result.fileSize).toBe(1024);
      expect(result.uploadedAt).toBe('2026-03-04T10:00:00.000Z');
    });

    test('uploads a valid CSV file', async () => {
      const file = createMockFile({
        originalname: 'transactions.csv',
        mimetype: 'text/csv',
      });
      const statement = createMockStatement({ fileType: 'csv', filename: 'transactions.csv' });
      vi.mocked(mockService.createStatement!).mockResolvedValue(statement);

      const result = await controller.upload(file);

      expect(result.fileType).toBe('csv');
    });

    test('throws BadRequestException when no file provided', async () => {
      await expect(
        controller.upload(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    test('throws BadRequestException for invalid MIME type', async () => {
      const file = createMockFile({ mimetype: 'image/png' });

      await expect(controller.upload(file)).rejects.toThrow(BadRequestException);
      await expect(controller.upload(file)).rejects.toThrow('Invalid file type');
    });

    test('throws BadRequestException for invalid extension', async () => {
      const file = createMockFile({
        originalname: 'statement.exe',
        mimetype: 'application/pdf', // spoofed MIME
      });

      await expect(controller.upload(file)).rejects.toThrow(BadRequestException);
      await expect(controller.upload(file)).rejects.toThrow('Invalid file extension');
    });

    test('response does not include rawText or filePath', async () => {
      const file = createMockFile();
      const statement = createMockStatement();
      vi.mocked(mockService.createStatement!).mockResolvedValue(statement);

      const result = await controller.upload(file);

      expect(result).not.toHaveProperty('rawText');
      expect(result).not.toHaveProperty('filePath');
    });
  });

  describe('GET /statements', () => {
    test('returns list of statements', async () => {
      const statements = [
        createMockStatement({ id: '1' }),
        createMockStatement({ id: '2', fileType: 'csv' }),
      ];
      vi.mocked(mockService.findAll!).mockResolvedValue(statements);

      const result = await controller.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].fileType).toBe('csv');
    });

    test('returns empty array when no statements exist', async () => {
      vi.mocked(mockService.findAll!).mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('GET /statements/:id', () => {
    test('returns statement detail with rawText', async () => {
      const statement = createMockStatement({ rawText: 'parsed content' });
      vi.mocked(mockService.findOne!).mockResolvedValue(statement);

      const result = await controller.findOne('test-uuid');

      expect(result.id).toBe('test-uuid');
      expect(result.rawText).toBe('parsed content');
    });
  });

  describe('DELETE /statements/:id', () => {
    test('calls service remove', async () => {
      await controller.remove('test-uuid');

      expect(mockService.remove).toHaveBeenCalledWith('test-uuid', expect.any(String));
    });
  });
});
