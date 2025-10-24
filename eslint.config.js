import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/*.md',
    '**/*.mmd',
    '**/.env*',
    '.gitignore',
    'package.json',
    'package-lock.json',
    'frontend/coverage/**',
    'frontend/playwright-report/**',
    'frontend/test-results/**',
    'supabase/functions/**',
    '.worktrees/**',
    '**/.worktrees/**',
    'frontend/screenshot.js',
    'frontend/vitest.setup.js',
  ]),
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      // Additional base rules beyond js.configs.recommended
      curly: ['error', 'all'],
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['frontend/src/**/*.{js,jsx}'],
    extends: [reactHooks.configs['recommended-latest'], reactRefresh.configs.vite],
    plugins: {
      react,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'react/jsx-uses-react': 'off', // Not needed in React 17+
      'react/jsx-uses-vars': 'error', // Detects JSX usage of variables
    },
  },
  {
    files: ['frontend/src/__tests__/**/*', 'frontend/tests-e2e/**/*'],
    languageOptions: {
      globals: {
        ...globals.vitest,
        global: 'writable',
      },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CatchClause',
          message:
            'Do not use catch statements in test files. Use expect(...).rejects or .toThrow() for error assertions.',
        },
      ],
      // Allow unused vars in tests (helpers, parameter documentation, etc.).
      'no-unused-vars': [
        'off',
        {
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['scripts/**/*'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['cloudflare-worker/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        crypto: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        TransformStream: 'readonly',
        ReadableStream: 'readonly',
        WritableStream: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
  {
    files: ['backend/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['backend/test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
        global: 'writable',
      },
    },
  },
  {
    ignores: ['**/*.config.js', 'frontend/**/*', 'scripts/**/*'],
    rules: {
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
    },
  },
  {
    files: ['frontend/src/**/*.{js,jsx}', 'backend/src/**/*.js', 'scripts/**/*.js'],
    rules: {
      'no-warning-comments': ['error', { terms: ['eslint-disable'], location: 'anywhere' }],
    },
  },
]);
