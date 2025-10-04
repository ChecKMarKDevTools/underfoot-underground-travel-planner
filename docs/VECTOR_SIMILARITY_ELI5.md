# Vector Search Similarity Threshold - ELI5

## What is a Similarity Threshold?

Think of it like a "close enough" meter for comparing what people are searching for.

When someone searches "underground bars in Portland", the AI turns that intent ("underground bars") into a unique fingerprint made of 1,536 numbers. When another person searches "dive bars in Portland", their intent also becomes a fingerprint. The similarity threshold determines how similar those fingerprints need to be before we say "these are basically the same search, use the cached results."

## The Number: 0.77 (77%)

**0.77 = 77% similar**

- **1.0 (100%)** = Exact match. "underground bars" vs "underground bars"
- **0.85 (85%)** = Very similar. "underground bars" vs "dive bars" ✅ MATCH
- **0.77 (77%)** = Similar enough. "underground bars" vs "speakeasy" ✅ MATCH
- **0.65 (65%)** = Kinda similar. "underground bars" vs "cocktail lounge" ❓ Maybe
- **0.50 (50%)** = Not really similar. "underground bars" vs "coffee shops" ❌ NO MATCH

## Why 0.77?

**Too High (0.85+):** Only catches very similar searches. Cache rarely hits. Wastes money.

**Too Low (0.65-):** Catches too much. Returns irrelevant results. "bars" gets "museums".

**Just Right (0.77):** Catches good semantic variations while staying relevant. Better cache hit rate.

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

## The 70/30 Weighting + Hard Distance Cutoff

We combine TWO factors to find the best cache match:

**70% Intent Similarity** - Is the intent similar enough? (must be 77%+)
**30% Geographic Proximity** - Is it close enough? (must be within 80 miles)

### Hard Cutoff at 80 Miles

**Beyond 80 miles = EXCLUDED COMPLETELY.** Doesn't matter if the intent is a perfect match.

- 0-80 miles: Included, with exponential decay (close >> far)
- 80+ miles: Excluded entirely

### Exponential Distance Decay

Distance penalty is NOT linear. It's exponential, so far places get hammered:

- **0 miles** = 1.0 proximity score (perfect)
- **20 miles** = 0.94 proximity score (great)
- **40 miles** = 0.75 proximity score (okay)
- **60 miles** = 0.44 proximity score (getting bad)
- **80 miles** = 0.0 proximity score (cutoff)
- **100+ miles** = EXCLUDED (not even considered)

### Why This Split?

Intent is most important, but distance matters A LOT. An exact intent match 79 miles away should beat a slightly worse match locally.

**Example:**
```
User searches: "dive bars" in Portland, OR (45.5152, -122.6784)

Cache Option A: "underground bars" in Portland, OR (0 miles)
- Intent similarity: 0.85 (85%)
- Distance: 0 miles → proximity score: 1.0
- Final: (0.85 × 0.7) + (1.0 × 0.3) = 0.895

Cache Option B: "dive bars" in Salem, OR (47 miles)
- Intent similarity: 1.0 (100% match!)
- Distance: 47 miles → proximity score: 0.65
- Final: (1.0 × 0.7) + (0.65 × 0.3) = 0.895

Cache Option C: "dive bars" in Seattle, WA (173 miles)
- Intent similarity: 1.0 (100% match!)
- Distance: 173 miles → EXCLUDED (beyond 80 mile cutoff)
- Final: NOT CONSIDERED AT ALL

Cache Option D: "speakeasy" in Portland, OR (0 miles)
- Intent similarity: 0.72 (72% - below 0.77 threshold)
- Distance: 0 miles
- Final: EXCLUDED (intent not similar enough)
```

**Winner: Tie between A and B** - Both score 0.895. The perfect intent match 47 miles away equals the good match locally.

## Configuration

**Distance Radius:** 80 miles HARD CUTOFF
- Beyond 80 miles = excluded entirely
- Within 80 miles = exponential decay (close >> far)
- Adjustable based on urban (smaller) vs rural (larger) areas

**Similarity Threshold:** 0.77 (77%)
- Catches more semantic variations than 0.85
- Better cache hit rate
- Still filters out irrelevant intents

## TL;DR

We turn search intents into number fingerprints. If two fingerprints are 77%+ similar AND within 80 miles of each other, we reuse the cached results instead of calling APIs again. 

Intent similarity is 70% of the score, proximity is 30%, but distance uses exponential decay so far places get heavily penalized. Beyond 80 miles? Excluded completely, doesn't matter how good the intent match is.
