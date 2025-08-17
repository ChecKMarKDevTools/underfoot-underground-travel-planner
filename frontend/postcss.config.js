// During unit tests (Vitest) we skip Tailwind's PostCSS transform to avoid
// requiring the runtime PostCSS plugin or extra packages. This keeps tests
// fast and avoids transform-time errors in the test environment.
const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test');

export default () => ({
  plugins: isTest
    ? {
        // keep autoprefixer so basic CSS is still processed if needed
        autoprefixer: {},
      }
    : {
        tailwindcss: {},
        autoprefixer: {},
      },
});
