import request from 'supertest';
import { beforeAll, afterAll, test, expect } from 'vitest';

beforeAll(async () => {
  // Dynamically import the server file so it starts listening
  const mod = await import('../src/index.js');
  // Express listen returns the server instance; we can't access app directly, so we re-fetch via mod if exported
  server = mod?.default?.server || mod.server || null; // Fallback if later we export something
  // For supertest we can wrap the URL if server not exported; simpler: create a fresh express instance is not desired.
  // Instead, rely on known PORT.
});

// NOTE: Do not close the server here. Other test files depend on the shared
// server instance (we run tests in a single process for stability). Closing it
// would cause connection errors in subsequent tests.
afterAll(async () => {
  /* intentionally left blank */
});

test('GET /health returns ok true', async () => {
  const res = await request('http://localhost:3000').get('/health');
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  expect(res.body.cache).toHaveProperty('size');
});
