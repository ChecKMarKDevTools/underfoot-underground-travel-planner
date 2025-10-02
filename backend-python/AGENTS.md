# Python Backend Development Guidelines

## Mission

Build a blazingly fast, secure, observable Python backend for Cloudflare Workers that embodies production-grade engineering: structured logging, defense-in-depth security, comprehensive observability, and sub-200ms response times.

## Core Principles

1. **Speed First**: Every millisecond counts at the edge
2. **Security by Default**: Never trust, always validate
3. **Observable Everything**: If it's not logged, it didn't happen
4. **Fail Gracefully**: Errors are data, not disasters
5. **Type Safety**: Pydantic everywhere, runtime validation always

## Language & Style

### Python Version
- **Target**: Python 3.11+ (Cloudflare Workers runtime)
- **Features**: Use modern syntax (match/case, type hints, async/await)
- **Compatibility**: No platform-specific dependencies

### Code Style
```python
# Imports: stdlib → third-party → local
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime, UTC

import httpx
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel, Field, validator

from services.openai_service import parse_user_input
from utils.logger import get_logger

logger = get_logger(__name__)

# Type hints everywhere
async def fetch_data(url: str, timeout: int = 30) -> Dict[str, Any]:
    """Fetch data with timeout and structured error handling.
    
    Args:
        url: Target URL to fetch
        timeout: Request timeout in seconds
        
    Returns:
        Parsed JSON response
        
    Raises:
        HTTPException: On request failure
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except httpx.TimeoutException:
            logger.error("request.timeout", url=url, timeout=timeout)
            raise HTTPException(status_code=504, detail="Upstream timeout")
```

### Naming Conventions
- **Modules/Packages**: `snake_case` (e.g., `openai_service.py`)
- **Classes**: `PascalCase` (e.g., `SearchRequest`)
- **Functions/Variables**: `snake_case` (e.g., `parse_user_input`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- **Private**: `_leading_underscore` (e.g., `_internal_helper`)
- **Type Variables**: `T`, `K`, `V` (generic) or descriptive (e.g., `RequestT`)

## Security: Defense in Depth

### Input Validation
```python
from pydantic import BaseModel, Field, validator, constr
from typing import Annotated

class SearchRequest(BaseModel):
    """Search request with comprehensive validation."""
    
    chat_input: Annotated[str, constr(min_length=1, max_length=500)] = Field(
        ..., 
        description="User search query"
    )
    force: bool = Field(default=False, description="Force cache bypass")
    
    @validator('chat_input')
    def sanitize_input(cls, v: str) -> str:
        """Sanitize input to prevent injection attacks."""
        # Remove control characters
        sanitized = ''.join(char for char in v if char.isprintable())
        # Strip dangerous patterns
        dangerous_patterns = ['<script', 'javascript:', 'onerror=']
        for pattern in dangerous_patterns:
            if pattern in sanitized.lower():
                raise ValueError(f"Potentially dangerous input: {pattern}")
        return sanitized.strip()
    
    class Config:
        # Strict mode: fail on unknown fields
        extra = 'forbid'
```

### Secret Management
```python
# ❌ NEVER DO THIS
api_key = "sk-abc123..."

# ✅ ALWAYS DO THIS
import os
from functools import lru_cache

@lru_cache(maxsize=1)
def get_openai_key() -> str:
    """Get OpenAI API key from environment.
    
    Raises:
        RuntimeError: If key is missing
    """
    key = os.environ.get('OPENAI_API_KEY')
    if not key:
        raise RuntimeError("OPENAI_API_KEY not configured")
    return key

# Use in code
client = OpenAI(api_key=get_openai_key())
```

### Security Checklist (Every Endpoint)
- [ ] Input validated with Pydantic
- [ ] Output sanitized (no raw user content)
- [ ] Rate limiting applied
- [ ] Authentication checked (if required)
- [ ] CORS headers configured
- [ ] Errors don't leak secrets
- [ ] Logging excludes sensitive data

### Rate Limiting
```python
from datetime import datetime, timedelta
from typing import Optional

async def check_rate_limit(
    client_ip: str, 
    limit: int = 100, 
    window_seconds: int = 60
) -> Optional[dict]:
    """KV-based sliding window rate limiting.
    
    Args:
        client_ip: Client IP address
        limit: Max requests per window
        window_seconds: Time window in seconds
        
    Returns:
        None if allowed, error dict if rate limited
    """
    kv = env.RATE_LIMIT_KV
    key = f"rl:{client_ip}"
    
    # Get current count
    current = await kv.get(key, type="json") or {"count": 0, "reset": 0}
    now = datetime.now(UTC).timestamp()
    
    # Reset window if expired
    if now >= current["reset"]:
        current = {
            "count": 1, 
            "reset": now + window_seconds
        }
        await kv.put(key, json.dumps(current), expiration=window_seconds)
        return None
    
    # Increment and check limit
    current["count"] += 1
    if current["count"] > limit:
        logger.warning(
            "rate_limit.exceeded",
            client_ip=client_ip,
            count=current["count"],
            limit=limit
        )
        return {
            "error": "Rate limit exceeded",
            "retry_after": int(current["reset"] - now)
        }
    
    await kv.put(key, json.dumps(current), expiration=window_seconds)
    return None
```

## Structured Logging

### Setup
```python
# utils/logger.py
import structlog
import logging
from typing import Any, Dict

def setup_logging(level: str = "INFO") -> None:
    """Configure structured logging for Cloudflare Workers."""
    
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, level.upper()),
    )

def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)
```

### Usage Patterns
```python
logger = get_logger(__name__)

# ✅ Structured events (preferred)
logger.info(
    "search.start",
    request_id=request_id,
    user_input=input_text[:100],  # Truncate PII
    source_ip=client_ip
)

# ✅ With timing context
start = time.perf_counter()
try:
    results = await search_service.execute(query)
    logger.info(
        "search.complete",
        request_id=request_id,
        elapsed_ms=int((time.perf_counter() - start) * 1000),
        result_count=len(results),
        cache_hit=cache_hit,
        sources=list(results.keys())
    )
except Exception as e:
    logger.error(
        "search.failed",
        request_id=request_id,
        elapsed_ms=int((time.perf_counter() - start) * 1000),
        error_type=type(e).__name__,
        error_msg=str(e),
        exc_info=True  # Include stack trace
    )
    raise

# ✅ Security events
logger.warning(
    "auth.failed",
    request_id=request_id,
    reason="invalid_token",
    client_ip=client_ip,
    attempted_endpoint="/underfoot/search"
)

# ❌ Avoid unstructured logging
logger.info(f"User {user_id} searched for {query}")  # Hard to parse
```

### Log Levels
- **DEBUG**: Detailed internal state (disabled in production)
- **INFO**: Normal operations (requests, responses, cache hits)
- **WARNING**: Degraded state (rate limits, fallbacks, retries)
- **ERROR**: Recoverable errors (API failures, validation errors)
- **CRITICAL**: Service failures (database down, config missing)

### Sensitive Data Handling
```python
# ❌ NEVER log these
logger.info("user.login", password=password)  # NEVER
logger.info("api.call", api_key=api_key)      # NEVER

# ✅ Always redact
def redact_secrets(data: Dict[str, Any]) -> Dict[str, Any]:
    """Redact sensitive fields from log data."""
    sensitive_keys = {'password', 'api_key', 'token', 'secret', 'credit_card'}
    return {
        k: '***REDACTED***' if k.lower() in sensitive_keys else v
        for k, v in data.items()
    }

logger.info("api.request", **redact_secrets(request_data))
```

## Observability

### Request Tracing
```python
from contextvars import ContextVar
from uuid import uuid4

# Request context
request_id_var: ContextVar[str] = ContextVar('request_id', default='')

def generate_request_id() -> str:
    """Generate unique request ID."""
    return f"uf_{uuid4().hex[:12]}"

async def trace_request(request: Request, call_next):
    """Middleware to add request tracing."""
    request_id = request.headers.get('X-Request-ID') or generate_request_id()
    request_id_var.set(request_id)
    
    # Bind to all logs in this request
    logger = get_logger(__name__).bind(request_id=request_id)
    
    start = time.perf_counter()
    try:
        response = await call_next(request)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        
        logger.info(
            "request.complete",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            elapsed_ms=elapsed_ms,
            user_agent=request.headers.get('User-Agent', 'unknown')[:100]
        )
        
        response.headers['X-Request-ID'] = request_id
        response.headers['X-Response-Time'] = str(elapsed_ms)
        return response
        
    except Exception as e:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        logger.error(
            "request.failed",
            method=request.method,
            path=request.url.path,
            elapsed_ms=elapsed_ms,
            error_type=type(e).__name__,
            error_msg=str(e),
            exc_info=True
        )
        raise
```

### Metrics Collection
```python
from dataclasses import dataclass, asdict
from typing import Dict, List
from collections import defaultdict

@dataclass
class Metric:
    """Performance metric."""
    name: str
    value: float
    unit: str
    tags: Dict[str, str]
    timestamp: float

class MetricsCollector:
    """Collect and emit metrics for observability."""
    
    def __init__(self):
        self.metrics: List[Metric] = []
        self.counters: Dict[str, int] = defaultdict(int)
    
    def timing(self, name: str, value: float, **tags):
        """Record timing metric in milliseconds."""
        self.metrics.append(Metric(
            name=name,
            value=value,
            unit="ms",
            tags=tags,
            timestamp=time.time()
        ))
    
    def counter(self, name: str, value: int = 1, **tags):
        """Increment counter metric."""
        key = f"{name}:{','.join(f'{k}={v}' for k, v in tags.items())}"
        self.counters[key] += value
    
    def flush(self):
        """Emit all metrics and clear buffer."""
        for metric in self.metrics:
            logger.info(
                "metric.timing",
                metric_name=metric.name,
                value=metric.value,
                unit=metric.unit,
                **metric.tags
            )
        
        for key, count in self.counters.items():
            name, tags_str = key.split(':', 1)
            tags = dict(tag.split('=') for tag in tags_str.split(','))
            logger.info(
                "metric.counter",
                metric_name=name,
                count=count,
                **tags
            )
        
        self.metrics.clear()
        self.counters.clear()

# Usage
metrics = MetricsCollector()

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    
    metrics.timing(
        "http.request.duration",
        elapsed,
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    )
    metrics.counter(
        "http.request.count",
        endpoint=request.url.path,
        status=response.status_code
    )
    
    return response
```

### Health Checks
```python
from fastapi import FastAPI, Response
from typing import Dict, Any

async def check_dependencies() -> Dict[str, Any]:
    """Check all external dependencies."""
    checks = {}
    
    # OpenAI
    try:
        await openai_service.health_check()
        checks['openai'] = {'status': 'healthy'}
    except Exception as e:
        checks['openai'] = {'status': 'unhealthy', 'error': str(e)}
    
    # Supabase
    try:
        await cache_service.ping()
        checks['supabase'] = {'status': 'healthy'}
    except Exception as e:
        checks['supabase'] = {'status': 'unhealthy', 'error': str(e)}
    
    # KV
    try:
        await env.CACHE_KV.get('health_check')
        checks['kv'] = {'status': 'healthy'}
    except Exception as e:
        checks['kv'] = {'status': 'unhealthy', 'error': str(e)}
    
    return checks

@app.get('/health')
async def health(response: Response):
    """Comprehensive health check endpoint."""
    start = time.perf_counter()
    
    dependencies = await check_dependencies()
    all_healthy = all(
        dep['status'] == 'healthy' 
        for dep in dependencies.values()
    )
    
    health_data = {
        'status': 'healthy' if all_healthy else 'degraded',
        'timestamp': datetime.now(UTC).isoformat(),
        'elapsed_ms': int((time.perf_counter() - start) * 1000),
        'dependencies': dependencies,
        'version': os.environ.get('VERSION', 'unknown')
    }
    
    if not all_healthy:
        response.status_code = 503
        logger.warning("health.degraded", **health_data)
    
    return health_data
```

## Performance Optimization

### Async Everywhere
```python
# ❌ Blocking I/O (kills edge performance)
import requests
response = requests.get(url)

# ✅ Async I/O (non-blocking)
import httpx
async with httpx.AsyncClient() as client:
    response = await client.get(url)
```

### Connection Pooling
```python
from httpx import AsyncClient, Limits, Timeout

# Reuse client across requests
_http_client: Optional[AsyncClient] = None

def get_http_client() -> AsyncClient:
    """Get shared HTTP client with connection pooling."""
    global _http_client
    
    if _http_client is None:
        _http_client = AsyncClient(
            limits=Limits(
                max_connections=100,
                max_keepalive_connections=20
            ),
            timeout=Timeout(30.0, connect=5.0),
            http2=True  # Enable HTTP/2
        )
    
    return _http_client
```

### Caching Strategy
```python
from typing import Optional, TypeVar, Callable
from functools import wraps

T = TypeVar('T')

def dual_cache(
    kv_ttl: int = 60,
    supabase_ttl: int = 1800
) -> Callable:
    """Dual-layer caching decorator.
    
    Layer 1: KV (fast, edge-replicated, short TTL)
    Layer 2: Supabase (persistent, queryable, long TTL)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            # Generate cache key
            cache_key = f"{func.__name__}:{hash((args, tuple(kwargs.items())))}"
            
            # Layer 1: KV check (sub-millisecond)
            kv_result = await env.CACHE_KV.get(cache_key, type="json")
            if kv_result:
                logger.debug("cache.hit", layer="kv", key=cache_key)
                return kv_result
            
            # Layer 2: Supabase check (few milliseconds)
            supabase_result = await cache_service.get(cache_key)
            if supabase_result:
                logger.debug("cache.hit", layer="supabase", key=cache_key)
                # Populate KV for next time
                await env.CACHE_KV.put(
                    cache_key, 
                    json.dumps(supabase_result),
                    expiration_ttl=kv_ttl
                )
                return supabase_result
            
            # Cache miss: execute function
            logger.debug("cache.miss", key=cache_key)
            result = await func(*args, **kwargs)
            
            # Write to both layers
            await asyncio.gather(
                env.CACHE_KV.put(
                    cache_key,
                    json.dumps(result),
                    expiration_ttl=kv_ttl
                ),
                cache_service.set(cache_key, result, ttl=supabase_ttl)
            )
            
            return result
        
        return wrapper
    return decorator

# Usage
@dual_cache(kv_ttl=60, supabase_ttl=1800)
async def normalize_location(raw_input: str) -> dict:
    """Geocode location (cached for 1min in KV, 30min in Supabase)."""
    # ... expensive geocoding logic
```

### Batch API Calls
```python
async def fetch_all_sources(
    location: str, 
    intent: str
) -> Dict[str, List[Dict]]:
    """Fetch from all data sources in parallel."""
    
    start = time.perf_counter()
    
    # Execute all API calls concurrently
    results = await asyncio.gather(
        serp_service.search(location, intent),
        reddit_service.search(location, intent),
        eventbrite_service.search(location, [intent]),
        return_exceptions=True  # Don't fail all if one fails
    )
    
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(
        "sources.fetch_all",
        elapsed_ms=elapsed,
        sources=["serp", "reddit", "eventbrite"],
        success_count=sum(1 for r in results if not isinstance(r, Exception))
    )
    
    # Process results
    return {
        'serp': results[0] if not isinstance(results[0], Exception) else [],
        'reddit': results[1] if not isinstance(results[1], Exception) else [],
        'eventbrite': results[2] if not isinstance(results[2], Exception) else [],
    }
```

### Response Compression
```python
from fastapi.responses import Response
import gzip

class CompressedJSONResponse(Response):
    """JSON response with gzip compression."""
    
    def __init__(self, content: Any, **kwargs):
        json_content = json.dumps(content).encode('utf-8')
        
        # Compress if >1KB
        if len(json_content) > 1024:
            compressed = gzip.compress(json_content, compresslevel=6)
            super().__init__(
                compressed,
                media_type='application/json',
                headers={'Content-Encoding': 'gzip'},
                **kwargs
            )
        else:
            super().__init__(
                json_content,
                media_type='application/json',
                **kwargs
            )
```

## Error Handling

### Custom Exceptions
```python
# utils/errors.py
from typing import Dict, Any, Optional

class UnderfootError(Exception):
    """Base exception for all Underfoot errors."""
    
    def __init__(
        self, 
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_ERROR",
        **context
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.context = context
        super().__init__(message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict."""
        return {
            'error': self.error_code,
            'message': self.message,
            'context': self.context
        }

class ValidationError(UnderfootError):
    """Input validation failed."""
    def __init__(self, message: str, **context):
        super().__init__(message, 400, "VALIDATION_ERROR", **context)

class RateLimitError(UnderfootError):
    """Rate limit exceeded."""
    def __init__(self, retry_after: int, **context):
        super().__init__(
            "Rate limit exceeded",
            429,
            "RATE_LIMIT_EXCEEDED",
            retry_after=retry_after,
            **context
        )

class UpstreamError(UnderfootError):
    """External API failed."""
    def __init__(self, service: str, **context):
        super().__init__(
            f"{service} service unavailable",
            502,
            "UPSTREAM_ERROR",
            service=service,
            **context
        )
```

### Error Handler
```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(UnderfootError)
async def underfoot_error_handler(request: Request, exc: UnderfootError):
    """Handle custom exceptions with structured logging."""
    
    logger.error(
        "request.error",
        error_code=exc.error_code,
        error_msg=exc.message,
        status_code=exc.status_code,
        path=request.url.path,
        method=request.method,
        **exc.context
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            **exc.to_dict(),
            'request_id': request_id_var.get(),
            'timestamp': datetime.now(UTC).isoformat()
        }
    )

@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    """Catch-all error handler for unexpected exceptions."""
    
    logger.critical(
        "request.unhandled_exception",
        error_type=type(exc).__name__,
        error_msg=str(exc),
        path=request.url.path,
        method=request.method,
        exc_info=True
    )
    
    # Never leak internal errors to clients
    return JSONResponse(
        status_code=500,
        content={
            'error': 'INTERNAL_ERROR',
            'message': 'An unexpected error occurred',
            'request_id': request_id_var.get(),
            'timestamp': datetime.now(UTC).isoformat()
        }
    )
```

## Testing

### Test Structure
```
tests/
├── unit/
│   ├── test_services/
│   │   ├── test_openai_service.py
│   │   ├── test_cache_service.py
│   │   └── test_scoring_service.py
│   ├── test_models/
│   │   ├── test_request_models.py
│   │   └── test_response_models.py
│   └── test_utils/
│       ├── test_logger.py
│       └── test_errors.py
├── integration/
│   ├── test_chat_worker.py
│   └── test_search_worker.py
└── e2e/
    └── test_flows.py
```

### Test Patterns
```python
# tests/unit/test_services/test_openai_service.py
import pytest
from unittest.mock import AsyncMock, patch
from services.openai_service import parse_user_input

@pytest.mark.asyncio
async def test_parse_user_input_success():
    """Test successful input parsing."""
    mock_response = {
        'location': 'Pikeville, KY',
        'intent': 'hidden gems'
    }
    
    with patch('services.openai_service.openai_client') as mock_client:
        mock_client.chat.completions.create = AsyncMock(
            return_value=MockCompletion(mock_response)
        )
        
        result = await parse_user_input("hidden gems in Pikeville KY")
        
        assert result['location'] == 'Pikeville, KY'
        assert result['intent'] == 'hidden gems'
        assert result['confidence'] >= 0.8

@pytest.mark.asyncio
async def test_parse_user_input_fallback():
    """Test fallback when OpenAI fails."""
    with patch('services.openai_service.openai_client') as mock_client:
        mock_client.chat.completions.create = AsyncMock(
            side_effect=Exception("API error")
        )
        
        result = await parse_user_input("hidden gems in Pikeville KY")
        
        # Should fall back to heuristic parsing
        assert result['location'] == 'Pikeville KY'
        assert result['confidence'] < 0.7

@pytest.fixture
def mock_cache():
    """Mock cache service."""
    with patch('services.cache_service') as mock:
        mock.get = AsyncMock(return_value=None)
        mock.set = AsyncMock(return_value=True)
        yield mock
```

### Coverage Requirements
- **Critical paths**: 90%+ (auth, payment, data integrity)
- **Services**: 85%+ (business logic)
- **Models**: 80%+ (validation rules)
- **Utilities**: 80%+ (helpers, formatters)
- **Overall**: 85%+ minimum

### Performance Tests
```python
import pytest
import time
from locust import HttpUser, task, between

class UnderfootLoadTest(HttpUser):
    """Load test for Underfoot API."""
    wait_time = between(1, 3)
    
    @task(3)
    def search_cached(self):
        """Test cached search (most common)."""
        self.client.post(
            "/underfoot/search",
            json={"chatInput": "hidden gems in Portland OR"}
        )
    
    @task(1)
    def search_uncached(self):
        """Test fresh search."""
        self.client.post(
            "/underfoot/search",
            json={
                "chatInput": f"weird spots in Seattle {time.time()}",
                "force": True
            }
        )

# Run: locust -f tests/performance/test_load.py --host=https://underfoot.workers.dev
```

## Code Review Checklist

Before submitting PR:

- [ ] All secrets in environment variables (never hardcoded)
- [ ] Input validation with Pydantic on all endpoints
- [ ] Structured logging with context (request_id, elapsed_ms)
- [ ] Error handling with custom exceptions
- [ ] Rate limiting applied to public endpoints
- [ ] CORS configured correctly
- [ ] Tests written (unit + integration)
- [ ] Coverage >85% on new code
- [ ] Type hints on all functions
- [ ] Docstrings on public APIs
- [ ] No blocking I/O (async everywhere)
- [ ] Security checklist passed
- [ ] Performance targets met (<200ms P95)
- [ ] Observability hooks in place

## Anti-Patterns (Avoid These)

### ❌ Blocking I/O
```python
# Bad: blocks event loop
import requests
response = requests.get(url)
```

### ❌ Unstructured Logging
```python
# Bad: hard to parse, no context
print(f"User {user_id} did thing")
logger.info(f"Request took {elapsed}ms")
```

### ❌ Leaking Secrets
```python
# Bad: secret in logs
logger.error(f"API call failed with key {api_key}")
```

### ❌ Weak Validation
```python
# Bad: no validation, injection risk
@app.post("/search")
async def search(input: str):
    results = await db.query(f"SELECT * FROM places WHERE name LIKE '%{input}%'")
```

### ❌ Swallowing Errors
```python
# Bad: silent failure
try:
    await dangerous_operation()
except:
    pass
```

### ❌ Premature Optimization
```python
# Bad: complex caching before profiling
@lru_cache(maxsize=10000)
def rarely_called_function():
    ...
```

## Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Pydantic Docs**: https://docs.pydantic.dev/
- **Structlog**: https://www.structlog.org/
- **Cloudflare Workers (Python)**: https://developers.cloudflare.com/workers/languages/python/
- **HTTPX**: https://www.python-httpx.org/
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/

---

**Remember**: Every line of code is a liability. Write less, test more, observe everything.
