import request from 'supertest';
import { beforeAll, afterAll, test, expect } from 'vitest';

beforeAll(async () => {
  await import('../src/index.js');
});

afterAll(async () => {});

test('GET /health returns ok true', async () => {
  const res = await request('http://localhost:3000').get('/health');
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  expect(res.body.cache).toHaveProperty('size');
});
