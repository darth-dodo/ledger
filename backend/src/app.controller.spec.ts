import { describe, test, expect } from 'vitest';
import { AppController } from './app.controller';

describe('AppController', () => {
  test('should be defined', () => {
    const controller = new AppController();
    expect(controller).toBeDefined();
  });

  test('getRoot should return "Ledger API"', () => {
    const controller = new AppController();
    expect(controller.getRoot()).toBe('Ledger API');
  });
});
