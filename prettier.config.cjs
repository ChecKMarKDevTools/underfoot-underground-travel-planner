module.exports = {
  printWidth: 100,
  singleQuote: true,
  jsxSingleQuote: true,
  trailingComma: 'all',
  tabWidth: 2,
  proseWrap: 'preserve',
  useTabs: false,
  semi: true,
  overrides: [
    {
      files: '**/*.json',
      options: {
        parser: 'json',
        printWidth: 100,
        proseWrap: 'preserve',
        bracketSpacing: true,
        trailingComma: 'none',
        singleQuote: false,
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
