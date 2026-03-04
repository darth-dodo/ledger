import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { JsonLogger } from './logger';

describe('JsonLogger', () => {
  let logger: JsonLogger;
  let calls: string[];
  let originalLog: typeof console.log;

  beforeEach(() => {
    logger = new JsonLogger();
    calls = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      calls.push(args[0]);
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  function parseLastLog(): Record<string, unknown> {
    expect(calls.length).toBeGreaterThan(0);
    return JSON.parse(calls[calls.length - 1]);
  }

  describe('log levels', () => {
    test('log() emits level "info"', () => {
      logger.log('hello');
      const entry = parseLastLog();
      expect(entry.level).toBe('info');
      expect(entry.message).toBe('hello');
    });

    test('error() emits level "error"', () => {
      logger.error('something broke');
      const entry = parseLastLog();
      expect(entry.level).toBe('error');
      expect(entry.message).toBe('something broke');
    });

    test('warn() emits level "warn"', () => {
      logger.warn('careful');
      const entry = parseLastLog();
      expect(entry.level).toBe('warn');
      expect(entry.message).toBe('careful');
    });

    test('debug() emits level "debug"', () => {
      logger.debug('trace info');
      const entry = parseLastLog();
      expect(entry.level).toBe('debug');
      expect(entry.message).toBe('trace info');
    });

    test('verbose() emits level "verbose"', () => {
      logger.verbose('all the details');
      const entry = parseLastLog();
      expect(entry.level).toBe('verbose');
      expect(entry.message).toBe('all the details');
    });
  });

  describe('context extraction', () => {
    test('extracts context from last string param', () => {
      logger.log('starting up', 'AppController');
      const entry = parseLastLog();
      expect(entry.context).toBe('AppController');
    });

    test('returns empty string when no context provided', () => {
      logger.log('no context');
      const entry = parseLastLog();
      expect(entry.context).toBe('');
    });

    test('returns empty string when last param is not a string', () => {
      logger.log('object param', { foo: 'bar' });
      const entry = parseLastLog();
      expect(entry.context).toBe('');
    });
  });

  describe('timestamp', () => {
    test('includes a valid ISO 8601 timestamp', () => {
      logger.log('time check');
      const entry = parseLastLog();
      const parsed = new Date(entry.timestamp);
      expect(parsed.toISOString()).toBe(entry.timestamp);
    });
  });

  describe('message serialization', () => {
    test('serializes non-string messages to JSON', () => {
      logger.log({ action: 'create', id: 42 });
      const entry = parseLastLog();
      expect(entry.message).toBe('{"action":"create","id":42}');
    });

    test('keeps string messages as-is', () => {
      logger.log('plain text');
      const entry = parseLastLog();
      expect(entry.message).toBe('plain text');
    });
  });

  describe('output format', () => {
    test('each log line is valid JSON', () => {
      logger.log('first');
      logger.warn('second');
      logger.error('third');
      expect(calls.length).toBe(3);
      for (const line of calls) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    test('output contains all required fields', () => {
      logger.log('check fields', 'TestContext');
      const entry = parseLastLog();
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('level');
      expect(entry).toHaveProperty('context');
      expect(entry).toHaveProperty('message');
    });
  });
});
