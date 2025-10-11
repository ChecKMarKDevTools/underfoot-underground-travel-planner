# Underfoot Python Backend

<p align="center">
  <img src="../frontend/public/favicon.png" alt="Underfoot logo" width="100" height="100" />
</p>

> 🐍 Python backend for Underfoot Underground Travel Planner, built for Cloudflare Workers with FastAPI

Blazingly fast, secure, and observable Python backend featuring structured logging, dual-layer caching, and AI-powered search orchestration.

## ✨ Features

- 🚀 **Edge Performance**: Deployed on Cloudflare Workers for <100ms cold starts
- 🔒 **Security First**: Input validation, rate limiting, XSS protection, secret management
- 📊 **Observability**: Structured JSON logging, request tracing, metrics collection
- 💾 **Dual-Layer Caching**: KV (edge, <1ms) + Supabase (persistent, queryable)
- 🤖 **AI Orchestration**: OpenAI for parsing and response generation
- 🌐 **Multi-Source Search**: SERP API, Reddit, Eventbrite integration
- ⚡ **Async Everything**: HTTPX for non-blocking I/O
- 🎯 **Type Safety**: Pydantic v2 for validation (5-50x faster)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         Cloudflare Workers (Python)          │
├─────────────────────────────────────────────┤
│ Framework:      FastAPI (ASGI)              │
│ HTTP Client:    httpx (async)               │
│ OpenAI:         openai-python (official)    │
│ Cache:          KV + Supabase               │
│ Logging:        structlog (structured)      │
│ Security:       Pydantic validation         │
│ Testing:        pytest + pytest-asyncio     │
└─────────────────────────────────────────────┘
```

## 📋 Prerequisites

- Python 3.11+
- Poetry (dependency management)
- Cloudflare account (for deployment)
- API keys (OpenAI, SERP, Reddit, Eventbrite, Geoapify)
- Supabase project (for caching)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Poetry (if not installed)
curl -sSL https://install.python-poetry.org | python3 -

# Install project dependencies
cd backend-python
poetry install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your API keys
vim .env
```

"""Underfoot Python Backend

This README documents how to run and test the backend service.
"""

# Underfoot Python Backend

<p align="center">
  <img src="../frontend/public/favicon.png" alt="Underfoot logo" width="100" height="100" />
</p>

> 🐍 Python backend for Underfoot Underground Travel Planner, built for Cloudflare Workers with FastAPI

Blazingly fast, secure, and observable Python backend featuring structured logging, dual-layer caching, and AI-powered search orchestration.

## ✨ Features

- 🚀 **Edge Performance**: Deployed on Cloudflare Workers for <100ms cold starts
- 🔒 **Security First**: Input validation, rate limiting, XSS protection, secret management
- 📊 **Observability**: Structured JSON logging, request tracing, metrics collection
- 💾 **Dual-Layer Caching**: KV (edge, <1ms) + Supabase (persistent, queryable)
- 🤖 **AI Orchestration**: OpenAI for parsing and response generation
- 🌐 **Multi-Source Search**: SERP API, Reddit, Eventbrite integration
- ⚡ **Async Everything**: HTTPX for non-blocking I/O
- 🎯 **Type Safety**: Pydantic v2 for validation (5-50x faster)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         Cloudflare Workers (Python)          │
├─────────────────────────────────────────────┤
│ Framework:      FastAPI (ASGI)              │
│ HTTP Client:    httpx (async)               │
│ OpenAI:         openai-python (official)    │
│ Cache:          KV + Supabase               │
│ Logging:        structlog (structured)      │
│ Security:       Pydantic validation         │
│ Testing:        pytest + pytest-asyncio     │
└─────────────────────────────────────────────┘
```

## 📋 Prerequisites

- Python 3.11+
- Poetry (dependency management)
- Cloudflare account (for deployment)
- API keys (OpenAI, SERP, Reddit, Eventbrite, Geoapify)
- Supabase project (for caching)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Poetry (if not installed)
curl -sSL https://install.python-poetry.org | python3 -

# Install project dependencies
cd backend
poetry install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your API keys
vim .env
```

### 3. Run Locally

```bash
# Activate virtual environment
poetry shell

# Run development server
uvicorn src.workers.chat_worker:app --reload --port 8000

# Or use wrangler for local development
wrangler dev
```

### 4. Test

```bash
# Run all tests with coverage
poetry run pytest

# Run specific test file
poetry run pytest tests/unit/test_services/test_openai_service.py

# Run with verbose output
poetry run pytest -v

# Generate coverage report (HTML)
poetry run pytest --cov=src --cov-report=html
```

## Run dev servers & tests (per-service)

Copy the appropriate `.env` files first (see `.env.example` in each service).

Front-end — dev server

```bash
cd frontend
npm install
npm run dev
```

Front-end — tests

```bash
cd frontend
npm install
npm test
# coverage report (frontend)
npm run test:coverage
```

Back-end — dev server

```bash
# Use the backend folder
cd backend
poetry install
poetry run uvicorn src.workers.chat_worker:app --reload --port 8000
```

Back-end — tests

```bash
cd backend
poetry install
poetry run pytest
# run with coverage
poetry run pytest --cov=src --cov-report=term-missing
```

Run both locally (from repo root)

```bash
# Option A: root script (if defined)
### Structured Logging

# Option B: manually open two terminals
cd frontend && npm run dev
cd backend && poetry run uvicorn src.workers.chat_worker:app --reload --port 8000
```

Notes

- Ensure `frontend/.env` and `backend/.env` are populated from their example files before starting.
- If VS Code can't resolve imports for the backend, select the Poetry interpreter in the Command Palette.

## 📦 Project Structure

```
backend/
├── src/
│   ├── workers/
│   │   └── chat_worker.py           # Main FastAPI application
│   ├── services/
│   │   ├── openai_service.py        # OpenAI integration
│   │   ├── geocoding_service.py     # Geoapify location normalization
│   │   ├── serp_service.py          # SERP API search
│   │   ├── reddit_service.py        # Reddit RSS integration
│   │   ├── eventbrite_service.py    # Eventbrite events
│   │   ├── scoring_service.py       # Result scoring & ranking
│   │   ├── cache_service.py         # Dual-layer caching
│   │   └── search_service.py        # Search orchestration
│   ├── models/
│   │   ├── request_models.py        # Pydantic request models
│   │   ├── response_models.py       # Pydantic response models
│   │   └── domain_models.py         # Domain entities
│   ├── middleware/
│   │   ├── tracing_middleware.py    # Request tracing
│   │   ├── cors_middleware.py       # CORS configuration
│   │   └── security_middleware.py   # Security headers
│   ├── utils/
│   │   ├── logger.py                # Structured logging
│   │   ├── errors.py                # Custom exceptions
│   │   └── metrics.py               # Metrics collection
│   └── config/
│       ├── settings.py              # Environment settings
│       └── constants.py             # Application constants
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── pyproject.toml                   # Poetry dependencies
├── wrangler.toml                    # Cloudflare Workers config
├── .env.example                     # Environment template
├── AGENTS.md                        # Development guidelines
└── README.md                        # This file
```

## 🔧 Configuration

### Environment Variables

Required environment variables (see `.env.example`):

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# External APIs
GEOAPIFY_API_KEY=...
SERPAPI_KEY=...
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
EVENTBRITE_TOKEN=...

# Supabase
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Application
ENVIRONMENT=development
LOG_LEVEL=INFO
CACHE_TTL_SECONDS=60
```

### Cloudflare Secrets

Set production secrets using Wrangler:

```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put GEOAPIFY_API_KEY
wrangler secret put SERPAPI_KEY
wrangler secret put REDDIT_CLIENT_ID
wrangler secret put REDDIT_CLIENT_SECRET
wrangler secret put EVENTBRITE_TOKEN
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## 🌐 API Endpoints

### Health Check

```bash
GET /health
```

Returns service health and dependency status.

### Search

```bash
POST /underfoot/search
Content-Type: application/json

{
  "chat_input": "hidden gems in Pikeville KY",
  "force": false
}
```

Returns AI-powered search results with location normalization and multi-source aggregation.

## 🚢 Deployment

### Deploy to Cloudflare Workers

```bash
# Login to Cloudflare
wrangler login

# Deploy to production
wrangler deploy

# Deploy to specific environment
wrangler deploy --env production
```

All logs are JSON-formatted for easy parsing:

```json
{
  "event": "search.complete",
  "request_id": "search_abc123def456",
  "elapsed_ms": 1234,
  "result_count": 8,
  "primary_count": 5,
  "nearby_count": 3,
  "timestamp": "2025-01-02T10:30:00Z"
}
```

### Metrics

Cloudflare Analytics automatically tracks:
- Request count by endpoint
- Response time distribution (P50, P90, P95, P99)
- Error rate by type
- Cache hit/miss ratio

### Alerts

Configure alerts in Cloudflare dashboard:
- Error rate >1% (5min window)
- P95 latency >1s (5min window)
- Cache hit rate <70% (15min window)

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
poetry run pytest tests/unit/

# Run with coverage
poetry run pytest tests/unit/ --cov=src/services
```

### Integration Tests

```bash
# Run integration tests
poetry run pytest tests/integration/
```

### End-to-End Tests

```bash
# Run e2e tests
poetry run pytest tests/e2e/
```

## 🔒 Security

- ✅ Input validation with Pydantic (XSS, injection prevention)
- ✅ Rate limiting (coming soon with KV-based sliding window)
- ✅ CORS strict allowlist
- ✅ Security headers (CSP, HSTS, X-Frame-Options)
- ✅ Secret management (environment variables + Cloudflare Secrets)
- ✅ Dependency vulnerability scanning (safety, bandit)

## 📈 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Cold Start | <100ms | TBD |
| Warm Response (chat) | <200ms | TBD |
| Warm Response (search) | <3s | TBD |
| Cache Hit Rate | >80% | TBD |
| P95 Latency | <500ms | TBD |
| Error Rate | <0.1% | TBD |

## 🤝 Contributing

1. Follow the guidelines in `AGENTS.md`
2. Write tests for all new features
3. Ensure coverage >85%
4. Run linting: `poetry run ruff check .`
5. Run type checking: `poetry run mypy src/`
6. Format code: `poetry run black .`

## 📄 License

See [LICENSE](../LICENSE) in the root directory.

---

**Built with ❤️ using FastAPI, Cloudflare Workers, and Python 3.11+**

_This document was generated with Verdent AI assistance._
