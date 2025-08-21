import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';
import cspellPlugin from '@cspell/eslint-plugin';

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
  ]),
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
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
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
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
    files: ['backend/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
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
    plugins: {
      '@cspell': cspellPlugin,
    },
    rules: {
      '@cspell/spellchecker': ['warn', { autoFix: true }],
      'no-warning-comments': ['error', { terms: ['eslint-disable'], location: 'anywhere' }],
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
    },
  },
]);
