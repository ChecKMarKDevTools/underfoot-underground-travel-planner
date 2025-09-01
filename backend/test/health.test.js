import request from 'supertest';
import { beforeAll, afterAll, test, expect } from 'vitest';

beforeAll(async () => {
  // Importing the module starts the shared server (side effect of index.js)
  await import('../src/index.js');
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
