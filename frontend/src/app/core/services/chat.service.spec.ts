import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChatService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('getSessions', () => {
    it('should make GET request to /chat/sessions', () => {
      const mockSessions = [{ id: '1', title: 'Session 1', createdAt: '', updatedAt: '' }];

      service.getSessions().subscribe((sessions) => {
        expect(sessions).toEqual(mockSessions);
      });

      const req = httpTesting.expectOne('http://localhost:3000/chat/sessions');
      expect(req.request.method).toBe('GET');
      req.flush(mockSessions);
    });
  });

  describe('getMessages', () => {
    it('should make GET request with session ID in URL', () => {
      const sessionId = 'abc-123';
      const mockMessages = [
        {
          id: '1',
          sessionId,
          role: 'user' as const,
          content: 'Hello',
          sources: null,
          createdAt: '',
        },
      ];

      service.getMessages(sessionId).subscribe((messages) => {
        expect(messages).toEqual(mockMessages);
      });

      const req = httpTesting.expectOne(
        `http://localhost:3000/chat/sessions/${sessionId}/messages`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockMessages);
    });
  });

  describe('deleteSession', () => {
    it('should make DELETE request with session ID', () => {
      const sessionId = 'xyz-789';

      service.deleteSession(sessionId).subscribe();

      const req = httpTesting.expectOne(`http://localhost:3000/chat/sessions/${sessionId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('sendMessage', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should call fetch with correct URL, method, headers, and body', () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream({
            start(ctrl) {
              ctrl.close();
            },
          }),
          {
            status: 200,
          },
        ),
      );
      globalThis.fetch = mockFetch;

      const sessionId = 'sess-1';
      const message = 'What are my expenses?';
      const currency = 'EUR';

      service.sendMessage(sessionId, message, currency).subscribe();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message, currency }),
        }),
      );
    });

    it('should include null sessionId when creating a new session', () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream({
            start(ctrl) {
              ctrl.close();
            },
          }),
          {
            status: 200,
          },
        ),
      );
      globalThis.fetch = mockFetch;

      service.sendMessage(null, 'Hello', 'USD').subscribe();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/chat',
        expect.objectContaining({
          body: JSON.stringify({ sessionId: null, message: 'Hello', currency: 'USD' }),
        }),
      );
    });

    it('should emit error when fetch response is not ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      globalThis.fetch = mockFetch;

      return new Promise<void>((resolve) => {
        service.sendMessage('s1', 'test', 'USD').subscribe({
          error: (err) => {
            expect(err.message).toBe('Server error');
            resolve();
          },
        });
      });
    });

    function createSSEStream(lines: string[]): ReadableStream {
      const encoder = new TextEncoder();
      return new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(lines.join('\n')));
          controller.close();
        },
      });
    }

    it('should parse AI SDK v6 text-delta chunks and emit delta content', async () => {
      const stream = createSSEStream([
        'data: {"type":"text-delta","delta":"Hello"}',
        'data: {"type":"text-delta","delta":" world"}',
      ]);
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));

      const emitted: string[] = [];
      return new Promise<void>((resolve) => {
        service.sendMessage('s1', 'hi', 'USD').subscribe({
          next: (val) => emitted.push(val),
          complete: () => {
            expect(emitted).toEqual(['Hello', ' world']);
            resolve();
          },
        });
      });
    });

    it('should skip [DONE] and empty data lines', async () => {
      const stream = createSSEStream([
        'data: {"type":"text-delta","delta":"ok"}',
        'data: [DONE]',
        'data: ',
      ]);
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));

      const emitted: string[] = [];
      return new Promise<void>((resolve) => {
        service.sendMessage('s1', 'hi', 'USD').subscribe({
          next: (val) => emitted.push(val),
          complete: () => {
            expect(emitted).toEqual(['ok']);
            resolve();
          },
        });
      });
    });

    it('should emit non-JSON SSE data as-is (fallback)', async () => {
      const stream = createSSEStream(['data: plain text here']);
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));

      const emitted: string[] = [];
      return new Promise<void>((resolve) => {
        service.sendMessage('s1', 'hi', 'USD').subscribe({
          next: (val) => emitted.push(val),
          complete: () => {
            expect(emitted).toEqual(['plain text here']);
            resolve();
          },
        });
      });
    });

    it('should ignore d: lines without sessionId', async () => {
      const stream = createSSEStream(['d:{"finishReason":"stop"}']);
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));

      const emitted: string[] = [];
      return new Promise<void>((resolve) => {
        service.sendMessage('s1', 'hi', 'USD').subscribe({
          next: (val) => emitted.push(val),
          complete: () => {
            expect(emitted).toEqual([]);
            resolve();
          },
        });
      });
    });

    it('should ignore d: lines with invalid JSON', async () => {
      const stream = createSSEStream(['d:not-json']);
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));

      const emitted: string[] = [];
      return new Promise<void>((resolve) => {
        service.sendMessage('s1', 'hi', 'USD').subscribe({
          next: (val) => emitted.push(val),
          complete: () => {
            expect(emitted).toEqual([]);
            resolve();
          },
          error: () => {
            throw new Error('should not error');
          },
        });
      });
    });

    it('should complete when stream ends', async () => {
      const stream = createSSEStream(['data: {"type":"text-delta","delta":"fin"}']);
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));

      return new Promise<void>((resolve) => {
        let completed = false;
        service.sendMessage('s1', 'hi', 'USD').subscribe({
          complete: () => {
            completed = true;
            expect(completed).toBe(true);
            resolve();
          },
        });
      });
    });

    it('should abort fetch when unsubscribed', () => {
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
      const stream = new ReadableStream({
        start() {
          // intentionally never close - simulates a long-running stream
        },
      });
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));

      const sub = service.sendMessage('s1', 'hi', 'USD').subscribe();
      sub.unsubscribe();

      expect(abortSpy).toHaveBeenCalled();
      abortSpy.mockRestore();
    });

    it('should emit error with fallback message when response body is not JSON', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response('Internal Server Error', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        }),
      );

      return new Promise<void>((resolve) => {
        service.sendMessage('s1', 'test', 'USD').subscribe({
          error: (err) => {
            expect(err.message).toBe('Request failed with status 500');
            resolve();
          },
        });
      });
    });
  });
});
