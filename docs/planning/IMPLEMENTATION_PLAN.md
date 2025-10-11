# Underfoot Underground Travel Planner — High-Level Implementation Plan

> 🦄 Source of truth for the v1 build plan. Chatbot-only UX, Node **24**, flat monorepo (`/frontend`, `/backend`, `/n8n`, `/docs`).
> Goal: reliably output **4–6** “underground” picks (with a **Near(ish) By** section) for a location + date range, without relying on mainstream travel sites.

---

## 0) Repo Layout & Tooling

```
/frontend   → Vite + React + TS (chat UI + Debug View) → deployed to /labs/underfoot
/backend    → Express (REST API), OpenAI calls, radius tiers, cache, error/backoff
/n8n        → Workflow JSON exports (orchestrator, fetch-sources, rank-format, error-handler)
/docs       → README assets, JOURNEY.md, diagrams
```

**Scripts (root):**

- `dev` → run backend + frontend
- `build` → build backend + frontend
- `start` → start backend
- `lint`, `format` → your existing ESLint/Prettier/Remark stack
- `commitlint` → (single) conventional message check

**Node:** 24.x (Current), ok for Labs.
**Package manager:** npm workspaces (root devDeps; per-app runtime deps).

---

## 1) Frontend (Vite + React + TS) — Chatbot UI

**Path:** `/labs/underfoot` (no homepage changes)

**Key screens/components**

- **Header:** “🥾 Underfoot” + buttons: **Restart** / **Debug View**
- **Chat thread:**
  - Bubbles for user/bot (screen-reader roles + live region)
  - Bot style: quirky, lightly snarky, never mean
- **Input bar:** single text box + **Send** (Enter/Click)
- **Debug View (toggle):** right-side panel showing structured `debug` from backend:
  - `parsed` (location, dates, vibe)
  - `radiusCore`, `radiusUsed`
  - counts: `coreCount`, `stretchCount`, `nearbyCount`
  - `executionTimeMs`, retry/backoff notes
  - truncated raw n8n JSON

**APIs called**

- `POST /chat` — main entry; send free-text message; receive bot reply + debug payload
- (Optional later) `GET /health` — backend liveness for UI banner

**Accessibility defaults**

- `aria-live="polite"` on chat log
- Focus moves to newest bot message
- High contrast palette; all actionable elements keyboard-navigable

**Branding**

- Rounded-square app icon; tech-geometric footprint motif (eventual SVG)
- Colors: your CheckMarK purples/pinks/blues (already in style)

---

## 2. Backend (Express) — Orchestrator & AI Stylist

**Endpoints**

- `POST /chat`
  - Input: `{ message: string }`
  - Flow:
    1. **Parse** free text → `location`, `startDate`, `endDate`, optional `vibe`
    2. **Radius tiers:** A=10mi (core) → if `<3`, B=20mi (stretch) → if still `<3`, C=40mi (nearby)
    3. **Fetch** via **n8n** (per tier) → raw candidates
    4. **Filter & dedupe** (blocklist mainstream domains)
    5. **Rank + format** via **OpenAI** (single batch call) → allocate to `primary` (in-town) vs `nearby`
    6. **Build reply** in Underfoot voice + **debug** object for UI
  - Output:
    ```json
    {
      "reply": "text...",
      "debug": {
        "parsed": {...},
        "radiusCore": 10,
        "radiusUsed": 20,
        "coreCount": 3,
        "stretchCount": 1,
        "nearbyCount": 2,
        "raw": { "...": "truncated" },
        "filtered": { "...": "truncated" },
        "executionTimeMs": 1234,
        "retries": { "reddit": 1, "calendar": 0 }
      }
    }
    ```
- `GET /health` → `{ ok: true }`

**Ranking model**

- **OpenAI** `gpt-4o-mini` (fast, cheap)
- `temperature: 0.3`, JSON-like disciplined output (but final reply is natural text)
- One **batch** call per request (no per-item calls)

**Caching**

- **Backend-local cache** keyed by `{location, startDate, endDate, vibe, radiusBucket}`
  - Dev: 60s; Prod: 12–24h (`CACHE_TTL_SECONDS`)
  - `force=true` query flag (UI debug toggle) bypasses cache

**Error handling & backoff**

- Retries: max 3; **exponential backoff** on 5xx/429 (2s → 4s → 8s) for n8n/source pulls
- Graceful degradation:
  - If still `<3` after Tier C → return whatever we have + suggest “Broaden area?” button
  - If n8n unreachable → friendly fail message + retry
- Logging: `runId`, timings per step, retry counts

**Security**

- No secrets in the client; **`OPENAI_API_KEY`** only on server
- Input sanitation; strict domain blocklist enforced server-side
- (Optional, later) simple rate-limit to avoid abuse

---

## 3. n8n Workflows — Data Layer

**Workflows (JSON exported to `/n8n`)**

1. **`underfoot_orchestrator`** _(called via backend; or keep backend calling source flows directly)_
   - Validates inputs; delegates to `fetch_sources_*`; merges results; returns raw candidates
2. **`fetch_sources_local`**
   - **Parallel by type** (cap 6 per source):
     - Local social/forum (e.g., subreddit / regional)
     - Community/venue calendar (arts center, arena, campus)
     - Indie blog/Substack (non-aggregator)
   - Normalize to `{ name, url, snippet, host, (optional) distanceMi }`
   - Drop blocklist hosts
3. **`rank_and_format`**
   - (Optional if you prefer doing rank in backend) Subagent that scores + structures JSON
4. **`error_handler`**
   - **Error Trigger** → Slack/Email notify (workflow, node, message)
   - Include link to failed execution

**Reliability aids**

- Node “Retry on Fail”: 3; plus custom backoff for 429/5xx
- **Stop & Error** when candidates `<1` after filters → error workflow + clear return
- **Static data** cache (optional): last successful raw fetch for same query (short TTL)

---

## 4. Results Strategy — “More Than Three, Not a Buffet”

**UI sections**

- **Top Picks (in town):** 3–5 within core radius
- **Near(ish) By (worth the detour):** 1–2 from up to 40mi
- Promotion rule: If core `<3`, promote top Nearby into Top Picks with a `(≈X mi)` suffix

**Schema (backend → UI)**

```json
{
  "primary": [{ "name": "", "blurb": "", "distanceMi": 0, "sources": [] }],
  "nearby": [{ "name": "", "blurb": "", "distanceMi": 0, "sources": [] }],
  "meta": { "location": "", "radiusCore": 10, "radiusMax": 40, "executionTimeMs": 0 }
}
```

---

## 5) Environment Variables (backend-only)

```
# Backend
OPENAI_API_KEY=sk-...
N8N_WEBHOOK_URL=https://n8n.yourdomain.tld/webhook/underfoot
DEFAULT_RADIUS_MILES=10
MAX_RADIUS_MILES=40
CACHE_TTL_SECONDS=86400
ALLOW_NEARBY=true
PORT=3000
```

> **Note:** Frontend no longer needs its own env; it just points to the backend URL you deploy.

---

## 6. Deployment (simple and safe)

**Frontend**

- `npm run build` → upload `/frontend/dist` to your site under `/labs/underfoot/`
  (Cloudflare Pages or your existing host; no homepage overwrite)

**Backend**

- Containerize (Node 24 alpine) or run on your VM; expose `:3000`
- If needed, put behind Cloudflare Tunnel or reverse proxy under `api.checkmarkdevtools.dev`

**n8n**

- Your host (VM or Docker); secure with basic auth; expose a stable webhook (`N8N_WEBHOOK_URL`)

---

## 7) Acceptance Criteria (Definition of Done)

- **UX**
  - Chatbot replies with **4–6 items** total for Pikeville test case
  - “Near(ish) By” appears when items come from > core radius
  - Debug View shows parsed inputs, radius usage, counts, timings

- **Data correctness**
  - Each item has 2–3 niche sources (no mainstream/blocked domains)
  - No invented hours/claims; blurbs ≤ 55 words

- **Reliability**
  - 5xx/429 retry + backoff verified (logs show retry sequence)
  - If zero results, user sees friendly fail + “Broaden area?” button

- **Security**
  - Secrets not in client bundle; CORS restricted to your domain

- **Docs**
  - `/n8n/*.json` exported
  - README updated with envs, scripts, and deployment steps
  - JOURNEY.md Day 0–1 entries present

---

## 8) Cost & Performance Guards

- **One** OpenAI batch call per request
- Cap **6 candidates per source** pre-filter
- Cache raw fetches + final response (prod 12–24h)
- Keep `gpt-4o-mini` unless quality requires bigger model

---

## 9. Milestones (fast path)

- [ ] **Scaffold** frontend chat + backend `/chat` with demo data → UI “feels alive”
- [ ] **n8n `fetch_sources`** wired + blocklist filter → real raw candidates
- [ ] **Ranking** via OpenAI (single call) + sectioning (primary/nearby)
- [ ] **Error/backoff** solid; Debug View fields filled
- [ ] **Cache** on; envs finalized; push to `/labs/underfoot/`
- [ ] **Polish** copy + a11y + small visual tune (icon/logo dropped in)

---

<small>This document was generated with the help of ChatGPT as directed by Ashley Childress</small>

---

_This document was generated with Verdent AI assistance._
