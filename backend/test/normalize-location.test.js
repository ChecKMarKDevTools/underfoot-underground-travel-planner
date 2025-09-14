import request from 'supertest';
import { beforeAll, afterAll, test, expect, vi } from 'vitest';

let calls = 0;
let geoPayload = {
  features: [
    {
      properties: {
        city: 'Paris',
        state: 'Île-de-France',
        country: 'France',
        rank: { confidence: 0.95 },
        lat: 48.8566,
        lon: 2.3522,
      },
    },
  ],
};

global.fetch = vi.fn(async (url) => {
  if (url.includes('geoapify')) {
    calls += 1;
  }
  return {
    status: 200,
    async text() {
      return JSON.stringify(geoPayload);
    },
  };
});

let app;
beforeAll(async () => {
  process.env.GEOAPIFY_API_KEY = 'test-key';
  const mod = await import('../src/index.js');
  app = mod.app || mod.default?.app;
});

afterAll(async () => {});

test('POST /underfoot/normalize-location returns normalized location', async () => {
  const res = await request(app)
    .post('/underfoot/normalize-location')
    .send({ input: 'paris' })
    .set('Content-Type', 'application/json');
  expect(res.status).toBe(200);
  expect(res.body.normalized.toLowerCase()).toContain('paris');
  expect(res.body.confidence).toBeGreaterThan(0.5);
  expect(res.body.debug).toBeDefined();
});

test('POST /underfoot/normalize-location caches responses', async () => {
  const first = await request(app)
    .post('/underfoot/normalize-location')
    .send({ input: 'paris' })
    .set('Content-Type', 'application/json');
  expect(first.body.debug.cache).toBeUndefined();
  expect(calls).toBeGreaterThanOrEqual(1);

  // Change upstream to different city; cache should hide change
  geoPayload = {
    features: [
      {
        properties: {
          city: 'Changed City',
          country: 'Nowhere',
          rank: { confidence: 0.5 },
        },
      },
    ],
  };

  const second = await request(app)
    .post('/underfoot/normalize-location')
    .send({ input: 'paris' })
    .set('Content-Type', 'application/json');
  expect(second.body.debug.cache).toBe('hit');
  expect(second.body.normalized.toLowerCase()).toContain('paris');
  expect(calls).toBeLessThanOrEqual(2);
});

test('POST /underfoot/normalize-location validates input', async () => {
  const res = await request(app)
    .post('/underfoot/normalize-location')
    .send({ input: '' })
    .set('Content-Type', 'application/json');
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/input must be a non-empty string/);
});

test('POST /underfoot/normalize-location handles upstream error gracefully', async () => {
  geoPayload = { message: 'err' };
  global.fetch.mockImplementationOnce(async () => ({
    status: 500,
    async text() {
      return JSON.stringify({ error: 'server error' });
    },
  }));
  const res = await request(app)
    .post('/underfoot/normalize-location')
    .send({ input: 'london' })
    .set('Content-Type', 'application/json');
  expect(res.status).toBe(200);
  expect(res.body.debug.fallback).toBe(true);
});
