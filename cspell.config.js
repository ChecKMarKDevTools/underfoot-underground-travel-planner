import { defineConfig } from 'cspell';

export default defineConfig({
  version: '0.2',
  language: 'en',
  dictionaryDefinitions: [
    {
      name: 'project-words',
      path: './.vscode/cspell-project-words.txt',
    },
  ],
  dictionaries: ['project-words'],
  ignorePaths: [
    '.vscode/**',
    '**/*.config.js',
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '*.tmp',
  ],
});
