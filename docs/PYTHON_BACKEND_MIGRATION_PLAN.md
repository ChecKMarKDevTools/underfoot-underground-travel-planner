# Python Backend Migration Plan

**Status**: Planning  
**Target**: Cloudflare Workers (Python)  
**Date**: 2025-10-02

## Executive Summary

Convert the current Node.js/Express backend to Python for deployment on Cloudflare Workers, maintaining full feature parity while improving performance, observability, and security. The migration will run parallel to the existing JS implementation without disruption.

## Architecture Decision

### Python Workers on Cloudflare

Cloudflare now supports Python Workers natively, which eliminates the need for complex conversion scripts. This provides:

- **Native Python Runtime**: Full Python 3.11+ support with standard library
- **Edge Performance**: Global deployment with <50ms cold starts
- **Built-in Observability**: Cloudflare Analytics, Logpush, and Tail Workers
- **Zero-Config Scaling**: Automatic scaling across 300+ locations
- **Cost Efficiency**: Pay-per-request model with generous free tier

### Technology Stack

```
┌─────────────────────────────────────────────┐
│           Cloudflare Workers (Python)        │
├─────────────────────────────────────────────┤
│ Framework:      FastAPI (ASGI)              │
│ HTTP Client:    httpx (async)               │
│ OpenAI:         openai-python (official)    │
│ Cache:          Cloudflare KV + Supabase    │
│ Logging:        structlog (structured)      │
│ Security:       python-jose, bcrypt         │
│ Validation:     pydantic v2                 │
│ Testing:        pytest + pytest-asyncio     │
└─────────────────────────────────────────────┘
```

## Agent Architecture Analysis

### Current Architecture (Monolithic)
```
┌──────────────────────────────────┐
│        Express Backend           │
├──────────────────────────────────┤
│ • Request Parsing (OpenAI)       │
│ • Location Normalization         │
│ • Multi-source Search            │
│   - SERP API                     │
│   - Reddit RSS                   │
│   - Eventbrite                   │
│ • Result Scoring & Ranking       │
│ • Response Generation (OpenAI)   │
│ • Caching (Supabase)            │
└──────────────────────────────────┘
```

### Recommended Architecture (Microservices)
```
┌──────────────────────────────────────────────┐
│          API Gateway Worker                   │
│  (Request routing, auth, rate limiting)       │
└────────────────┬─────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐  ┌──────▼──────────────────┐
│ Chat Agent   │  │  Search & Cache Agent    │
│ (Lightweight)│  │  (Heavy Processing)      │
├──────────────┤  ├─────────────────────────┤
│ • Parse      │  │ • Location Normalize     │
│ • Validate   │  │ • Multi-API Aggregation  │
│ • Respond    │  │ • Scoring & Ranking      │
│ • Format     │  │ • Cache Management       │
└──────────────┘  │ • Vector Search (future) │
                  └─────────────────────────┘
```

**Recommendation**: **Split into 2 agents**

**Rationale**:
1. **Performance**: Chat agent needs <200ms response; Search can take 2-5s
2. **Scaling**: Chat agent = high frequency/low compute; Search = low frequency/high compute  
3. **Observability**: Separate metrics for user experience vs data processing
4. **Future-Ready**: Vector search caching requires dedicated worker with ML libraries

## Directory Structure

```
backend-python/
├── src/
│   ├── workers/
│   │   ├── chat_worker.py           # Chat agent (lightweight)
│   │   ├── search_worker.py         # Search & cache agent (heavy)
│   │   └── gateway_worker.py        # API gateway (routing)
│   ├── services/
│   │   ├── openai_service.py        # OpenAI integration
│   │   ├── geocoding_service.py     # Geoapify location normalization
│   │   ├── serp_service.py          # SERP API hidden gems search
│   │   ├── reddit_service.py        # Reddit RSS integration
│   │   ├── eventbrite_service.py    # Eventbrite events
│   │   ├── scoring_service.py       # Result scoring & ranking
│   │   └── cache_service.py         # Supabase + KV caching
│   ├── models/
│   │   ├── request_models.py        # Pydantic request models
│   │   ├── response_models.py       # Pydantic response models
│   │   └── domain_models.py         # Domain entities
│   ├── middleware/
│   │   ├── auth_middleware.py       # Authentication
│   │   ├── rate_limit_middleware.py # Rate limiting (KV-based)
│   │   ├── cors_middleware.py       # CORS handling
│   │   └── logging_middleware.py    # Structured logging
│   ├── utils/
│   │   ├── logger.py                # Structured logging setup
│   │   ├── errors.py                # Custom exceptions
│   │   └── metrics.py               # Observability helpers
│   └── config/
│       ├── settings.py              # Environment config
│       └── constants.py             # Application constants
├── tests/
│   ├── unit/
│   │   ├── test_services/
│   │   ├── test_models/
│   │   └── test_utils/
│   ├── integration/
│   │   ├── test_workers/
│   │   └── test_api/
│   └── e2e/
│       └── test_flows.py
├── scripts/
│   ├── deploy.sh                    # Deployment automation
│   ├── test_local.sh                # Local testing with wrangler
│   └── migrate_data.py              # Data migration utilities
├── wrangler.toml                    # Cloudflare Workers config
├── pyproject.toml                   # Python dependencies (Poetry)
├── pytest.ini                       # Pytest configuration
├── .env.example                     # Environment template
├── AGENTS.md                        # Development guidelines
└── README.md                        # Setup & deployment docs
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Core infrastructure and chat agent

- [ ] **Day 1-2: Project Setup**
  - Initialize Python project with Poetry
  - Configure wrangler.toml for Python Workers
  - Setup structured logging with structlog
  - Create Pydantic models for all entities
  - Configure environment variables and secrets

- [ ] **Day 3-4: Chat Worker (Lightweight)**
  - Implement FastAPI chat endpoint
  - OpenAI integration for parsing
  - OpenAI integration for response generation
  - Request validation with Pydantic
  - Error handling and logging
  - Unit tests (90%+ coverage)

- [ ] **Day 5-7: Core Services**
  - Geocoding service (Geoapify)
  - Cache service foundation (KV + Supabase)
  - Rate limiting middleware (KV-based)
  - Security middleware (CORS, XSS, CSRF)
  - Integration tests

**Deliverable**: Working chat endpoint with basic caching

### Phase 2: Search & Data Integration (Week 2)
**Goal**: Search agent with multi-source aggregation

- [ ] **Day 8-10: Search Services**
  - SERP API service (hidden gems)
  - Reddit RSS service
  - Eventbrite service
  - Scoring & ranking service
  - Async aggregation with httpx
  - Error handling and retries

- [ ] **Day 11-12: Search Worker**
  - FastAPI search endpoint
  - Multi-source orchestration
  - Result categorization
  - Supabase cache integration
  - Performance optimization

- [ ] **Day 13-14: Integration & Testing**
  - End-to-end tests
  - Load testing
  - Performance benchmarking
  - Documentation

**Deliverable**: Full search functionality with caching

### Phase 3: Advanced Features (Week 3)
**Goal**: Observability, optimization, production readiness

- [ ] **Day 15-16: Observability**
  - Structured logging across all services
  - Custom metrics with Cloudflare Analytics
  - Error tracking and alerting
  - Performance monitoring
  - Log aggregation setup

- [ ] **Day 17-18: Optimization**
  - Response compression
  - Connection pooling
  - Batch API calls where possible
  - Cache warming strategies
  - Edge caching headers

- [ ] **Day 19-21: Production Deployment**
  - CI/CD pipeline (GitHub Actions)
  - Staging environment
  - Canary deployment
  - Rollback procedures
  - Production monitoring

**Deliverable**: Production-ready Python backend

### Phase 4: Vector Search Preparation (Week 4)
**Goal**: Foundation for intelligent caching

- [ ] **Day 22-24: Vector Search Spike**
  - Research Cloudflare Vectorize
  - Evaluate embedding models
  - Design vector cache schema
  - Prototype semantic search
  - Performance testing

- [ ] **Day 25-28: Vector Cache Implementation**
  - Integrate Vectorize with search worker
  - Implement semantic similarity caching
  - Query expansion with embeddings
  - A/B testing framework
  - Documentation

**Deliverable**: Intelligent cache with semantic search

## Key Technical Decisions

### 1. FastAPI vs Raw ASGI
**Decision**: FastAPI  
**Rationale**: Automatic OpenAPI docs, Pydantic integration, async support, minimal overhead

### 2. HTTP Client
**Decision**: httpx (async)  
**Rationale**: Modern async client, connection pooling, timeout controls, retry logic

### 3. Logging
**Decision**: structlog  
**Rationale**: Structured JSON logs, context preservation, Cloudflare-compatible, observability-first

### 4. Validation
**Decision**: Pydantic v2  
**Rationale**: 5-50x faster than v1, native JSON schema, Rust core, type safety

### 5. Caching Strategy
**Decision**: Dual-layer (KV + Supabase)  
**Rationale**: 
- KV for hot data (fast, edge-replicated, <1ms)
- Supabase for cold data (queryable, persistent, analytics)

### 6. Security
**Decision**: Defense in depth
- Rate limiting (KV-based sliding window)
- Input validation (Pydantic + custom validators)
- Output sanitization (XSS prevention)
- Secret management (Cloudflare Secrets)
- CORS (strict origin controls)

### 7. Error Handling
**Decision**: Structured exceptions with context
```python
class UnderfootError(Exception):
    """Base exception with structured context"""
    def __init__(self, message: str, **context):
        self.message = message
        self.context = context
        super().__init__(message)
```

## Performance Targets

| Metric | Target | Monitoring |
|--------|--------|------------|
| Cold Start | <100ms | Cloudflare Analytics |
| Warm Response (chat) | <200ms | Custom metrics |
| Warm Response (search) | <3s | Custom metrics |
| Cache Hit Rate | >80% | KV analytics |
| P95 Latency | <500ms | Cloudflare metrics |
| Error Rate | <0.1% | Sentry/Cloudflare |
| Uptime | >99.9% | Cloudflare SLA |

## Security Checklist

- [ ] All secrets in Cloudflare Secrets (never in code)
- [ ] Rate limiting per IP (100 req/min)
- [ ] Input validation on all endpoints
- [ ] Output sanitization (XSS prevention)
- [ ] HTTPS-only (enforced)
- [ ] CORS strict allowlist
- [ ] SQL injection prevention (parameterized queries)
- [ ] API key rotation strategy
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] Audit logging for sensitive operations

## Observability Requirements

### Structured Logging
```python
import structlog

logger = structlog.get_logger()

logger.info(
    "search.complete",
    request_id=request_id,
    elapsed_ms=elapsed,
    result_count=len(results),
    cache_hit=cache_hit,
    sources=sources,
    user_location=location,
)
```

### Metrics
- Request count by endpoint
- Response time distribution (P50, P90, P95, P99)
- Cache hit/miss ratio
- External API latency
- Error rate by type
- Worker CPU time
- Memory usage

### Alerts
- Error rate >1% (5min window)
- P95 latency >1s (5min window)
- Cache hit rate <70% (15min window)
- Worker failures (immediate)

## Migration Strategy

### Parallel Deployment
1. **Week 1-3**: Python backend development (no traffic)
2. **Week 4**: Shadow traffic (Python receives copies, not responses)
3. **Week 5**: Canary (5% traffic to Python)
4. **Week 6**: Gradual rollout (25% → 50% → 100%)
5. **Week 7**: Monitoring and optimization
6. **Week 8**: Decommission JS backend

### Rollback Plan
- Keep JS backend running for 2 weeks post-migration
- Traffic switch via Cloudflare Workers routing
- Instant rollback with single configuration change
- Health checks every 30s with auto-failover

## Testing Strategy

### Unit Tests (90%+ coverage)
- All services (mocked external dependencies)
- All models (validation logic)
- All utilities (edge cases)

### Integration Tests (Critical paths)
- Chat flow (end-to-end)
- Search flow (end-to-end)
- Cache operations (hit/miss scenarios)
- Error handling (all error types)

### Load Tests (Production-like)
- 1000 req/s sustained (5min)
- 5000 req/s burst (30s)
- Cache performance under load
- Graceful degradation

### Security Tests
- OWASP Top 10 (automated scans)
- Penetration testing (pre-production)
- Dependency vulnerability scanning (CI/CD)

## Deployment Pipeline

```yaml
# .github/workflows/python-backend.yml
name: Python Backend CI/CD

on:
  push:
    branches: [main, develop]
    paths: ['backend-python/**']
  pull_request:
    paths: ['backend-python/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install poetry
      - run: poetry install
      - run: poetry run pytest --cov=src --cov-report=xml
      - run: poetry run ruff check .
      - run: poetry run mypy src/
      - uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install safety bandit
      - run: safety check
      - run: bandit -r src/

  deploy:
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy --config wrangler.toml
```

## Cost Analysis

### Current (Node.js on Render/Railway)
- Server: $7-20/month (always running)
- API calls: Variable
- **Total**: ~$20-50/month

### Python Workers (Cloudflare)
- Free tier: 100k req/day
- Paid: $5/10M requests
- KV: $0.50/GB-month
- **Estimated**: $5-15/month (90%+ of requests free)

**Savings**: 50-70% reduction

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Python Workers bugs | High | Low | Keep JS backend as fallback |
| Cold start latency | Medium | Medium | Connection pooling, code optimization |
| API rate limits | High | Low | Caching, request batching |
| Deployment issues | High | Low | Staging environment, gradual rollout |
| Missing features | Medium | Medium | Feature parity checklist |

## Success Metrics

- [ ] 100% feature parity with JS backend
- [ ] <200ms P95 latency (chat endpoint)
- [ ] <3s P95 latency (search endpoint)
- [ ] >99.9% uptime
- [ ] >80% cache hit rate
- [ ] Zero security incidents
- [ ] 50%+ cost reduction
- [ ] Successful canary deployment
- [ ] Clean rollback capability

## Next Steps

1. Review and approve this plan
2. Create backend-python directory structure
3. Initialize Python project (Poetry + dependencies)
4. Configure Cloudflare Workers (wrangler.toml)
5. Implement chat worker (Phase 1, Day 1-4)
6. Begin parallel development

---

**Appendix A: Dependencies**

```toml
[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.104.0"
httpx = "^0.25.0"
openai = "^1.3.0"
pydantic = "^2.5.0"
structlog = "^23.2.0"
python-jose = "^3.3.0"
bcrypt = "^4.1.0"
supabase = "^2.0.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
pytest-asyncio = "^0.21.0"
pytest-cov = "^4.1.0"
ruff = "^0.1.0"
mypy = "^1.7.0"
black = "^23.11.0"
```

**Appendix B: Environment Variables**

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
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...

# Application
CACHE_TTL_SECONDS=60
SSE_MAX_CONNECTIONS=100
RATE_LIMIT_PER_MINUTE=100
LOG_LEVEL=INFO
ENVIRONMENT=production
```
