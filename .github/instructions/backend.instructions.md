---
applyTo: backend/**/*
---

def score_result(result: SearchResult, intent: str) -> SearchResult:
    score = 0.0  # No type hint
def score_result(result: SearchResult, intent: str) -> SearchResult:
    score: float = 0.0
tests/
├── unit/           # Core logic, mocked external deps
├── integration/    # Service interactions (planned)
└── e2e/           # Full pipeline (planned)

---
applyTo: backend/**/*
---

# Backend Instructions for Underfoot Underground Travel Planner

**Project Overview:**
Python FastAPI backend for underground travel planning. Orchestrates OpenAI, Google Maps, SerpAPI, Reddit, Eventbrite APIs. Runs on Cloudflare Workers.

**Tech & Constraints:**
- Python 3.12.11+, FastAPI (async/await), Poetry
- Black formatter, Ruff linter, type hints at function signatures
- Secrets via Pydantic settings (never leak in logs/responses)
- CORS restricted to allowed origins
- Testing: pytest, coverage ≥30%

**Architecture:**
- Entry: `src/workers/chat_worker.py` (SSE `/chat` endpoint)
- Services: openai_service, geocoding_service, serp_service, reddit_service, eventbrite_service, scoring_service, search_service, cache_service
- Models: request_models, response_models, domain_models (Pydantic)
- Config: settings.py (env), constants.py (hard-coded)
- Middleware: cors, security, tracing
- Utilities: logger, errors, metrics

**Endpoints:**
- `POST /chat`: parses, geocodes, tiered search, filters, ranks, composes reply, returns debug
- `POST /normalize-location`: geocodes location string
- `GET /health`: service health & dependency status

**Environment Variables:**
OPENAI_API_KEY, OPENAI_MODEL, DEFAULT_RADIUS_MILES, MAX_RADIUS_MILES, CACHE_TTL_SECONDS, SERPAPI_KEY, EVENTBRITE_TOKEN, REDDIT_CLIENT_ID, GOOGLE_MAPS_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

**Models & Validation:**
- Request: SearchRequest, NormalizeLocationRequest (Pydantic, input sanitization)
- Response: SearchResponse, DebugInfo, HealthResponse, ErrorResponse
- Domain: ParsedUserInput, SearchResult

**Code Quality Rules:**
- SonarQube: never use equality with floats, use tolerance (see python:S1244)
- Prefer composition, pure functions, async/await for I/O
- Custom exceptions inherit UnderfootError

**Development Patterns:**
- Link to existing code, don't duplicate
- Type hints only on function signatures
- All I/O async (use httpx, never requests)
- Structured logging with context (request_id, timings, result_count)
- Catch specific exceptions, log errors, provide fallbacks

**Caching:**
- Key: `{location}|{start_date}|{end_date}|{vibe}|{radius_bucket}`
- TTL: configurable via CACHE_TTL_SECONDS
- Bypass: `force=true` skips cache
- Backend: in-memory dict (dev), Redis-ready

**Security:**
- Sanitize inputs (strip HTML/script tags, normalize whitespace)
- Validate with Pydantic
- Blocklist mainstream domains (TripAdvisor, Yelp, Facebook, Instagram)
- CORS middleware
- Never expose stack traces or secrets to clients

**Performance & Cost:**
- One OpenAI call per `/chat` (batch ranking)
- Cap per-source: 6 candidates max
- Skip tiers if A yields 4-6 items
- Use cost-efficient model (`gpt-4o-mini`)

**Logging:**
- Generate request_id per request
- Structured JSON logging
- Redact secrets automatically
- Don't log full prompts
- Track execution_time_ms, token_usage, retry_counts, cache_hit_rate

**Testing:**
- Coverage ≥30% (enforced in CI)
- Unit: models, utils, services (mocked)
- Integration: external APIs, tiered search, retry/backoff
- All tests use mocked API keys

**Common Tasks:**
- Add service: create file, add settings/constants, add tests, wire into orchestration
- Add endpoint: define models, add route, add tests
- Update dependencies: poetry show --outdated, poetry update

**Troubleshooting:**
- Import errors: check conftest.py, Python version
- Settings errors: check .env, typos
- Test failures: check changelogs, update mocks, verify type hints
- Cloudflare: check dependencies, wrangler.toml, env vars

**Key Files:**
- chat_worker.py, search_service.py, openai_service.py, domain_models.py, settings.py, constants.py, conftest.py, pyproject.toml, wrangler.toml

**Definition of Done:**
- `/chat` returns 4–6 items
- Debug payload complete
- Coverage ≥30%, all tests passing
- Passes ruff, black, pytest
- No secrets in logs/responses
- Conventional commit messages
- Ready for Cloudflare deployment

**Philosophy:**
Code for yourself now, document for yourself in 6 months. Type hints at contracts only. Structured logging. Test core logic, mock external deps. Link to code, don't duplicate. Config in constants unless secret.
