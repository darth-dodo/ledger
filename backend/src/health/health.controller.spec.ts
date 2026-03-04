import { describe, test, expect } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  test('should be defined', () => {
    const controller = new HealthController();
    expect(controller).toBeDefined();
  });

  test('getHealth returns status ok', () => {
    const controller = new HealthController();
    const result = controller.getHealth();

    expect(result.status).toBe('ok');
  });

  test('getHealth returns a valid ISO timestamp', () => {
    const controller = new HealthController();
    const result = controller.getHealth();

    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });

  test('getHealth returns uptime as a number', () => {
    const controller = new HealthController();
    const result = controller.getHealth();

    expect(typeof result.uptime).toBe('number');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });
});
