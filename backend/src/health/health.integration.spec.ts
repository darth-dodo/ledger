import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HealthModule } from './health.module';

describe('Health Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  test('GET /health returns 200 with correct shape', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });

  test('timestamp is a valid ISO-8601 string', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    const parsed = new Date(response.body.timestamp);
    expect(parsed.toISOString()).toBe(response.body.timestamp);
  });

  test('uptime is a non-negative number', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThanOrEqual(0);
  });
});
