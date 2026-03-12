import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ServerResponse } from 'http';
import { RagController } from './rag.controller.js';

// ---------------------------------------------------------------------------
// Mock RagService
// ---------------------------------------------------------------------------

const mockRagService = {
  chat: vi.fn(),
  getSessions: vi.fn(),
  getMessages: vi.fn(),
  deleteSession: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RagController', () => {
  let controller: RagController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new RagController(
      mockRagService as unknown as ConstructorParameters<typeof RagController>[0],
    );
  });

  // ---------------------------------------------------------------
  // chat()
  // ---------------------------------------------------------------
  describe('chat()', () => {
    it('calls ragService.chat with sessionId, message, and currency; sets SSE headers and pipes stream', async () => {
      const mockStreamResult = { pipeUIMessageStreamToResponse: vi.fn() };
      mockRagService.chat.mockResolvedValue({
        streamResult: mockStreamResult,
        sessionId: 'sess-1',
      });
      const mockRes = {
        writeHead: vi.fn(),
        write: vi.fn(),
      } as unknown as ServerResponse;

      await controller.chat(
        { sessionId: 'sess-existing', message: 'hello', currency: 'EUR' },
        mockRes,
      );

      expect(mockRagService.chat).toHaveBeenCalledWith('sess-existing', 'hello', 'EUR');
      expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      expect(mockRes.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify({ type: 'session-id', sessionId: 'sess-1' })}\n\n`,
      );
      expect(mockStreamResult.pipeUIMessageStreamToResponse).toHaveBeenCalledWith(mockRes);
    });

    it('defaults currency to USD when not provided', async () => {
      const mockStreamResult = { pipeUIMessageStreamToResponse: vi.fn() };
      mockRagService.chat.mockResolvedValue({
        streamResult: mockStreamResult,
        sessionId: 'sess-2',
      });
      const mockRes = {
        writeHead: vi.fn(),
        write: vi.fn(),
      } as unknown as ServerResponse;

      await controller.chat({ message: 'hello' }, mockRes);

      expect(mockRagService.chat).toHaveBeenCalledWith(null, 'hello', 'USD');
    });

    it('defaults sessionId to null when not provided', async () => {
      const mockStreamResult = { pipeUIMessageStreamToResponse: vi.fn() };
      mockRagService.chat.mockResolvedValue({
        streamResult: mockStreamResult,
        sessionId: 'sess-3',
      });
      const mockRes = {
        writeHead: vi.fn(),
        write: vi.fn(),
      } as unknown as ServerResponse;

      await controller.chat({ message: 'test' }, mockRes);

      expect(mockRagService.chat).toHaveBeenCalledWith(null, 'test', 'USD');
    });
  });

  // ---------------------------------------------------------------
  // getSessions()
  // ---------------------------------------------------------------
  describe('getSessions()', () => {
    it('returns result from ragService.getSessions()', async () => {
      const sessions = [{ id: 's1', title: 'Session 1' }];
      mockRagService.getSessions.mockResolvedValue(sessions);

      const result = await controller.getSessions();

      expect(result).toEqual(sessions);
      expect(mockRagService.getSessions).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // getMessages()
  // ---------------------------------------------------------------
  describe('getMessages()', () => {
    it('calls ragService.getMessages with the id param', async () => {
      const messages = [{ role: 'user', content: 'hi' }];
      mockRagService.getMessages.mockResolvedValue(messages);

      const result = await controller.getMessages('uuid-123');

      expect(mockRagService.getMessages).toHaveBeenCalledWith('uuid-123');
      expect(result).toEqual(messages);
    });
  });

  // ---------------------------------------------------------------
  // deleteSession()
  // ---------------------------------------------------------------
  describe('deleteSession()', () => {
    it('calls ragService.deleteSession and returns { deleted: true }', async () => {
      mockRagService.deleteSession.mockResolvedValue(undefined);

      const result = await controller.deleteSession('uuid-456');

      expect(mockRagService.deleteSession).toHaveBeenCalledWith('uuid-456');
      expect(result).toEqual({ deleted: true });
    });
  });
});
