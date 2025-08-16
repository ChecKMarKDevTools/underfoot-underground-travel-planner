---
applyTo: frontend/**
---

# Underfoot UI — Frontend Guide

- Quirky, offbeat React 18 + Vite interface for underground travel planning.
- Chat interface, Debug View, and transparent troubleshooting.

## Tech Stack
- React 18, Vite, Tailwind CSS, Node 24+.
- Source: `frontend/src/` (App.jsx, main.jsx, components/*)

## Linting, Formatting, Spelling
- ESLint, Prettier, CSpell enforced via lefthook pre-commit hooks.
- All code/markdown must pass before commit.

## Unit Testing
- Vitest + React Testing Library + jsdom.
- Tests: `frontend/src/__tests__/unit/` (unit), `frontend/src/__tests__/integration/` (integration)
- Coverage: lines/statements/functions ≥85%, branches ≥80% (enforced in CI).
- Run: `npm run test` (runs both unit and integration).
- UI: `npm run test:ui`.
- Coverage prints to console by default.

## End-to-End Testing
- Playwright (Chromium).
- Tests: `frontend/tests-e2e/`
- Config: `frontend/playwright.config.js` (baseURL matches Vite base).
- Reporter: list + HTML (auto-opens on failure locally).
- Trace/video/screenshots on failure.
- Run: `npm run test:e2e` (headless), `npx playwright test --headed` (headed), `npx playwright test --ui` (UI runner).
- Open last HTML report: `npm run test:e2e:report`

## CI/CD
- Workflow: `.github/workflows/ci.yml`
- Node 22+, npm cache, lint, unit tests (coverage upload), Playwright e2e, Playwright report artifact.

## Mocking Backend for E2E
- Playwright e2e tests intercept `/chat` requests and return mocked data, so tests pass without a backend.
- When backend is ready, remove/disable route mocks for full integration.

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

---

<!-- This file is auto-applied to the frontend folder via `.github/instructions/` for Copilot and contributor guidance. -->
