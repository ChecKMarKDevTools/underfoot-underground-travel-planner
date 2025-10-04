
# Manual Sanity Test Checklist

Purpose: quick end-to-end verification that core interfaces function (health, chat JSON, SSE stream, cache, debug UI). Run before major commits or deployments.

> NOTE: Location normalization intentionally excluded for now.

## Prerequisites

Backend `.env` example:

```env
PORT=3000
STONEWALKER_WEBHOOK=<your n8n webhook>
CACHE_TTL_SECONDS=60
SSE_MAX_CONNECTIONS=100
OPENAI_API_KEY=sk-...       # optional
GEOAPIFY_API_KEY=geo-...    # optional (unused here)
```

Frontend `.env` example:

```env
VITE_API_BASE=http://localhost:3000
VITE_LIMIT=5
```

Start services (root):

```
npm install
npm run dev
```

## Steps

| # | Action | Command / Interaction | Expected Result |
| - | - | - | - |
| 1 | Health | `curl -s http://localhost:3000/health` | JSON `{ ok: true, cache: { size: 0 }}` |
| 2 | Chat POST | `curl -s -X POST http://localhost:3000/underfoot/chat -H 'Content-Type: application/json' -d '{"chatInput":"Test coffee"}'` | 200 JSON with `response` & `debug.requestId` |
| 3 | Cache Hit | Repeat step 2 | `debug.cache == "hit"` present |
| 4 | SSE Chat | `curl -N "http://localhost:3000/underfoot/chat?chatInput=Hidden+bar&stream=true"` | Events: `start`, `complete`, `end` |
| 5 | SSE Cache | Repeat step 4 | `start` event has `cacheHit: true` |
| 6 | Frontend UI | Use browser, send message | Chat reply appears, debug history updated |
| 7 | Debug While Chatting | Open debug, send another message | History count increments; chat still usable |
| 8 | History Cap | Send >50 messages (loop) | History length capped at 50 |

<!-- Fallback simulation removed: backend no longer synthesizes fallback payloads -->

### Optional SSE Connection Limit Test

Set `SSE_MAX_CONNECTIONS=1` then open two SSE streams; second should yield 503 JSON error.

## Quick Loop Script (Optional)

```bash
for i in {1..55}; do curl -s -X POST http://localhost:3000/underfoot/chat -H 'Content-Type: application/json' -d '{"chatInput":"hist-'"$i"'"}' >/dev/null; done
```

## Pass/Fail Recording Template

```
Health: PASS
Chat POST: PASS
Cache Hit: PASS
SSE: PASS
SSE Cache: PASS
Frontend Basic: PASS
Debug While Chatting: PASS
History Cap: PASS
History Cap: PASS
```

---

_Update this file when interfaces or environment variables change._

---

_This document was generated with Verdent AI assistance._
