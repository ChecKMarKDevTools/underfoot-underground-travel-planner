import globals from 'globals';
import pluginJs from '@eslint/js';
import cspellPlugin from '@cspell/eslint-plugin';
import namingPlugin from 'eslint-plugin-naming';

export default [
  {
    // Ignore markdown and environment files; remark handles markdown and .env are non-code
    ignores: ['**/*.md', '**/*.mmd', '**/.env*', '.gitignore', 'package.json', 'package-lock.json'],
  },
  {
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2024,
      sourceType: 'module',
    },
  },
  pluginJs.configs.recommended,
  {
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
];
