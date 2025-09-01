import request from 'supertest';
import { beforeAll, test, expect, vi } from 'vitest';

// Mock upstream
let upstreamPayload = { response: 'streamed hello', items: [{ id: 'a', title: 'Alpha' }] };
let upstreamStatus = 200;

global.fetch = vi.fn(async () => {
  return {
    status: upstreamStatus,
    async text() {
      return JSON.stringify(upstreamPayload);
    },
  };
});

let app;
beforeAll(async () => {
  const mod = await import('../src/index.js');
  app = mod.app || mod.default?.app;
});

// Simple SSE parser for test: collects events until end
const parseSSE = (raw) => {
  const events = [];
  let current = { event: 'message', data: [] };
  raw.split(/\n/).forEach((line) => {
    if (line.startsWith('event: ')) {
      current.event = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      current.data.push(line.slice(6));
    } else if (line.trim() === '') {
      if (current.data.length) {
        events.push({ event: current.event, data: current.data.join('\n') });
      }
      current = { event: 'message', data: [] };
    }
  });
  return events;
};

test('GET /underfoot/chat?stream=true returns start, complete, end events', async () => {
  const res = await request(app).get('/underfoot/chat').query({ message: 'Hi', stream: 'true' });
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/text\/event-stream/);
  const events = parseSSE(res.text);
  const names = events.map((e) => e.event);
  expect(names).toContain('start');
  expect(names).toContain('complete');
  expect(names).toContain('end');
  const complete = events.find((e) => e.event === 'complete');
  const payload = JSON.parse(complete.data);
  expect(payload.response).toBe('streamed hello');
  expect(Array.isArray(payload.items)).toBe(true);
});

test('SSE cache replay emits cacheHit true on second call', async () => {
  // First call seeds cache
  await request(app).get('/underfoot/chat').query({ message: 'CacheThis', stream: 'true' });
  const res2 = await request(app)
    .get('/underfoot/chat')
    .query({ message: 'CacheThis', stream: 'true' });
  const events = parseSSE(res2.text);
  const startEvt = events.find((e) => e.event === 'start');
  const startData = JSON.parse(startEvt.data);
  expect(startData.cacheHit).toBe(true);
});
