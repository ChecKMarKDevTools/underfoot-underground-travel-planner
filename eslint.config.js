import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import namingPlugin from 'eslint-plugin-naming';
import cspellPlugin from '@cspell/eslint-plugin';

export default defineConfig([
  globalIgnores(['dist', '**/*.md', '**/*.mmd', '**/.env*', '.gitignore', 'package.json', 'package-lock.json']),
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    ignores: ['**/*.config.js'],
    plugins: {
      '@cspell': cspellPlugin,
      naming: namingPlugin,
    },
    rules: {
      '@cspell/spellchecker': ['warn', { autoFix: true }],
      'no-warning-comments': ['error', { terms: ['eslint-disable'], location: 'anywhere' }],
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'naming/case': ['error', 'kebab'],
    },
  },
  {
    files: ['test/**/*', '*test*'],
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
]);
