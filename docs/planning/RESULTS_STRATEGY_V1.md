# Results Strategy — “More Than Three, Not a Buffet”

Goal: reliably return **4–6 items** without spiraling cost, with a **Near(ish) By** fallback that feels intentional (not a pity list).

---

## 🎯 Output policy (what the UI shows)

- **Primary picks:** 3–5 items within the **core area** (city + auto-broaden to 10–20mi).
- **Near(ish) By:** 1–2 items outside the core (up to **40mi** max), clearly labeled.
- **Hard floor:** If core yields <3, we **promote** 1–2 Near(ish) By items to Primary with a tiny “(≈X mi)” note.

**Why:** Keeps the list feeling substantial (>3) without pretending every tiny town has 10 bangers.

---

## 🧭 Radius tiers (server-side, cheap & predictable)

- **Tier A (Core):** start at `DEFAULT_RADIUS_MILES` (10 by default).
- **Tier B (Stretch):** if core `<3`, bump to 20 miles and retry **sources only** (no extra AI calls yet).
- **Tier C (Near(ish) By):** if still `<3`, run a separate fetch pass at up to **40mi** and label those as “Near(ish) By”.

> We never broaden dates automatically; only area.

---

## 🧰 Source & cap strategy (so we don’t under/over-fetch)

- **Per source cap**: **up to 6 candidates per source** _before_ filtering (small, cheap).
- **Source mix** (parallelized by type, not by variants):
  - 1× local social/forum (e.g., subreddit)
  - 1× venue/community calendar (arts center/arena/campus)
  - 1× indie blog/Substack
- **De-dupe by name/URL root** and keep the best snippet.

**Why:** Capping per source avoids floods while still giving us enough to reach 4–6 after filters.

---

## 🧪 Filtering & ranking (single cheap AI pass)

1. **Filter:** drop blocklist domains + low-signal snippets.
2. **Rank:** one **batch** call to OpenAI for all candidates:
   - Score by: recency (≤12mo), local enthusiasm cues, uniqueness.
   - Return **top N** for Primary, next **M** for Near(ish) By.
3. **Schema** (small tweak):
   ```json
   {
     "primary": [{ "name": "", "blurb": "", "distanceMi": 0, "sources": [] }],
     "nearby": [{ "name": "", "blurb": "", "distanceMi": 0, "sources": [] }],
     "meta": { "location": "", "radiusCore": 10, "radiusMax": 40, "executionTimeMs": 0 }
   }
   ```

---

## 🖥️ UI copy (makes “nearby” feel deliberate)

- Section titles:
  - **Top Picks (in town)**
  - **Near(ish) By (worth the detour)**
- Microcopy: “Small towns share secrets—some just happen to be a scenic 25-minute drive.”

---

## ⚠️ Error handling & backoff (kept, but lean)

- **Retries:** 3 attempts with **exponential backoff** (2s/4s/8s) on 5xx/429 for source pulls.
- **Degrade gracefully:** If still <3 after Tier C, return whatever we have with a friendly “want me to widen the area?” button.
- **No multi-agent bloat:** still one ranker, one orchestrator.

---

## 💸 Cost control

- **One AI rank call per user request** (no per-item calls).
- **Short model**: use a compact model (e.g., `gpt-4o-mini`) at `temperature=0.3`.
- **Cache window:** dev 60s; prod **12–24h** per `{location, dateRange, radiusBucket, vibe}`.
  - `force=true` query param bypasses cache from the UI debug toggle.
- **Stop early:** If after filtering we already have 4–6 strong items at Tier A, **skip** Tiers B/C.

---

## 🧩 Debug view additions

- Show: `radiusCore`, `radiusUsed`, counts per tier (`coreCount`, `stretchCount`, `nearbyCount`).
- Show: which tier contributed each final item.
- Show: retry counts + any backoff timings.

---

## ✅ Quick acceptance tests

- **Typical small city:** ≥4 items with at least 1 in Near(ish) By.
- **Sparse case:** core <3, stretch finds ≥1, nearby fills to **≥4** total.
- **Blocklist hit:** a mainstream suggestion never appears.
- **Backoff path:** a forced 429 ends up successful after retry.
- **Cache:** same query within cache window returns instantly; `force=true` bypasses.

---

## 🔧 Minimal env flags (flat repo)

- `DEFAULT_RADIUS_MILES=10`
- `MAX_RADIUS_MILES=40`
- `CACHE_TTL_SECONDS=86400` (prod)
- `ALLOW_NEARBY=true` (feature flag if you ever want to toggle it)

---

### Bottom line

We’ll reliably land **4–6** without chasing infinity:

- Start modest, **broaden area**, not dates.
- Keep one rank call, batch it.
- Use a **Near(ish) By** section to make the “more than three” promise true, readable, and cheap.

<small>This doc was generated with ChatGPT and lightly edited by me.</small>

---

_This document was generated with Verdent AI assistance._
