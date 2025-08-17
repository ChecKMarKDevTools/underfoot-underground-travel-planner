import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['node_modules/**', 'dist/**'],
    setupFiles: [],
    coverage: {
      enabled: true,
      reporter: ['text', 'json', 'html'],
      provider: 'v8',
      include: ['src/**/*.js'],
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 70,
        functions: 80,
      },
    },
  },
});
