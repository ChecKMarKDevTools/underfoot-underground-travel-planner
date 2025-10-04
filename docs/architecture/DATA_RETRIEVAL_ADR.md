
# Data Retrieval ADR

## Title

High-Level Workflow Design for n8n with Bright Data Integration (v1)

## Status

Proposed

## Context

We need to design an **unstoppable workflow** that leverages **n8n** automation and **Bright Data**. The workflow should:

- Be resilient, fault-tolerant, and capable of recovering from failures.
- Use Bright Data scraping as the mandatory baseline (SERP + Unlocker).
- Demonstrate how real-time web data enhances AI-driven discovery and decision-making.
- Utilize AI Agents for advanced data processing and enrichment.

## Decision

We will implement a **multi-tier workflow in n8n** that uses Bright Data as the required data ingestion layer, with RSS and Google Custom Search as secondary/fallback sources. The workflow will include built-in resilience features (retry, backoff, circuit breakers, DLQs, partial results).

### Workflow Tiers

1. **Tier 1: Bright Data (Mandatory Primary)**
   - Discovery via Bright Data Google SERP.
   - Fetch and extraction via Bright Data Web Unlocker (zone: `underfoot_unlocker_01`).
   - Provides high-quality, structured, and real-time data.

2. **Tier 2: RSS Feeds (Secondary)**
   - Regional blogs, Reddit RSS, city calendars.
   - Captures long-tail and local underground signals.
   - Runs when Bright Data returns degraded or insufficient results.

3. **Tier 3: Google Custom Search (Fallback)**
   - Uses query variants (e.g., underground, hidden gem, locals only).
   - Ensures we always have some data even if upstreams are unavailable.

### Resilience Patterns

- **Retries with Exponential Backoff + Jitter** for transient failures.
- **Circuit Breakers per Source**: prevent cascading failures by isolating bad actors.
- **Dead Letter Queue (DLQ)**: all failed payloads logged for later replay.
- **Checkpoints & Idempotency**: deduplication and safe re-runs.
- **Partial Results**: return best effort output with `meta.degraded = true` when some sources fail.
- **Observability**: run metrics, breaker states, and retry counts logged and optionally pushed to Slack.

### Normalization & Scoring

- All sources mapped to a unified schema `{ source, title, url, snippet, domain, image, publishedAt, tags, cache }`.
- `cache` column denotes whether a record came from Bright Data or cache.
- Scoring favors underground signals (keywords like _hidden gem_, _locals only_, _offbeat_), indie domains, and recency.
- Penalizes corporate/travel aggregator domains.
- Returns two lists: **Primary Results** (top scored, within limit) and **Near(ish) By** (secondary recommendations).

## Consequences

- **Pros**:
  - Bright Data centered and competition compliant.
  - Resilient by design; no single failure stops the workflow.
  - Produces structured, underground-friendly results with explainable scoring.

- **Cons**:
  - Complexity increases with multiple tiers and resilience layers.
  - Requires Bright Data credentials and careful quota/rate limit handling.
  - Cache notation (`cache` column) may require refinement.

## Alternatives Considered

- **Curated URL lists only**: too brittle, not scalable, lacks real-time adaptability.
- **Single-source (Bright Data only)**: high quality, but less resilient and prone to outages or quota exhaustion.
- **Manual scraping**: fragile, inconsistent, and not compliant with the unstoppable requirement.

## Outcome

Proceed with Bright Data as the **mandatory primary engine** in n8n, augmented by RSS and Google CSE as **resilient fallbacks**. Bake in retry, circuit breaker, DLQ, and partial result patterns to meet the definition of an unstoppable workflow.

---

## Revised Architecture (v2 Draft – Multi‑Agent Flow)

Status: Draft / In Progress (supersedes portions of earlier “Workflow Tiers” once validated)

### High-Level Overview

We are evolving from a monolithic tiered workflow to a **two‑agent orchestration model**:

1. **Chat Input Agent (Underfoot Persona)**
   - Single AI chat agent focused solely on eliciting the **minimum viable input envelope** (location(s), temporal window, trip length, thematic focus, constraints) from the user.
   - Performs lightweight validation + normalization (e.g., canonicalize dates, geocode/place resolution, derive region radius heuristics) before handing off.
   - Output Schema (tentative):
     ```jsonc
     {
       "queryId": "uuid",
       "locations": [
         { "raw": "Pikeville KY", "geoId": "us-ky-pikeville", "lat": 37.48, "lon": -82.52 },
       ],
       "dateRange": { "start": "2025-09-10", "end": "2025-09-13" },
       "durationDays": 3,
       "themes": ["outdoors"],
       "constraints": { "weather": true, "familyFriendly": false },
       "rawUserPhrases": ["next week", "3 days", "outdoors"],
       "confidence": { "dates": 0.82, "locations": 0.91 },
     }
     ```
   - Error Modes: ambiguous date (ask clarification), multi‑city conflict, insufficient specificity.

2. **Data Aggregation Agent (Workflow Orchestrator)**
   - Consumes normalized envelope; responsible for executing a **fan‑out of specialized subflows** (n8n workflows) each tuned to a distinct acquisition strategy or Bright Data usage pattern.
   - Subflows may include:
     - Bright Data SERP (variant queries: hidden gems, locals only, underground + <theme>)
     - Bright Data Unlocker for deep page extraction (HTML → structured summary)
     - RSS / Event Calendars (structured feed parser)
     - Long‑running Batch Harvesters (periodic wide crawls whose results are cached)
     - Domain Heuristics Enricher (assign indie vs corporate scores)
   - Each subflow returns a list of records in heterogeneous raw formats; agent maps to unified canonical schema.

### Heterogeneous Source Handling

Instead of enforcing uniform extraction early, each source adapter returns a **source‑native payload + adapter metadata**. Normalization layer performs:

```
raw -> adapter annotate -> canonical map -> scoring -> de‑dupe (fuzzy URL & title) -> rank
```

Canonical Result (draft):

```jsonc
{
  "id": "hash-or-source-guid",
  "source": "brightdata-serp|rss|unlocker|batch-cache|manual",
  "title": "Hidden trail near Pikeville",
  "url": "https://example.com/post",
  "snippet": "Short context snippet…",
  "domain": "example.com",
  "publishedAt": "2025-08-12T10:00:00Z",
  "image": "https://example.com/hero.jpg",
  "tags": ["outdoors", "underground"],
  "score": 0.73,
  "scoringFactors": {
    "indieDomain": 0.15,
    "recency": 0.2,
    "undergroundKeywords": 0.25,
    "rarity": 0.13,
  },
  "cache": false,
  "rawRef": { "adapter": "serp:v2", "pointer": "s3://bucket/key" },
}
```

### Scoring Responsibility Clarification

To avoid divergent or opaque ranking heuristics, **individual adapters/workflows DO NOT assign
final user‑visible scores**. Instead they emit _feature signals_ (e.g., domain age, indie flag,
keyword density, recency delta, social share count) inside an adapter metadata block. The **central
scoring module** (within the Data Aggregation Agent) consumes these normalized feature vectors and
applies a single weighted model / formula (or future ML model) to produce the `score` and
`scoringFactors` breakdown.

Benefits:

- Consistent weighting across heterogeneous sources.
- Easier tuning (one place to adjust weights / add features).
- Auditable: factor breakdown derived from explicit feature list rather than per‑adapter logic.
- Simplifies adapter implementation scope → focus on extraction quality & feature emission.

Adapter Output (feature excerpt example):

```jsonc
{
  "adapter": "rss:v1",
  "features": {
    "recencyHours": 42,
    "undergroundKeywordHits": 3,
    "indieDomain": 1,
    "imagePresent": 0,
    "estReadingMinutes": 6,
  },
}
```

Central scoring then maps features → composite score, persists factors, and never trusts an adapter
provided `score` field (if present it is ignored / stripped).

### Caching & Batch Strategy

- **Immediate Queries**: Low-latency SERP + RSS fetches executed on demand.
- **Batch Pools**: Periodic long-running crawls (e.g., weekly indie blog harvest) populate a cache keyed by (region, theme, period) → merged into live results when fresh (< TTL)
- **Freshness Policy**: Each source labeled with `stalenessBudget` (e.g., RSS=6h, SERP=2h, Batch=7d). Aggregator flags `meta.degraded = true` if critical sources exceed budget.

### Flow Orchestration Pattern

1. Receive normalized envelope.
2. Parallel fan-out to subflows (with circuit breaker & concurrency caps).
3. Stream partial results back (optional future enhancement) or accumulate.
4. Normalize + merge + score + slice (primary vs near-by / exploratory set).
5. Persist summary + scoringFactors for explain-ability.

### Error & Resilience Adjustments (Delta from v1)

| Aspect | v1 Tiered | v2 Multi-Agent |
| - | - | - |
| Control | Sequential fallback tiers | Parallel orchestrated adapters |
| Retry Surface | Per tier | Per adapter with granular breaker state |
| Partial Results | Returned when tier fails | Continuous merge as adapters complete |
| Caching | Limited | Explicit batch + freshness budgets |
| Explain-ability | Basic scoring | Factor breakdown per result |

### Metrics & Observability (Planned)

| Metric | Purpose |
| - | - |
| time.to.normalized.envelope | Chat agent efficiency |
| adapter.latency.{name} | Source performance tracking |
| adapter.error.rate | Reliability / breaker tuning |
| merge.dedupe.count | Signal noise ratio |
| result.coverage.primary | % of top N filled vs requested limit |

### Open Questions (v2 Specific)

| Topic | Question | Notes |
| - | - | - |
| Streaming | Do we need incremental UI streaming or batch is fine? | Impacts fallback JSON vs cards. |
| AuthZ | Will different user tiers restrict certain adapters? | Might require envelope augmentation. |
| Cost Controls | How to prioritize cheaper cached data before paid Bright Data calls? | Weighted scheduling. |
| Privacy | Do we redact PII before caching? | Envelope sanitization stage. |

### Migration Notes

- This v2 section augments (does not yet delete) original Tier model; once validated we will mark v1 as superseded.
- Initial UI representation may use **raw JSON display** before stylized cards re-enable (aligns with Frontend ADR interim plan).

### Next Steps

1. Formalize normalized envelope schema & validation tests.
2. Implement adapter interface contract (TypeScript definitions) even if backend proto for now.
3. Prototype 2 adapters (SERP + RSS) to validate scoring & merge.
4. Add observability scaffolding (structured logs + basic metrics counters).
5. Update ADR status from Draft → Accepted once first three adapters stable.

---

---

_This document was generated with Verdent AI assistance._
