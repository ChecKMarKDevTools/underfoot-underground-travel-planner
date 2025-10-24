---
applyTo: frontend/**/*
---

# Frontend Instructions

Quirky, offbeat React 18 + Vite interface for underground travel planning. Chat interface, Debug View, and transparent troubleshooting.

## Language & Syntax

ES2020+ with ES6 syntax. TypeScript is present and fine to maintain, but prefer duck typing. Keep type annotations minimal.

## Tech Stack

- React 18, Vite, Tailwind CSS, Node 24+.
- Source: `frontend/src/` (App.jsx, main.jsx, components/*)

## Security

### Application

- Never expose API keys or secrets in frontend code
- Sanitize all user inputs before rendering
- Use environment variables via `VITE_` prefix
- Validate external data sources
- CSP headers and HTTPS-only in production

### User Privacy

- **Zero logging** of user queries, locations, or personal data
- **Zero storage** beyond session memory
- **Zero tracking** without explicit consent
- All geolocation data is ephemeral
- No third-party tracking by default

### Data Handling

- Keep user interactions in-memory only
- Clear sensitive data on unmount
- Never persist location data to localStorage without consent
- Redact API keys from debug panels

## Design Philosophy

Follow KISS, YAGNI, and maintain modularity. One component, one responsibility. Build what's needed, not what might be needed. Keep coupling loose, cohesion high.

## Code Standards

```javascript
// Imports: external first, internal second
import { useState } from 'react';
import { CustomHook } from '../hooks/useCustom';

export function Component({ prop1, prop2 }) {
  const [state, setState] = useState();
  const handleEvent = () => {};
  return <div />;
}
```

### Naming

- Components: PascalCase
- Hooks: camelCase with `use` prefix
- Utils/Services: camelCase
- Constants: `UPPER_SNAKE_CASE`

### Linting & Formatting

- ESLint and Prettier enforced via lefthook pre-commit hooks.
- All code/markdown must pass before commit.

## Testing

Test value, not lines. Focus on critical paths and user interactions, not implementation details.

### Coverage Targets

- Critical features (auth, payment, data submission): 90%+
- User flows (navigation, forms, interactions): 80%+
- UI components (rendering, props, states): 60%+
- Utils/Services (business logic): 80%+

### Unit Testing

- Vitest + React Testing Library + jsdom.
- Tests: `frontend/src/__tests__/unit/` (unit), `frontend/src/__tests__/integration/` (integration)
- Coverage: lines/statements/functions ≥85%, branches ≥80% (enforced in CI).
- Run: `npm run test` (runs both unit and integration).
- UI: `npm run test:ui`.
- Coverage prints to console by default.

### End-to-End Testing

- Playwright (Chromium).
- Tests: `frontend/tests-e2e/`
- Config: `frontend/playwright.config.js` (baseURL matches Vite base).
- Reporter: list + HTML (auto-opens on failure locally).
- Trace/video/screenshots on failure.
- Run: `npm run test:e2e` (headless), `npx playwright test --headed` (headed), `npx playwright test --ui` (UI runner).
- Open last HTML report: `npm run test:e2e:report`

### Mocking Backend for E2E

- Playwright e2e tests intercept `/chat` requests and return mocked data, so tests pass without a backend.
- When backend is ready, remove/disable route mocks for full integration.

## Dependencies

Before adding:

1. Solvable with existing dependencies?
2. Value vs. code size?
3. Actively maintained (commits in last 6 months)?
4. Known vulnerabilities?
5. Can we write it in under 100 lines?

Justify all additions.

## Performance

- Bundle under 200KB (gzipped)
- Initial load under 2s (3G)
- Interactive in under 3s
- Lighthouse score above 90

Lazy load, debounce, cache, batch. Memo only when profiled.

## Accessibility

- Keyboard navigable
- ARIA labels on custom controls
- WCAG AA contrast ratios
- Visible focus indicators
- Screen reader tested
- Respect motion preferences

## Code Changes

- Must be reviewed in playwright before commit
- Ensure unit tests exist with adequate coverage that makes sense
- Avoid coding tests just to add numbers
- Document a ../docs/user_guide with screenshots using the playwright MCP
- Review these screenshots to make sure they are accurate and clear
- If anything looks off, then you should fix it first and then update
- It is not enough to simply lazy load the default home page. You need to send messages, click map controls, look at debug info, switch the view, and verify all interactive elements function correctly.

## Code Review

- [ ] No secrets exposed
- [ ] No user data logged/stored
- [ ] Security addressed
- [ ] Accessibility met
- [ ] Tests add value
- [ ] Dependencies justified
- [ ] Performance measured
- [ ] KISS/YAGNI followed

## Anti-Patterns

- Storing user data without consent
- Logging sensitive information
- Premature optimization
- Testing implementation details
- Over-engineering
- Unnecessary dependencies
- Breaking accessibility for aesthetics

## CI/CD

- Workflow: `.github/workflows/ci.yml`
- Node 22+, npm cache, lint, unit tests (coverage upload), Playwright e2e, Playwright report artifact.

## Local Dev Quick Reference

```bash
# Install all deps (repo root)
npm install --ignore-scripts

# Run unit/integration tests with coverage (frontend)
cd frontend
npm run test

# Open Vitest coverage HTML report
npm run test:coverage:report

# Run e2e tests (frontend)
npx playwright install --with-deps chromium
npm run test:e2e

# Open last Playwright HTML report
npm run test:e2e:report

# Interactive test runners
npm run test:ui         # Vitest UI
npx playwright test --ui # Playwright UI
```

## Conventions

- All new code must pass lint, format, spell, and test coverage gates.
- Use Conventional Commits for all commit messages.
- If you change Vite base, update Playwright config baseURL.
- For more e2e coverage, add tests to `frontend/tests-e2e/` and mock backend as needed.
