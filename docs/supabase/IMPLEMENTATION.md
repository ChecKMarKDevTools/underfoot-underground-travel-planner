# Vector Search Implementation

## Overview

Intent-based semantic caching using OpenAI embeddings and PostgreSQL pgvector. Finds similar search intents within a geographic radius to avoid redundant API calls.

## How It Works

### 1. Parse Intent from User Input

```python
user_input = "cool underground bars in portland"
parsed = await parse_user_input(user_input)
# → { "intent": "underground bars", "location": "Portland" }
```

### 2. Geocode Location

```python
geo = await geocode_location("Portland")
# → {
#     "location": "Portland, Multnomah County, Oregon, United States",
#     "city": "Portland",
#     "county": "Multnomah County",
#     "region": "Oregon",
#     "country": "United States",
#     "latitude": 45.5152,
#     "longitude": -122.6784
# }
```

### 3. Generate Intent Embedding

```python
embedding = await generate_intent_embedding("underground bars")
# → [0.234, -0.891, 0.445, ... 1536 numbers]
```

### 4. Search for Similar Intents Nearby

```sql
SELECT * FROM find_similar_intents_nearby(
  input_intent_embedding := embedding,
  user_lat := 45.5152,
  user_lng := -122.6784,
  max_distance_miles := 80,       -- HARD CUTOFF
  intent_similarity_threshold := 0.77,
  result_limit := 6
)
```

**Filters:**

- Intent must be 77%+ similar
- Location must be within 80 miles (hard cutoff)
- Cache must not be expired

**Scoring:**

- 70% intent similarity
- 30% proximity (with exponential decay)

**Returns:** Up to 6 results with the highest relevance scores.

### 5. Return Cached Results or Search Fresh

**Cache Hit:** Return `result_ids` array, fetch full data from `api_results_cache`\
**Cache Miss:** Call APIs, generate results, store in `api_results_cache`, link via `result_ids`

## Database Schema

### semantic\_cache

Stores vector embeddings and references to cached results.

```sql
CREATE TABLE semantic_cache (
  id uuid PRIMARY KEY,

  -- Intent (vectorized)
  intent text NOT NULL,
  intent_embedding vector(1536) NOT NULL,

  -- Location (NOT vectorized - uses earthdistance)
  location text NOT NULL,
  city text,
  county text,
  region text,
  country text,
  postal_code text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),

  -- References to cached data (NOT duplicating JSONB)
  result_ids uuid[] DEFAULT '{}',

  -- Access tracking
  access_count integer DEFAULT 1,
  last_accessed timestamptz DEFAULT now(),

  -- Metadata
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);
```

**Key difference from typical caching:** The `semantic_cache` table stores **references** (`result_ids`) to actual cached data in `api_results_cache`, not the full JSONB payload. This avoids duplication.

### api\_results\_cache

Stores actual API response data with event-based expiration.

```sql
CREATE TABLE api_results_cache (
  id uuid PRIMARY KEY,
  source text NOT NULL,  -- 'reddit', 'facebook', 'eventbrite', 'serp'
  result_data jsonb NOT NULL,
  location text NOT NULL,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  event_date timestamptz DEFAULT (now() + interval '4 weeks'),
  created_at timestamptz DEFAULT now()
);
```

**Expiration:** Event-based, not TTL. Results expire when `event_date < now()`. Default is 4 weeks for always-open venues.

### location\_cache

Geocoding cache to avoid repeated API calls to Google Maps.

```sql
CREATE TABLE location_cache (
  id uuid PRIMARY KEY,
  raw_input text NOT NULL UNIQUE,
  normalized_location text NOT NULL,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  confidence float,
  raw_candidates jsonb,
  expires_at timestamptz NOT NULL
);
```

## Configuration

| Setting | Value | Why |
| - | - | - |
| Similarity Threshold | 0.77 | Better cache hit rate, catches more variations |
| Distance Cutoff | 80 miles | Hard limit, beyond = excluded |
| Intent Weight | 70% | Primary factor for relevance |
| Proximity Weight | 30% | Secondary, with exponential decay |
| Distance Decay | Exponential (x²) | Far places heavily penalized |
| Result Limit | 6 | Maximum results returned |

## Distance Scoring

Uses **exponential decay** so close results are strongly preferred:

```
proximity_score = 1 - (distance_miles / 80)²

This SUBTRACTS points as distance increases:
0 miles   → 1.0   (perfect, no penalty)
20 miles  → 0.94  (0.06 penalty)
40 miles  → 0.75  (0.25 penalty)
60 miles  → 0.44  (0.56 penalty - MORE THAN HALF!)
80 miles  → 0.0   (1.0 penalty - TOTAL negation)
80+ miles → EXCLUDED (not even scored)
```

**The negation happens via `1 - (d/80)²`:**

- At 0 miles: 1 - 0 = 1.0 (no negation)
- At 40 miles: 1 - 0.25 = 0.75 (25% negated)
- At 60 miles: 1 - 0.56 = 0.44 (56% negated)
- At 80 miles: 1 - 1.0 = 0.0 (100% negated, cutoff)

## Relevance Scoring

```
relevance = (intent_similarity × 0.7) + (proximity_score × 0.3)
```

**Example:**

- Intent 85% similar, 20 miles away: (0.85 × 0.7) + (0.94 × 0.3) = 0.877
- Intent 100% similar, 47 miles away: (1.0 × 0.7) + (0.65 × 0.3) = 0.895
- Intent 100% similar, 100 miles away: EXCLUDED (beyond 80 miles)

## Python Usage

```python
from backend.src.services.vectorService import (
    find_similar_intent_nearby,
    store_semantic_cache
)

# Check cache - returns list of up to 6 cache entries with result_ids
cached_results = await find_similar_intent_nearby(
    intent="dive bars",
    latitude=45.5152,
    longitude=-122.6784,
    distance_miles=80,
    similarity_threshold=0.77,
    result_limit=6
)

if cached_results:
    # Fetch full result data from api_results_cache using result_ids
    result_ids = cached_results[0]["result_ids"]
    full_results = await fetch_results_by_ids(result_ids)
    return full_results

# Fresh search
results = await search_apis(intent, location)

# Store in api_results_cache
result_ids = await store_api_results(results)

# Link to semantic_cache
await store_semantic_cache(
    intent="dive bars",
    location_data={
        "location": "Portland, Multnomah County, Oregon, United States",
        "city": "Portland",
        "county": "Multnomah County",
        "region": "Oregon",
        "country": "United States",
        "latitude": 45.5152,
        "longitude": -122.6784
    },
    result_ids=result_ids  # List of UUIDs referencing api_results_cache
)
```

## Performance Optimizations

1. **Vector index (ivfflat)** - Fast cosine similarity search on embeddings
2. **Geographic index (GIST)** - Quick distance filtering using earthdistance
3. **Hard distance cutoff** - Excludes far results immediately (80 miles)
4. **Expiration indexes** - Fast cleanup of expired cache entries
5. **Reference-based caching** - `semantic_cache` stores `result_ids` arrays, not duplicate JSONB

## Cache Maintenance

### Cleanup Expired Entries

```sql
SELECT clean_expired_cache();
-- Returns: { "location_cache_deleted": 5, "semantic_cache_deleted": 12, "api_results_deleted": 43, ... }
```

Run daily via cron or edge function to remove expired cache entries.

### Monitor Cache Performance

```sql
SELECT get_cache_statistics();
-- Returns comprehensive stats on cache size, hit rates, expiration counts
```

## See Also

- [README.md](./README.md) - Main Supabase documentation
- [ELI5.md](./ELI5.md) - User-friendly explanation of vector similarity
