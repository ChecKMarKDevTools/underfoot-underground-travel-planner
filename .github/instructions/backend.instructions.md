---
applyTo: backend/**/*
---

# Copilot Instructions for Backend

> ��️ **Underfoot Backend** — single-agent orchestrator for "underground" travel picks.
> ⚙️ Python 3.12+, FastAPI, Poetry. One OpenAI batch call.
> 🎯 Goal: reliably return **4–6** items with **Near(ish) By** + rich debug.

---

## Tech & Constraints

- 🐍 **Runtime:** Python 3.12.11+
- 🚀 **Framework:** FastAPI with async/await
- 📦 **Package Manager:** Poetry
- 🧪 **Testing:** pytest with coverage ≥30% threshold
- 🎨 **Style:** Black formatter, Ruff linter, type hints encouraged
- 🔑 **Secrets:** Environment variables via Pydantic settings. Never leak in logs/responses.
- 🌐 **CORS:** Restrict to allowed origins only

---

## Code Quality Rules

### SonarQube Compliance

- ⚠️ **python:S1244** — Never use equality (`==`, `!=`) with floats. Use tolerance-based comparison:
  ```python
  # ❌ BAD
  if score == 0.5:
  
  # ✅ GOOD
  if abs(score - 0.5) < 0.0001:
  # or use math.isclose()
  if math.isclose(score, 0.5, rel_tol=1e-9):
  ```

### Python Best Practices

- Use Pydantic `BaseModel` for request/response validation
- Prefer composition over inheritance
- Keep functions pure where possible (no side effects)
- Async/await for I/O operations (OpenAI, external APIs, cache)
- Custom exceptions inherit from `UnderfootError` base class

---

## Project Structure

```
backend/
├── src/
│   ├── config/          # Settings, constants
│   ├── middleware/      # CORS, security, tracing
│   ├── models/          # Pydantic models (request/response/domain)
│   ├── services/        # OpenAI, geocoding, scoring, search, cache
│   ├── utils/           # Errors, logger, validators, sanitizers
│   └── workers/         # Main chat worker orchestration
├── tests/
│   ├── unit/            # Fast isolated tests
│   └── integration/     # External service mocks
└── pyproject.toml       # Poetry config + pytest settings
```

---

## Endpoints

### `POST /chat`

**Input**

```json
{
  "message": "Pikeville KY next week for 3 days, outdoors",
  "limit": 5,
  "force": false
}
```

**Process**

1. 📝 **Parse** via OpenAI → `{ location, start_date, end_date, vibe }`
2. 📍 **Geocode** location to lat/lon
3. 🔍 **Tiered search** (A: 10mi → B: 20mi → C: 40mi)
   - Stop when ≥4 candidates found
4. 🧹 **Filter + dedupe** (blocklist, name/URL dedup)
5. 🧠 **Rank** with single OpenAI batch call
6. 💬 **Compose** reply in Underfoot voice
7. 📊 Return structured response + debug payload

**Output**

```json
{
  "reply": "Here's what I found...",
  "places": [...],
  "debug": {
    "request_id": "uf_...",
    "execution_time_ms": 1234,
    "parsed": {...},
    "radius_core": 10,
    "radius_used": 20,
    "counts": {...},
    "errors": [],
    "cache": "hit|miss"
  }
}
```

### `POST /normalize-location`

Geocodes location string to standardized format with lat/lon.

### `GET /health`

Returns service health + dependency status.

---

## Environment Variables

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
DEFAULT_RADIUS_MILES=10
MAX_RADIUS_MILES=40
CACHE_TTL_SECONDS=86400  # 24h prod, 60s dev
SERPAPI_KEY=...          # Optional: SERP search
EVENTBRITE_TOKEN=...     # Optional: events
REDDIT_CLIENT_ID=...     # Optional: Reddit posts
```

---

## Models & Validation

### Request Models (`src/models/request_models.py`)

- `SearchRequest`: message (5-500 chars), limit (1-10), force (bool)
- `NormalizeLocationRequest`: location string, optional confidence threshold
- Input sanitization via Pydantic validators (strip HTML, normalize whitespace)

### Response Models (`src/models/response_models.py`)

- `SearchResponse`: reply, places[], debug
- `DebugInfo`: request_id, execution_time_ms, cache, parsed, counts, errors
- `HealthResponse`: status, timestamp, elapsed_ms, dependencies, version
- `ErrorResponse`: error, message, request_id, timestamp, context

### Domain Models (`src/models/domain_models.py`)

- `ParsedUserInput`: location, start_date, end_date, vibe
- `SearchResult`: name, description, url, source, distance_miles, score

---

## Error Handling

### Custom Exceptions (`src/utils/errors.py`)

- `UnderfootError` — Base with status_code, error_code, context
- `ValidationError` — 400 for bad input
- `RateLimitError` — 429 with retry_after
- `UpstreamError` — 502 for external API failures
- `CacheError` — 500 for cache operations

### Retry Logic

- �� Exponential backoff: 2s → 4s → 8s
- 🚦 Retry on 429/5xx from external APIs
- 📊 Track retry counts in `debug.retries`

---

## Caching (`src/services/cache_service.py`)

- 🗝️ **Key:** `{location}|{start_date}|{end_date}|{vibe}|{radius_bucket}`
- ⏱️ **TTL:** Configurable via `CACHE_TTL_SECONDS`
- 🔄 **Bypass:** `force=true` skips cache
- 💾 **Backend:** In-memory dict (dev), Redis-ready interface

---

## Security

- 🧽 **Sanitization:** Strip HTML/script tags, normalize whitespace (`input_sanitizer.py`)
- ✅ **Validation:** Pydantic models enforce length/format constraints (`input_validator.py`)
- 🚫 **Blocklist:** Filter mainstream domains (TripAdvisor, Yelp, Facebook, Instagram)
- 🔐 **CORS:** Middleware enforces allowed origins
- 🛑 **Error Responses:** Never expose stack traces or secrets to clients

---

## Performance & Cost

- 🎯 **One OpenAI call** per `/chat` request (batch ranking)
- 📦 **Cap per-source:** 6 candidates max before filtering
- ⏭️ **Skip tiers:** Stop search if A tier yields 4-6 items
- 💸 **Model choice:** `gpt-4o-mini` for cost efficiency

---

## Logging (`src/utils/logger.py`)

- 🆔 Generate `request_id` per request (format: `uf_{timestamp}_{random}`)
- 📊 Structured JSON logging with timings
- 🔒 **Redact secrets** automatically (OpenAI keys, tokens)
- 🚫 Don't log full prompts (only summaries/hashes)
- 📈 Track: execution_time_ms, token_usage, retry_counts, cache_hit_rate

---

## Testing

### Coverage Requirements

- 🎯 **Threshold:** 30% minimum (enforced in CI)
- 📊 **Current:** 31.46% (passing)
- 🧪 Run: `poetry run pytest --cov=src --cov-report=term-missing`

### Test Structure

- **Unit** (`tests/unit/`):
  - Models: Pydantic validation, field requirements
  - Utils: Errors, logger, validators, sanitizers
  - Services: Scoring, OpenAI parsing (mocked)
  
- **Integration** (`tests/integration/`):
  - Mock external APIs (OpenAI, SERP, Eventbrite, Reddit)
  - Test tiered search logic
  - Verify retry/backoff behavior

### Test Scenarios

- ✅ Valid input parsing
- ❌ Invalid input rejection (too short, too long, dangerous chars)
- 🔄 Tier progression (A insufficient → B → C)
- 🚫 Blocklist filtering
- 🔁 Retry on 429/5xx with backoff
- 💾 Cache hit/miss/force bypass
- 🧮 Floating-point comparisons use tolerance (python:S1244)

---

## Definition of Done

- 🏁 `/chat` returns **4–6** items consistently
- 🕵️ Debug payload complete (timings, counts, cache status, retries)
- 📊 Coverage ≥30% with all tests passing
- 🧹 Passes: `ruff check`, `black --check`, `pytest`
- 🔒 No secrets in logs or responses
- 📝 Conventional commit messages
- 🚀 Ready for Cloudflare Workers deployment
