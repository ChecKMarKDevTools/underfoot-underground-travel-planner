export default {
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  tabWidth: 2,
  proseWrap: 'preserve',
  useTabs: false,
  overrides: [
    {
      files: '**/*.json',
      options: {
        parser: 'json',
        printWidth: 100,
        proseWrap: 'preserve',
        bracketSpacing: true,
        trailingComma: 'none',
      },
    },
    {
      files: '**/*.yaml,**/*.yml',
      options: {
        parser: 'yaml',
        printWidth: 120,
        proseWrap: 'preserve',
        bracketSpacing: true,
        singleQuote: true,
      },
    },
  ],
};
