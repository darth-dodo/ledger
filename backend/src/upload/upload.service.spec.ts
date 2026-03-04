import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { Statement } from './entities/statement.entity';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

function createMockRepo() {
  return {
    create: vi.fn((data: Partial<Statement>) => ({ id: 'test-uuid', uploadedAt: new Date(), rawText: null, ...data }) as Statement),
    save: vi.fn((entity: Statement) => Promise.resolve(entity)),
    find: vi.fn(() => Promise.resolve([])),
    findOne: vi.fn(() => Promise.resolve(null)),
    remove: vi.fn(() => Promise.resolve()),
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

describe('UploadService', () => {
  let service: UploadService;
  let mockRepo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new UploadService(mockRepo as any);
    vi.clearAllMocks();
  });

  describe('createStatement', () => {
    test('creates a statement from a PDF file', async () => {
      const file = createMockFile();
      const result = await service.createStatement(file);

      expect(mockRepo.create).toHaveBeenCalledWith({
        filename: 'statement.pdf',
        fileType: 'pdf',
        filePath: 'abc-123.pdf',
        fileSize: 1024,
      });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.filename).toBe('statement.pdf');
    });

    test('creates a statement from a CSV file', async () => {
      const file = createMockFile({
        originalname: 'transactions.csv',
        mimetype: 'text/csv',
        filename: 'abc-123.csv',
      });

      const result = await service.createStatement(file);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ fileType: 'csv' }),
      );
      expect(result.fileType).toBe('csv');
    });

    test('stores file size in bytes', async () => {
      const file = createMockFile({ size: 5_000_000 });
      await service.createStatement(file);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ fileSize: 5_000_000 }),
      );
    });
  });

  describe('findAll', () => {
    test('returns all statements ordered by uploadedAt DESC', async () => {
      const statements = [
        { id: '1', filename: 'a.pdf', uploadedAt: new Date() },
        { id: '2', filename: 'b.csv', uploadedAt: new Date() },
      ] as Statement[];
      mockRepo.find.mockResolvedValue(statements);

      const result = await service.findAll();

      expect(mockRepo.find).toHaveBeenCalledWith({
        order: { uploadedAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    test('returns a statement by ID', async () => {
      const statement = { id: 'test-uuid', filename: 'a.pdf' } as Statement;
      mockRepo.findOne.mockResolvedValue(statement);

      const result = await service.findOne('test-uuid');

      expect(result.id).toBe('test-uuid');
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'test-uuid' },
      });
    });

    test('throws NotFoundException when statement does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    test('deletes file from disk and removes DB record', async () => {
      const statement = {
        id: 'test-uuid',
        filePath: 'abc-123.pdf',
      } as Statement;
      mockRepo.findOne.mockResolvedValue(statement);

      await service.remove('test-uuid', './uploads');

      expect(fs.unlink).toHaveBeenCalledWith('uploads/abc-123.pdf');
      expect(mockRepo.remove).toHaveBeenCalledWith(statement);
    });

    test('still removes DB record if file is already deleted', async () => {
      const statement = {
        id: 'test-uuid',
        filePath: 'missing.pdf',
      } as Statement;
      mockRepo.findOne.mockResolvedValue(statement);
      vi.mocked(fs.unlink).mockRejectedValue(new Error('ENOENT'));

      await service.remove('test-uuid', './uploads');

      expect(mockRepo.remove).toHaveBeenCalledWith(statement);
    });

    test('throws NotFoundException when deleting nonexistent statement', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent', './uploads')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
