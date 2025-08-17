import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
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
    'prettier.config.cjs',
    '.remarkrc.cjs',
  ]),
  js.configs.recommended,
  {
    plugins: {
      '@cspell': cspellPlugin,
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      '@cspell/spellchecker': ['warn', { autoFix: true }],
      'no-warning-comments': ['error', { terms: ['eslint-disable'], location: 'anywhere' }],
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      semi: ['error', 'always'],
    },
  },
  {
    files: ['frontend/src/**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
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
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      'react/jsx-uses-react': 'off', // Not needed in React 17+
      'react/jsx-uses-vars': 'error', // Detects JSX usage of variables
      'react/prop-types': 'off', // Not using prop-types
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
    files: ['frontend/postcss.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['scripts/**/*', 'backend/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['eslint.config.js'],
    rules: {
      '@cspell/spellchecker': 'off',
    },
  },
]);
