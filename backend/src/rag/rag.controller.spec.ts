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

  function mockFullStream(events: Record<string, unknown>[]) {
    return {
      async *[Symbol.asyncIterator]() {
        for (const e of events) yield e;
      },
    };
  }

  function makeMockStreamResult(events: Record<string, unknown>[] = []) {
    return { fullStream: mockFullStream(events) };
  }

  describe('chat()', () => {
    it('sets SSE headers, sends session-id, streams text-delta and done summary, then ends', async () => {
      const events = [
        { type: 'text-delta', text: 'Hello ' },
        { type: 'text-delta', text: 'world' },
        { type: 'tool-result', toolName: 'done', output: { summary: 'Final answer' } },
      ];
      mockRagService.chat.mockResolvedValue({
        streamResult: makeMockStreamResult(events),
        sessionId: 'sess-1',
      });
      const mockRes = {
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
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

      const writes = (mockRes.write as ReturnType<typeof vi.fn>).mock.calls.map(
        (c: unknown[]) => c[0],
      );
      expect(writes[0]).toBe(
        `data: ${JSON.stringify({ type: 'session-id', sessionId: 'sess-1' })}\n\n`,
      );
      expect(writes[1]).toBe(
        `data: ${JSON.stringify({ type: 'text-delta', delta: 'Hello ' })}\n\n`,
      );
      expect(writes[2]).toBe(`data: ${JSON.stringify({ type: 'text-delta', delta: 'world' })}\n\n`);
      expect(writes[3]).toBe(
        `data: ${JSON.stringify({ type: 'text-delta', delta: 'Final answer' })}\n\n`,
      );
      expect(writes[4]).toBe('data: [DONE]\n\n');
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('defaults currency to USD when not provided', async () => {
      mockRagService.chat.mockResolvedValue({
        streamResult: makeMockStreamResult(),
        sessionId: 'sess-2',
      });
      const mockRes = {
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      await controller.chat({ message: 'hello' }, mockRes);

      expect(mockRagService.chat).toHaveBeenCalledWith(null, 'hello', 'USD');
    });

    it('defaults sessionId to null when not provided', async () => {
      mockRagService.chat.mockResolvedValue({
        streamResult: makeMockStreamResult(),
        sessionId: 'sess-3',
      });
      const mockRes = {
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      await controller.chat({ message: 'test' }, mockRes);

      expect(mockRagService.chat).toHaveBeenCalledWith(null, 'test', 'USD');
    });

    it('forwards tool-call events with args from event.input', async () => {
      const events = [
        { type: 'tool-call', toolName: 'think', input: { thought: 'planning...' } },
        { type: 'tool-call', toolName: 'sql_query', input: { sql: 'SELECT COUNT(*) FROM transactions' } },
        { type: 'tool-call', toolName: 'vector_search', input: { query: 'groceries' } },
      ];
      mockRagService.chat.mockResolvedValue({
        streamResult: makeMockStreamResult(events),
        sessionId: 'sess-4',
      });
      const mockRes = {
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      await controller.chat({ message: 'test' }, mockRes);

      const writes = (mockRes.write as ReturnType<typeof vi.fn>).mock.calls.map(
        (c: unknown[]) => c[0],
      );
      // session-id + 3 tool-calls + [DONE]
      expect(writes).toHaveLength(5);
      // Verify args are forwarded from event.input
      const thinkCall = JSON.parse(writes[1].replace('data: ', '').trim());
      expect(thinkCall).toEqual({ type: 'tool-call', toolName: 'think', args: { thought: 'planning...' } });
      const sqlCall = JSON.parse(writes[2].replace('data: ', '').trim());
      expect(sqlCall).toEqual({ type: 'tool-call', toolName: 'sql_query', args: { sql: 'SELECT COUNT(*) FROM transactions' } });
      const vecCall = JSON.parse(writes[3].replace('data: ', '').trim());
      expect(vecCall).toEqual({ type: 'tool-call', toolName: 'vector_search', args: { query: 'groceries' } });
    });

    it('skips done tool-call events', async () => {
      const events = [
        { type: 'tool-call', toolName: 'done', input: { summary: 'Final answer' } },
      ];
      mockRagService.chat.mockResolvedValue({
        streamResult: makeMockStreamResult(events),
        sessionId: 'sess-5',
      });
      const mockRes = {
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      await controller.chat({ message: 'test' }, mockRes);

      const writes = (mockRes.write as ReturnType<typeof vi.fn>).mock.calls.map(
        (c: unknown[]) => c[0],
      );
      // Only session-id + [DONE], done tool-call is not forwarded
      expect(writes).toHaveLength(2);
      expect(writes[0]).toContain('session-id');
      expect(writes[1]).toBe('data: [DONE]\n\n');
    });

    it('forwards tool-result events but skips done and think results', async () => {
      const events = [
        { type: 'tool-result', toolName: 'think', output: { thought: 'planning...' } },
        { type: 'tool-result', toolName: 'done', output: { summary: 'answer' } },
        { type: 'tool-result', toolName: 'sql_query', output: { results: [{ count: 40 }], rowCount: 1 } },
        { type: 'tool-result', toolName: 'vector_search', output: { results: [{ content: 'match' }] } },
        { type: 'tool-result', toolName: 'decompose_query', output: { subQueries: [{ query: 'test', intent: 'sql_aggregate' }] } },
      ];
      mockRagService.chat.mockResolvedValue({
        streamResult: makeMockStreamResult(events),
        sessionId: 'sess-6',
      });
      const mockRes = {
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      await controller.chat({ message: 'test' }, mockRes);

      const writes = (mockRes.write as ReturnType<typeof vi.fn>).mock.calls.map(
        (c: unknown[]) => c[0],
      );
      // session-id + done(as text-delta) + sql_query result + vector_search result + decompose_query result + [DONE]
      // think result is skipped, done result becomes text-delta
      expect(writes).toHaveLength(6);
      expect(writes[0]).toContain('session-id');
      // done result emitted as text-delta
      expect(writes[1]).toContain('"type":"text-delta"');
      expect(writes[1]).toContain('"delta":"answer"');
      // sql_query result forwarded
      const sqlResult = JSON.parse(writes[2].replace('data: ', '').trim());
      expect(sqlResult).toEqual({
        type: 'tool-result',
        toolName: 'sql_query',
        result: { results: [{ count: 40 }], rowCount: 1 },
      });
      // vector_search result forwarded
      const vecResult = JSON.parse(writes[3].replace('data: ', '').trim());
      expect(vecResult.toolName).toBe('vector_search');
      // decompose_query result forwarded
      const decompResult = JSON.parse(writes[4].replace('data: ', '').trim());
      expect(decompResult.toolName).toBe('decompose_query');
      expect(writes[5]).toBe('data: [DONE]\n\n');
    });

    it('streams a full ReAct loop in correct order', async () => {
      const events = [
        { type: 'tool-call', toolName: 'decompose_query', input: { message: 'how many transactions' } },
        { type: 'tool-result', toolName: 'decompose_query', output: { subQueries: [{ query: 'count', intent: 'sql_aggregate' }] } },
        { type: 'tool-call', toolName: 'think', input: { thought: 'I should count transactions' } },
        { type: 'tool-result', toolName: 'think', output: { thought: 'I should count transactions' } },
        { type: 'tool-call', toolName: 'sql_query', input: { sql: 'SELECT COUNT(*) FROM transactions' } },
        { type: 'tool-result', toolName: 'sql_query', output: { results: [{ count: 40 }], rowCount: 1 } },
        { type: 'text-delta', text: 'You have ' },
        { type: 'text-delta', text: '40 transactions.' },
        { type: 'tool-call', toolName: 'done', input: { summary: 'You have 40 transactions.' } },
        { type: 'tool-result', toolName: 'done', output: { summary: 'You have 40 transactions.' } },
      ];
      mockRagService.chat.mockResolvedValue({
        streamResult: makeMockStreamResult(events),
        sessionId: 'sess-7',
      });
      const mockRes = {
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;

      await controller.chat({ message: 'how many transactions' }, mockRes);

      const writes = (mockRes.write as ReturnType<typeof vi.fn>).mock.calls.map(
        (c: unknown[]) => c[0],
      );
      const parsed = writes.map((w: string) => {
        const raw = w.replace('data: ', '').trim();
        if (raw === '[DONE]') return { type: '[DONE]' };
        try { return JSON.parse(raw); } catch { return raw; }
      });

      // session-id, decompose_query call, decompose_query result, think call,
      // sql_query call, sql_query result, 2x text-delta, done result as text-delta, [DONE]
      // (think result skipped, done call skipped)
      expect(parsed[0].type).toBe('session-id');
      expect(parsed[1]).toEqual({ type: 'tool-call', toolName: 'decompose_query', args: { message: 'how many transactions' } });
      expect(parsed[2].type).toBe('tool-result');
      expect(parsed[2].toolName).toBe('decompose_query');
      expect(parsed[3]).toEqual({ type: 'tool-call', toolName: 'think', args: { thought: 'I should count transactions' } });
      expect(parsed[4]).toEqual({ type: 'tool-call', toolName: 'sql_query', args: { sql: 'SELECT COUNT(*) FROM transactions' } });
      expect(parsed[5].type).toBe('tool-result');
      expect(parsed[5].toolName).toBe('sql_query');
      expect(parsed[6]).toEqual({ type: 'text-delta', delta: 'You have ' });
      expect(parsed[7]).toEqual({ type: 'text-delta', delta: '40 transactions.' });
      expect(parsed[8]).toEqual({ type: 'text-delta', delta: 'You have 40 transactions.' });
      expect(parsed[9].type).toBe('[DONE]');
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
