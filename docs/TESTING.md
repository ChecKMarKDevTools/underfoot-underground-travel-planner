# Testing Guide

## Quick Start

```bash
# Run all tests (backend + frontend with coverage)
npm test

# Frontend only
npm run test:frontend

# Backend only
npm run test:backend
```

## Frontend Tests

**Location**: `frontend/test/`

- **Unit** (10 files, 133 tests): Components, hooks, services, utils
- **Integration** (1 file, 8 tests): Full app flow
- **Performance** (1 file, 10 tests): Render benchmarks

**Coverage**: 94.57% (threshold: 80%)

### Frontend Commands

```bash
cd frontend

npm test              # All tests with coverage (default)
npm run test:watch    # Watch mode
npm run test:ui       # Interactive UI
```

## Backend Tests

**Location**: `backend/test/`

- Unit tests
- E2E tests

## Coverage

Coverage runs by default on all `npm test` commands.

**Excluded from coverage**:

- Bootstrap files (`main.tsx`)
- Type definitions
- Real API clients (mocked in tests)
- Complex third-party integrations (e.g., `MapView.tsx`)

## TODO

- [ ] Frontend E2E tests (browser automation with Playwright)
