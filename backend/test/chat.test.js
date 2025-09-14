import request from 'supertest';
import { beforeAll, afterAll, beforeEach, test, expect, vi } from 'vitest';

const makeUpstream = (payload, status = 200) => ({ status, payload });

let upstream = makeUpstream({
  response: 'hi there',
  items: [{ id: '1', title: 'Mine', description: 'Old', url: 'https://example.com' }],
});

const searchResults = {};
global.fetch = vi.fn(async (url, options) => {
  const urlObj = new URL(url);
  if (urlObj.pathname === '/underfoot/search') {
    const body = JSON.parse(options.body);
    const cacheKey = body.chatInput.trim().toLowerCase();

    if (searchResults[cacheKey]) {
      return {
        status: 200,
        ok: true,
        async json() {
          return searchResults[cacheKey];
        },
      };
    }

    const result = {
      ...upstream.payload,
      debug: { requestId: 'search_123', upstreamCalled: true },
    };
    searchResults[cacheKey] = result;

    return {
      status: upstream.status,
      ok: upstream.status < 400,
      async json() {
        return result;
      },
    };
  }

  return {
    status: upstream.status,
    async text() {
      return JSON.stringify(upstream.payload);
    },
    async json() {
      return upstream.payload;
    },
  };
});

let app;
beforeAll(async () => {
  const mod = await import('../src/index.js');
  app = mod.app || mod.default?.app;
});

beforeEach(async () => {
  upstream = makeUpstream({
    response: 'hi there',
    items: [{ id: '1', title: 'Mine', description: 'Old', url: 'https://example.com' }],
  });

  Object.keys(searchResults).forEach((key) => delete searchResults[key]);

  await request(app).delete('/admin/cache');
});

afterAll(async () => {});

test('POST /underfoot/chat returns upstream response and debug object', async () => {
  const res = await request(app)
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
  const first = await request(app)
    .post('/underfoot/chat')
    .send({ message: 'Cache me' })
    .set('Content-Type', 'application/json');
  expect(first.status).toBe(200);
  expect(first.body.debug.cache).toBeUndefined();

  upstream = makeUpstream({ response: 'changed', items: [] });

  const second = await request(app)
    .post('/underfoot/chat')
    .send({ message: 'Cache me' })
    .set('Content-Type', 'application/json');
  expect(second.status).toBe(200);
  expect(second.body.response).not.toBe('changed');
  expect(second.body.debug.cache).toBe('hit');
});

test('POST /underfoot/chat validates message', async () => {
  const res = await request(app)
    .post('/underfoot/chat')
    .send({ message: '' })
    .set('Content-Type', 'application/json');
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/Message must be a non-empty string/);
});
