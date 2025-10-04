# Backend Agent Guide

**Underfoot Underground Travel Planner** - Python backend for discovering hidden underground experiences.

## Project Overview

This is a FastAPI-based backend designed to run on Cloudflare Workers. It orchestrates multiple external APIs (OpenAI, Google Maps, SerpAPI, Reddit, Eventbrite) to help users discover underground attractions, hidden gems, and local experiences.

**User Flow:**
1. User enters natural language query: "hidden bars in Pikeville KY"
2. OpenAI parses intent and location
3. System searches multiple sources (Google Places, Reddit, Eventbrite)
4. Results are scored based on "underground" relevance
5. OpenAI generates narrative response with ranked recommendations

## Architecture

### Entry Point
- **`src/workers/chat_worker.py`** - FastAPI app with SSE streaming endpoint `/chat`
- Handles CORS, security headers, request validation
- Orchestrates the entire search pipeline

### Core Services (`src/services/`)

| Service | Purpose | External Dependency |
|---------|---------|-------------------|
| `openai_service.py` | Parse user input, generate responses | OpenAI GPT-4 |
| `geocoding_service.py` | Normalize locations to coordinates | Google Maps Geocoding API |
| `serp_service.py` | Search Google Places | SerpAPI |
| `reddit_service.py` | Find Reddit discussions | Reddit API |
| `eventbrite_service.py` | Discover local events | Eventbrite API |
| `scoring_service.py` | Rank results by relevance | *(internal)* |
| `search_service.py` | Orchestrate multi-source search | *(internal)* |
| `cache_service.py` | In-memory caching with TTL | *(internal)* |

### Data Models (`src/models/`)

- **`request_models.py`** - API request schemas (Pydantic validation)
- **`response_models.py`** - API response schemas (SSE events)
- **`domain_models.py`** - Internal data structures (ParsedInput, SearchResult, etc.)

### Configuration (`src/config/`)

- **`settings.py`** - Environment-based settings (API keys, Supabase credentials)
- **`constants.py`** - Hard-coded config (timeouts, model names, keywords)

### Utilities (`src/utils/`)

- **`logger.py`** - Structured JSON logging with structlog
- **`errors.py`** - Custom exception classes
- **`metrics.py`** - Performance tracking

### Middleware (`src/middleware/`)

- **`cors_middleware.py`** - CORS headers for frontend
- **`security_middleware.py`** - Security headers (CSP, X-Frame-Options)
- **`tracing_middleware.py`** - Request ID tracking and timing

## Development Patterns

### File References (Don't Duplicate Code)

When helping with code, **link to existing implementations** instead of copying:

```markdown
See caching pattern in `src/services/search_service.py:48-68`
```

### Type Hints Strategy

**Contract-level only** - type hints on function signatures, not internal variables:

```python
# ✅ Good
def score_result(result: SearchResult, intent: str) -> SearchResult:
    score = 0.0  # No type hint
    
# ❌ Overkill  
def score_result(result: SearchResult, intent: str) -> SearchResult:
    score: float = 0.0
```

**Why?** IDE autocomplete works from signatures. Internal types are obvious from context.

### Async Everything

All I/O must be async for Cloudflare Workers:

```python
# ✅ Use httpx (async)
async with httpx.AsyncClient() as client:
    response = await client.get(url)

# ❌ Never use requests (blocking)
import requests  # Don't do this
```

### Logging Pattern

Structured logging with context:

```python
logger.info(
    "search.complete",
    request_id=request_id,
    elapsed_ms=elapsed,
    result_count=len(results)
)
```

See: `src/services/search_service.py:145-154`

### Error Handling

Catch specific exceptions, log structured errors, provide fallbacks:

```python
try:
    results = await api_call()
except httpx.HTTPStatusError as e:
    logger.error("api.failed", status=e.response.status_code)
    return fallback_value
```

See: `src/services/geocoding_service.py:74-84`

## Testing Strategy

### Test Structure

```
tests/
├── unit/           # Core logic, mocked external deps
├── integration/    # Service interactions (planned)
└── e2e/           # Full pipeline (planned)
```

### Running Tests

```bash
# All tests
poetry run pytest

# Specific test file
poetry run pytest tests/unit/test_services/test_scoring_service.py

# With coverage
poetry run pytest --cov=src --cov-report=html
```

### Test Environment

- **`tests/conftest.py`** - Global fixtures, mocked env vars
- All tests use mocked API keys (no real API calls in unit tests)

### Mocking External APIs

```python
with patch.object(client.chat.completions, 'create', new_callable=AsyncMock) as mock:
    mock.return_value = mock_response
    result = await openai_service.parse_user_input("test")
```

See: `tests/unit/test_services/test_openai_service.py:11-25`

## Configuration

### Environment Variables (`.env`)

**Secrets only:**
- `OPENAI_API_KEY` - OpenAI GPT-4
- `GOOGLE_MAPS_API_KEY` - Google Maps Geocoding
- `SERPAPI_KEY` - SerpAPI for Google Places
- `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` - Reddit API
- `EVENTBRITE_TOKEN` - Eventbrite API
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` - Supabase

### Hard-Coded Config (`src/config/constants.py`)

**Application settings:**
- API timeouts, retry limits
- Intent keywords ("hidden", "underground", "secret")
- Scoring weights
- Cache TTLs

**Why separate?** No staging/prod environments = no need for env-based config switching.

## Common Tasks

### Adding a New Service

1. Create `src/services/new_service.py`
2. Add settings to `src/config/settings.py` (if needs API key)
3. Add constants to `src/config/constants.py` (if needs config)
4. Create unit tests in `tests/unit/test_services/test_new_service.py`
5. Wire into `src/services/search_service.py` orchestration

### Adding a New API Endpoint

1. Define request/response models in `src/models/`
2. Add route to `src/workers/chat_worker.py`
3. Add integration tests (when implemented)

### Updating Dependencies

```bash
# Check for updates
poetry show --outdated

# Update specific package
poetry update fastapi

# Update all (test thoroughly)
poetry update
```

## Troubleshooting

### Import Errors
- Check `tests/conftest.py` has all required env vars mocked
- Verify Python 3.12+ is being used (see `pyproject.toml`)

### Settings Validation Errors
- Verify `.env` has all keys from `src/config/settings.py`
- Check for typos in env var names (case-insensitive)

### Tests Fail After Dependency Update
- Check package CHANGELOG for breaking changes
- Update mocks to match new API signatures
- Verify type hints still align with library types

### Cloudflare Deployment Issues
- Ensure all dependencies are compatible with Workers runtime
- Check `wrangler.toml` configuration
- Verify environment variables are set in Cloudflare dashboard

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/workers/chat_worker.py` | FastAPI app entry point |
| `src/services/search_service.py` | Main orchestration logic |
| `src/services/openai_service.py` | LLM integration |
| `src/models/domain_models.py` | Core data structures |
| `src/config/settings.py` | Environment configuration |
| `src/config/constants.py` | Application constants |
| `tests/conftest.py` | Test fixtures and mocks |
| `pyproject.toml` | Python dependencies |
| `wrangler.toml` | Cloudflare Workers config |

## Philosophy

> **Code for yourself now, document for yourself in 6 months.**

- Type hints at contracts (function signatures) only
- Structured logging for debugging in production
- Test core logic, mock external dependencies
- Link to existing code, don't duplicate
- Configuration in constants unless it's a secret

---

**For AI Agents:** This project prioritizes:
1. **Async operations** - Everything uses `async/await` for Cloudflare Workers
2. **Structured logging** - All events logged with context for debugging
3. **Type safety at edges** - Pydantic validates all external input
4. **Fail gracefully** - Fallbacks for external API failures
5. **Reference over duplication** - Link to existing patterns instead of repeating code
