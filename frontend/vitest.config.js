import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    globals: true,
  include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  exclude: ['node_modules/**', 'tests-e2e/**', 'dist/**'],
    coverage: {
      enabled: true,
      reporter: ['text', 'json', 'html'],
      provider: 'v8',
      include: ['src/**/*.jsx'],
      thresholds: {
        lines: 85,
        statements: 85,
        branches: 80,
        functions: 85,
      },
    },
  },
});
