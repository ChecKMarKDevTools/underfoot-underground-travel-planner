import request from 'supertest';
import { beforeAll, afterAll, test, expect, vi } from 'vitest';

// We will mock global fetch before importing the app so the route uses the mock.
const makeUpstream = (payload, status = 200) => ({ status, payload });

let upstream = makeUpstream({
  response: 'hi there',
  items: [{ id: '1', title: 'Mine', description: 'Old', url: 'https://example.com' }],
});

global.fetch = vi.fn(async () => {
  return {
    status: upstream.status,
    async text() {
      return JSON.stringify(upstream.payload);
    },
  };
});

beforeAll(async () => {
  await import('../src/index.js');
});

afterAll(async () => {
  // Server auto-shutdown handled by process exit in tests; nothing to close explicitly.
});

test('POST /underfoot/chat returns upstream response and debug object', async () => {
  const res = await request('http://localhost:3000')
    .post('/underfoot/chat')
    .send({ message: 'Hello' })
    .set('Content-Type', 'application/json');
  expect(res.status).toBe(200);
  expect(res.body.response).toBe('hi there');
  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body.debug).toBeDefined();
  expect(res.body.debug.requestId).toMatch(/^uf_/);
});

test('POST /underfoot/chat caches responses', async () => {
  // First request sets cache
  const first = await request('http://localhost:3000')
    .post('/underfoot/chat')
    .send({ message: 'Cache me' })
    .set('Content-Type', 'application/json');
  expect(first.status).toBe(200);
  expect(first.body.debug.cache).toBeUndefined();

  // Change upstream payload
  upstream = makeUpstream({ response: 'changed', items: [] });

  const second = await request('http://localhost:3000')
    .post('/underfoot/chat')
    .send({ message: 'Cache me' })
    .set('Content-Type', 'application/json');
  expect(second.status).toBe(200);
  // Should still be the cached version (not 'changed')
  expect(second.body.response).not.toBe('changed');
  expect(second.body.debug.cache).toBe('hit');
});

test('POST /underfoot/chat validates message', async () => {
  const res = await request('http://localhost:3000')
    .post('/underfoot/chat')
    .send({ message: '' })
    .set('Content-Type', 'application/json');
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/Message must be a non-empty string/);
});
