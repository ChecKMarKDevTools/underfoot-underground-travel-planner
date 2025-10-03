# Vector Search Similarity Threshold - ELI5

## What is a Similarity Threshold?

Think of it like a "close enough" meter for comparing what people are searching for.

When someone searches "underground bars in Portland", the AI turns that intent ("underground bars") into a unique fingerprint made of 1,536 numbers. When another person searches "dive bars in Portland", their intent also becomes a fingerprint. The similarity threshold determines how similar those fingerprints need to be before we say "these are basically the same search, use the cached results."

## The Number: 0.85 (85%)

**0.85 = 85% similar**

- **1.0 (100%)** = Exact match. "underground bars" vs "underground bars"
- **0.85 (85%)** = Very similar. "underground bars" vs "dive bars" ✅ MATCH
- **0.70 (70%)** = Kinda similar. "underground bars" vs "speakeasy" ❓ Maybe
- **0.50 (50%)** = Not really similar. "underground bars" vs "coffee shops" ❌ NO MATCH

## Why 0.85?

**Too High (0.95+):** Only catches near-identical searches. Cache rarely hits. Wastes money on duplicate API calls.

**Too Low (0.70-):** Catches everything. Returns irrelevant results. User searches for "bars" and gets cached results for "museums".

**Just Right (0.85):** Catches semantic variations while staying relevant.

## Real Example

**User 1 searches:** "cool underground spots in Portland"
- Intent extracted: "underground spots"
- Embedding: [0.234, -0.891, 0.445, ... 1536 numbers ...]
- Calls APIs, gets results, caches with intent embedding

**User 2 searches:** "hidden dive bars in Portland"  
- Intent extracted: "dive bars"
- Embedding: [0.198, -0.856, 0.501, ... 1536 numbers ...]
- Similarity check: **0.87** (87% similar) ✅
- Returns User 1's cached results (no API calls needed!)

**User 3 searches:** "family restaurants in Portland"
- Intent extracted: "family restaurants"  
- Embedding: [-0.445, 0.234, -0.112, ... 1536 numbers ...]
- Similarity check: **0.43** (43% similar) ❌
- Makes fresh API calls (totally different intent)

## The 80/20 Weighting

We combine TWO factors to find the best cache match:

**80% Intent Similarity** - Is the intent similar enough?
**20% Geographic Proximity** - Is it close enough?

### Why This Split?

"Underground bars" in Portland is semantically similar to "underground bars" in Seattle (same intent, different city). The intent is the most important part - someone wanting bars shouldn't get museums. But we also give a slight preference to results from nearby cities over far-away ones.

**Example:**
```
User searches: "dive bars" in Portland, OR

Cache Option A: "underground bars" in Portland, OR
- Intent similarity: 0.87 (87%)
- Distance: 0 miles
- Score: (0.87 × 0.8) + (1.0 × 0.2) = 0.896

Cache Option B: "dive bars" in Seattle, WA  
- Intent similarity: 1.0 (100% match!)
- Distance: 173 miles
- Score: (1.0 × 0.8) + (0.654 × 0.2) = 0.931

Cache Option C: "speakeasy" in Portland, OR
- Intent similarity: 0.72 (72%)
- Distance: 0 miles  
- Score: (0.72 × 0.8) + (1.0 × 0.2) = 0.776
```

**Winner: Option B** - Even though it's in a different city, the perfect intent match (dive bars = dive bars) makes it the best result. The 80% weighting on intent ensures we prioritize WHAT they want over WHERE.

## Configuration

**Distance Radius:** 50 miles (80km)
- Far enough to catch nearby cities
- Close enough to stay relevant
- Adjustable based on urban (smaller) vs rural (larger) areas

**Similarity Threshold:** 0.85 (85%)
- Catches semantic variations
- Filters out irrelevant intents
- Proven sweet spot for search quality

## TL;DR

We turn search intents into number fingerprints. If two fingerprints are 85%+ similar AND within 50 miles of each other, we reuse the cached results instead of calling APIs again. Intent matters 4x more than location (80/20 split) because "bars" shouldn't return "museums" even if they're in the same city.
