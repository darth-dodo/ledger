import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApiService, UploadResponse, StatementDetail } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('uploadFile', () => {
    it('should send POST to /upload with FormData containing the file', () => {
      const mockFile = new File(['content'], 'statement.pdf', {
        type: 'application/pdf',
      });
      const mockResponse: UploadResponse = {
        id: 'uuid-1',
        filename: 'statement.pdf',
        fileType: 'application/pdf',
        fileSize: 7,
        uploadedAt: '2026-01-01T00:00:00.000Z',
      };

      service.uploadFile(mockFile).subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpTesting.expectOne('http://localhost:3000/upload');
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      expect(req.request.body.get('file')).toBeTruthy();
      req.flush(mockResponse);
    });
  });

  describe('getStatements', () => {
    it('should send GET to /statements and return array', () => {
      const mockStatements: UploadResponse[] = [
        {
          id: '1',
          filename: 'jan.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          uploadedAt: '2026-01-15T00:00:00.000Z',
        },
        {
          id: '2',
          filename: 'feb.csv',
          fileType: 'text/csv',
          fileSize: 512,
          uploadedAt: '2026-02-15T00:00:00.000Z',
        },
      ];

      service.getStatements().subscribe((statements) => {
        expect(statements).toEqual(mockStatements);
        expect(statements).toHaveLength(2);
      });

      const req = httpTesting.expectOne('http://localhost:3000/statements');
      expect(req.request.method).toBe('GET');
      req.flush(mockStatements);
    });

    it('should handle empty array response', () => {
      service.getStatements().subscribe((statements) => {
        expect(statements).toEqual([]);
      });

      const req = httpTesting.expectOne('http://localhost:3000/statements');
      req.flush([]);
    });
  });

  describe('getStatement', () => {
    it('should send GET to /statements/:id with correct ID', () => {
      const statementId = 'abc-123';
      const mockDetail: StatementDetail = {
        id: statementId,
        filename: 'march.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
        uploadedAt: '2026-03-01T00:00:00.000Z',
        rawText: 'Extracted text content',
      };

      service.getStatement(statementId).subscribe((detail) => {
        expect(detail).toEqual(mockDetail);
        expect(detail.rawText).toBe('Extracted text content');
      });

      const req = httpTesting.expectOne(
        `http://localhost:3000/statements/${statementId}`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockDetail);
    });

    it('should handle statement with null rawText', () => {
      const statementId = 'def-456';
      const mockDetail: StatementDetail = {
        id: statementId,
        filename: 'april.csv',
        fileType: 'text/csv',
        fileSize: 256,
        uploadedAt: '2026-04-01T00:00:00.000Z',
        rawText: null,
      };

      service.getStatement(statementId).subscribe((detail) => {
        expect(detail.rawText).toBeNull();
      });

      const req = httpTesting.expectOne(
        `http://localhost:3000/statements/${statementId}`,
      );
      req.flush(mockDetail);
    });
  });

  describe('deleteStatement', () => {
    it('should send DELETE to /statements/:id', () => {
      const statementId = 'xyz-789';

      service.deleteStatement(statementId).subscribe();

      const req = httpTesting.expectOne(
        `http://localhost:3000/statements/${statementId}`,
      );
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
