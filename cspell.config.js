import { defineConfig } from 'cspell';

export default defineConfig({
  version: '0.2',
  language: 'en',
  words: [
    // tech words
    'blockquotes',
    'checkmarkdevtools',
    'Pikeville',
    'Childress',
    'hackathon',
    'devto',
    'brightdata',
    // tools
    'vite',
    'vitest',
    'blocklist',
    'Avenir',
    'commitlint',
    'frontmatter',
    'substack',
    'endheader',
    'rollup',
    'pipefail',
    'wakatime',
    'SERP',
    'subflow',
    'subflows',
    'unlocker',
    'lefthook',
    // demo site hostnames
    'localblog',
    'indiecalendar',
    'historyclub',
    'indiecommunity',
    'railnerds',
    // demo content words
    'Creekside',
  ],
  ignorePaths: [
    '.vscode/**',
    '**/*.config.js',
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '*.tmp',
    '*.stitch',
  ],
});
