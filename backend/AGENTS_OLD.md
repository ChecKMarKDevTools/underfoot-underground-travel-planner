# Backend Development Notes

**Ashley Enterprise Edition** - Practical patterns for upgrades and maintenance.

## Quick Reference

### Stack
- Python 3.11+ with Poetry
- FastAPI for Cloudflare Workers
- Pydantic for contracts (function signatures)
- Structlog for JSON logging

### Commands
```bash
poetry run pytest                    # Run tests
poetry run uvicorn src.workers.chat_worker:app --reload  # Dev server
wrangler deploy                      # Deploy to Cloudflare
```

## Patterns

### Type Hints - Contract Level Only
```python
# ✅ Good - types at function signature (contract)
def score_result(result: SearchResult, intent: str) -> SearchResult:
    score = 0.0  # No type hint needed here
    text = f"{result.name}".lower()  # Duck typing
    return result

# ❌ Overkill - typing every variable
def score_result(result: SearchResult, intent: str) -> SearchResult:
    score: float = 0.0  # Unnecessary
    text: str = f"{result.name}".lower()  # Unnecessary
```

**Why?** IDE autocomplete works from function signatures. Internal variables are obvious from context.

### Structured Logging
```python
logger.info(
    "search.complete",
    request_id=request_id,
    elapsed_ms=elapsed,
    result_count=len(results)
)
```

**Reference**: [src/services/search_service.py](src/services/search_service.py) lines 145-154

### Error Handling
```python
try:
    results = await api_call()
except httpx.HTTPStatusError as e:
    logger.error("api.failed", status=e.response.status_code)
    return fallback_value
```

**Reference**: [src/services/geocoding_service.py](src/services/geocoding_service.py) lines 74-84

### Caching Pattern
```python
cached = await cache_service.get_cached_search_results(query, location)
if cached:
    return cached

result = await expensive_operation()
await cache_service.set_cached_search_results(query, location, result)
```

**Reference**: [src/services/search_service.py](src/services/search_service.py) lines 48-68

### Async HTTP Calls
```python
async with httpx.AsyncClient(timeout=httpx.Timeout(30)) as client:
    response = await client.get(url, params=params)
    response.raise_for_status()
    data = response.json()
```

**Reference**: [src/services/serp_service.py](src/services/serp_service.py) lines 35-40

### Pydantic Models - Validation at Edges
```python
class SearchRequest(BaseModel):
    chat_input: str = Field(min_length=1, max_length=500)
    force: bool = Field(default=False)
    
    @field_validator("chat_input")
    @classmethod
    def sanitize_input(cls, v: str) -> str:
        # XSS prevention
        return "".join(char for char in v if char.isprintable()).strip()
```

**Reference**: [src/models/request_models.py](src/models/request_models.py) lines 10-30

## Configuration

**Hard-coded** in `src/config/constants.py`:
- Timeouts, limits, model settings
- Intent keywords, sensitive keys list

**Environment variables** (`.env`) for **secrets only**:
- API keys (OpenAI, Google Maps, SERP, etc.)
- Supabase credentials

**Why?** No staging/prod environments = no need for env-based config switching.

## Testing

### Unit Tests - Core Logic
```python
@pytest.mark.asyncio
async def test_score_result():
    result = SearchResult(name="Hidden Bar", description="underground")
    scored = score_result(result, "hidden gems")
    assert scored.score > 0.5
```

**Reference**: [tests/unit/test_services/test_scoring_service.py](tests/unit/test_services/test_scoring_service.py)

### Mocking External APIs
```python
with patch.object(client.chat.completions, 'create', new_callable=AsyncMock) as mock:
    mock.return_value = mock_response
    result = await openai_service.parse_user_input("test")
```

**Reference**: [tests/unit/test_services/test_openai_service.py](tests/unit/test_services/test_openai_service.py) lines 11-25

## Common Gotchas

### Settings Load at Module Level
```python
# ⚠️ This runs when imported (breaks tests without .env)
settings = get_settings()
client = OpenAI(api_key=settings.openai_api_key)

# ✅ Lazy load instead
_client = None
def get_client():
    global _client
    if not _client:
        settings = get_settings()
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client
```

### Async All The Things
```python
# ❌ Blocking I/O kills performance
import requests
data = requests.get(url).json()

# ✅ Async for Cloudflare Workers
async with httpx.AsyncClient() as client:
    data = (await client.get(url)).json()
```

## Upgrading Dependencies

```bash
# Check for updates
poetry show --outdated

# Update specific package
poetry update fastapi

# Update all (carefully)
poetry update

# Lock file only (no install)
poetry lock --no-update
```

## When Things Break

1. **Import errors**: Check `conftest.py` and `sys.path`
2. **Settings validation**: Verify `.env` has all required keys
3. **Tests fail after upgrade**: Check for breaking changes in CHANGELOG
4. **Type errors**: Make sure you have type hints at contracts only

## Links to Examples

- **FastAPI patterns**: [src/workers/chat_worker.py](src/workers/chat_worker.py)
- **Service structure**: [src/services/](src/services/)
- **Pydantic models**: [src/models/](src/models/)
- **Testing patterns**: [tests/unit/](tests/unit/)

---

**Philosophy**: Code for yourself now, document for yourself in 6 months. Help others when they ask, not before.
