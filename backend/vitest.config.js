import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Ensure tests run in a single process so that the Express server listening on a fixed
// port (3000) is shared across all test files. This avoids race conditions and
// premature shutdown issues when individual test files attempt to close the server.
export default defineConfig({
  test: {
    threads: false, // run in-band
    isolate: true, // fresh module graph per test file
  },
});
