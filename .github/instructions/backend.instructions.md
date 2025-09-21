---
applyTo: backend/**/*
---

# BACKEND_INSTRUCTIONS.md

> 🗺️ **Underfoot Backend** — single-agent orchestrator for the “underground” travel picks.
> ⚙️ Node 24, Express, plain JavaScript. One OpenAI batch call. n8n for source aggregation.
> 🎯 Goal: reliably return **4–6** items with a **Near(ish) By** section + rich debug.

---

## Tech & Constraints

- 🖥️ **Runtime:** Node 24 (ES2024), Express.
- 💻 **Language:** JavaScript only (no TypeScript).
- 🎨 **Style:** single quotes; semicolons; small modules; pure helpers where possible.
- 🔑 **Secrets:** `.env` via `dotenv`. Never leak secrets in logs or responses.
- 🌐 **CORS:** allow only your site origin (ChecKMarKDevTools.dev).

---

## Endpoints

### `POST /chat`

**Input**

```json
{ "message": "Pikeville KY next week for 3 days, outdoors", "limit": 5, "force": false }
```

**Process**

1. 📝 **Parse** free text → `{ location, startDate, endDate, vibe }`
   - Defaults: 3 days; handle “next week” nudge; vibe keywords (outdoors|history|food|art|music|quirky|nature|hike|coffee).
2. 📍 **Radius tiers**
   - A: core = `DEFAULT_RADIUS_MILES` (10)
   - B: stretch = 20 (only if core < 3)
   - C: nearby = up to `MAX_RADIUS_MILES` (40) (only if still < 3)
   - Stop early when total candidates ≥ 4 (cap overall at 6).
3. 🔄 **Fetch** candidates per tier via **n8n** (`N8N_WEBHOOK_URL`, POST body: `{ location, startDate, endDate, radiusMiles, vibe }`).
4. 🧹 **Filter + dedupe**
   - Blocklist mainstream hosts (tripadvisor, yelp, foursquare, facebook, instagram).
   - Dedupe by `name|host`.
5. 🧠 **Rank + format** (single OpenAI call)
   - Scoring: recency (≤12mo), local enthusiasm cues, uniqueness, distance.
   - Output buckets:
     - `primary`: 3–5 (core + stretch)
     - `nearby`: 0–2 (≤ 40 mi)
   - If primary < 3, **promote** top nearby with `(≈X mi)`.
6. 💬 **Reply text** in Underfoot voice + **debug payload**.

**Output**

```json
{
  "reply": "string...",
  "debug": {
    "parsed": { "location": "", "startDate": "", "endDate": "", "vibe": "" },
    "radiusCore": 10,
    "radiusUsed": 20,
    "coreCount": 3,
    "stretchCount": 1,
    "nearbyCount": 2,
    "raw": { "core": [], "stretch": [], "nearby": [] },
    "filtered": { "primary": [], "nearby": [] },
    "executionTimeMs": 1234,
    "requestId": "uf_...",
    "retries": { "sources": { "reddit": 1 } }
  }
}
```

### `GET /health`

Returns `{ "ok": true }`.

---

## Environment

```
OPENAI_API_KEY=sk-...
N8N_WEBHOOK_URL=http://localhost:5678/webhook/underfoot
DEFAULT_RADIUS_MILES=10
MAX_RADIUS_MILES=40
CACHE_TTL_SECONDS=86400   # dev 60, prod 12–24h
ALLOW_NEARBY=true
PORT=3000
```

---

## Caching

- 🗝️ **Key:** `{location}|{startDate}|{endDate}|{vibe}|{radiusBucket}`
- ⏱️ **TTL:** dev 60s, prod via `CACHE_TTL_SECONDS`.
- 🔄 `force=true` to bypass (UI Debug toggle will set this).

---

## Retries & Backoff

- 🚦 **When:** n8n calls with 429/5xx.
- 🔁 **Policy:** up to 3 tries with **exponential backoff**: 2000 → 4000 → 8000 ms.
- 🤝 **Fail shape:** return friendly message + include errors in `debug.errors[]`.

---

## Security

- 🧽 Sanitize input; never eval.
- 🚫 Enforce domain blocklist server-side (don’t trust the ranker).
- 🔐 CORS: only your allowed origin ChecKMarKDevTools.dev.
- 🛑 Don’t serialize exceptions with stack traces to the client.

---

## Performance & Cost

- 🎯 Exactly **one** OpenAI call per `/chat`.
- 📦 **Cap** per-source pre-filter: 6 candidates.
- ⏭️ Skip B/C tiers if A already yields 4–6 good items.
- 💸 If usage is high, consider OLlama or other LLMs to reduce costs.

---

## Logging & Observability

- 🆔 Generate `requestId` per call.
- 📊 Log structured JSON: timings for `parse`, `tierA`, `tierB`, `tierC`, `rank`, `compose`; token usage (if available); retry counts.
- 🚫 Don’t log secrets or full model prompts (only hashes if needed).

---

## Testing

- 🧪 **Unit:** parser, blocklist, dedupe, cache.
- 🔄 **Integration:** mock n8n:
  - A: returns ≥4 (skip B/C).
  - B: returns 1–2 (trigger C).
  - C: returns ≥1 (promotion path).
- ❌ **Error:** simulate 429/500 → verify backoff + graceful output.
- ✅ **E2E:** UI shows **Top Picks** + **Near(ish) By** and Debug fields populate.
- 🎯 Goal: 85% coverage threshold.

---

## Definition of Done

- 🏁 `/chat` consistently returns **4–6** items with correct sectioning.
- 🕵️ Debug payload complete (counts, radius, timings, retries).
- 📦 Cache hit/miss behaves as expected; `force=true` works.
- 🧹 Lint/format clean; commits conventional.
