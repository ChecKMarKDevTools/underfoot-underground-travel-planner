import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';
import cspellPlugin from '@cspell/eslint-plugin';
import tseslint from 'typescript-eslint';

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
    'backend/src/services/cacheManagerService.js',
    'backend/src/services/supabaseService.js',
    'frontend/src/components/MessageBubble.tsx',
    'scripts/fix-github-admonitions.js',
  ]),
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      curly: ['error', 'all'],
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-warning-comments': ['error', { terms: ['eslint-disable'], location: 'anywhere' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="setInterval"]',
          message: 'Avoid using setInterval for polling. Consider a more efficient approach.',
        },
      ],
    },
  },

  {
    files: ['frontend/src/**/*.{js,jsx,ts,tsx}'],
    extends: [
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
      tseslint.configs.recommended,
    ],
    plugins: { react },
    settings: { react: { version: 'detect' } },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaVersion: 'latest', ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    rules: {
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
      'func-style': 'off',
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['frontend/src/__tests__/**/*', 'frontend/tests-e2e/**/*'],
    languageOptions: { globals: { ...globals.vitest, global: 'writable' } },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CatchClause',
          message:
            'Do not use catch statements in test files. Use expect(...).rejects or .toThrow() for error assertions.',
        },
      ],
      'no-unused-vars': ['off', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['backend/test/**/*.js', 'backend/test/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest, global: 'writable' } },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CatchClause',
          message:
            'Do not use catch statements in test files. Use expect(...).rejects or .toThrow() for error assertions.',
        },
      ],
      'no-unused-vars': ['off', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['backend/src/**/*.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-undef': 'off' },
  },
  { files: ['scripts/**/*'], languageOptions: { globals: { ...globals.node } } },
  { files: ['backend/src/index.js'], rules: { 'no-restricted-syntax': 'off' } },
  { files: ['cloudflare-worker/src/worker.js'], rules: { 'no-restricted-syntax': 'off' } },
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

  // Generic ignores/overrides
  {
    ignores: ['**/*.config.js', 'frontend/**/*', 'scripts/**/*'],
    rules: { 'func-style': ['error', 'expression', { allowArrowFunctions: true }] },
  },

  // CSpell plugin for selected files
  {
    files: ['frontend/src/**/*.{js,jsx,ts,tsx}', 'backend/src/**/*.{js,ts}', 'scripts/**/*.js'],
    plugins: { '@cspell': cspellPlugin },
    rules: {
      '@cspell/spellchecker': ['warn', { autoFix: true }],
    },
  },
  {
    files: ['frontend/src/services/mockGooglePlaces.ts'],
    rules: {
      '@cspell/spellchecker': 'off',
    },
  },
]);
