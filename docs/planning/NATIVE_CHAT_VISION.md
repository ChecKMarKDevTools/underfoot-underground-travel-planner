# Native Chat Long-Term Vision

Status: Draft (living document)
Audience: Contributors & future maintainers
Scope: Frontend + backend conversational system replacing the temporary n8n iframe/widget integration.

## 1. Why This Exists

We currently embed an n8n-provided chat (iframe or dynamic widget) as a **zero-backend bootstrap**. That got us immediate UI surface + rapid iteration with minimal code. But it limits:

- Fine-grained UI interactions (token streaming, partial edits, tool progress bars)
- Conversation persistence & retrieval
- Observability (per token latency, model/tool breakdown, error taxonomy)
- Personalization and future premium gating (should costs later force throttling / downtime)
- Extensibility (adding itinerary planning, multi-step tool chains, multi-modal messages)

The native chat stack restores full control while keeping the ethos: _quirky, transparent, pragmatic travel-planning help underground._

## 2. Non-Goals / Intentional Omissions

- No user-facing feature flags or paywall gating at this stage. If infra costs spike, the system can temporarily go offline or revert to the minimal n8n iframe, but **all features are public by default**.
- No premature multi-tenant billing integration.
- Avoid over-engineering: start with a single service + lightweight persistence instead of a microservice mesh.

## 3. Current Snapshot (Baseline)

| Layer | State | Notes |
| - | - | - |
| Frontend Chat Page | `N8nChatPage` (iframe or widget) | Full-screen, theming done |
| Backend | None (only example Express skeleton + optional n8n) | No conversation DB |
| Streaming | None (widget internally handles) | No token-by-token control |
| Persistence | None | User leaves → history gone |
| Observability | Browser console only | No trace / metrics |

## 4. Target Architecture Overview

```
Browser (React UI) ──REST/SSE──> API Gateway (Express/Fastify/Worker)
                                  │
                                  ├─ Model Orchestrator (LLM calls, moderation)
                                  ├─ Tool Layer (retrieval, itinerary planner, geo lookups)
                                  ├─ Persistence (Postgres + pgvector / Redis cache)
                                  └─ Metrics & Logging (structured JSON, traces)
```

### Core Modules

- **Session Manager**: Create/resume session IDs, attach user agent & ephemeral metadata.
- **Message Pipeline**: Validate -> (optional moderation) -> retrieval augment -> model stream -> post-process (summarize, annotate) -> emit.
- **Streaming Transport**: Server-Sent Events (SSE) for simplicity; can add WebSockets for interactive control later.
- **Retrieval / Memory (Phase 2+)**: Location-specific underground travel hints, prior user context condensation.
- **Tool Interface**: Pluggable calls (e.g., route scoring, schedule optimizer). Tools emit progress events.
- **Observability**: Token latency histograms, error codes, request IDs.

## 5. API Contract (Initial Set)

| Endpoint | Method | Purpose |
| - | - | - |
| `/api/chat/sessions` | POST | Create a new session (returns `{sessionId}`) |
| `/api/chat/sessions/:id` | GET | Fetch session + recent messages |
| `/api/chat/sessions/:id/message` | POST | Submit user message (returns `{messageId}`) |
| `/api/chat/sessions/:id/stream` | GET (SSE) | Token / event stream (assistant responses + tool progress) |
| `/api/chat/sessions/:id/history` | GET | Paginate older messages |
| `/api/chat/messages/:id/cancel` | POST | Abort in-flight generation |

### SSE Events

```
event: token
data: {"messageId":"m2","token":"Hel"}
event: token
data: {"messageId":"m2","token":"lo"}
event: message.complete
data: {"messageId":"m2","final":true}
event: tool.start
data: {"toolCallId":"t1","type":"itinerary","step":0}
event: tool.update
data: {"toolCallId":"t1","progress":0.42}
event: tool.end
data: {"toolCallId":"t1","result":{...}}
event: error
data: {"messageId":"m2","error":"ModelTimeout"}
```

### Error Envelope

```json
{ "error": { "code": "RATE_LIMIT", "message": "Too many requests" } }
```

## 6. Data Model (Incremental)

```sql
-- sessions
id UUID PK
created_at TIMESTAMPTZ DEFAULT now()
user_agent TEXT NULL
meta JSONB NULL

-- messages
id UUID PK
session_id UUID FK -> sessions(id)
role TEXT CHECK (role IN ('user','assistant','tool'))
content TEXT
tokens INT NULL
state TEXT CHECK (state IN ('streaming','complete','error'))
meta JSONB NULL
created_at TIMESTAMPTZ DEFAULT now()

-- tool_calls (phase 2+)
id UUID PK
message_id UUID FK -> messages(id)
type TEXT
status TEXT CHECK (status IN ('pending','running','complete','error'))
payload JSONB
result JSONB NULL
created_at TIMESTAMPTZ DEFAULT now()
```

## 7. Streaming Strategy

- **Phase A**: Simulated streaming (send whole assistant message in a single `message.complete` after short delay) for plumbing validation.
- **Phase B**: Real token streaming from model provider.
- **Phase C**: Interleaved tool updates mid-generation.

## 8. Security & CORS

- Assume public read/write (no auth) initially; implement **rate limiting + abuse detection** early to avoid spam cost blowups.
- If frontend & API on different origins: set explicit `Access-Control-Allow-Origin: <frontend-origin>`, `Vary: Origin`, allow `Content-Type` + `Authorization` only.
- If costs require gating later: introduce API key issuance + simple quota (not a UI-based feature flag; either service is available or offline / key protected).

## 9. Cost / Fallback Model

| State | Behavior |
| - | - |
| Normal | Native pipeline active |
| Cost Spike / Provider Outage | Fallback to cached responses OR degrade to short answers |
| Sustained Overrun | Temporarily disable native endpoints and revert `N8nChatPage` to iframe mode with a banner |

Mechanism: health & cost monitor sets a single environment variable (e.g., `CHAT_MODE=fallback`); frontend checks this at build (or via a tiny status JSON) to decide whether to show native or embed. No partial per-user gating.

## 10. Observability & Metrics

| Metric | Description |
| - | - |
| `chat_first_token_latency_seconds` | Time from user POST to first `token` event |
| `chat_tokens_generated_total` | Counter per message/session |
| `chat_errors_total{code}` | Error cardinality |
| `tool_latency_seconds{type}` | Tool call durations |

Logging fields: `requestId`, `sessionId`, `messageId`, `phase`, `latencyMs`, `tokenCount`.

## 11. Rollout Roadmap (No Feature Flags)

1. **Scaffold**: Implement API endpoints with mock responses + SSE skeleton.
2. **Integrate Frontend**: Replace iframe content path with native React chat if `CHAT_MODE != fallback` (build-time env).
3. **Real Model**: Wire provider, stream tokens.
4. **Persistence**: Store sessions/messages; add “Resume Session” (query param or local storage pointer).
5. **Tools**: Introduce itinerary planner tool events.
6. **Retrieval**: Add knowledge base vector index for local underground insights.
7. **Resilience**: Cost monitor + fallback path tested.
8. **Enhancements**: Editing user’s last message, partial rewind, summarization of long threads.

## 12. Frontend Module Sketch

```
src/chat/
  chatService.js        # fetch & SSE wiring
  useChatSession.js     # manages session + messages + stream
  useStreamingReducer.js# optional fine-grained state handling
  ChatProvider.jsx      # context provider
  components/
    MessageList.jsx
    Composer.jsx
    ToolProgress.jsx
    SessionBanner.jsx
```

## 13. Example SSE Hook (Illustrative)

```js
import { useEffect, useRef } from 'react';

export function useChatStream(sessionId, handlers) {
  const closeRef = useRef(null);
  useEffect(() => {
    if (!sessionId) return;
    const es = new EventSource(`/api/chat/sessions/${sessionId}/stream`);
    es.addEventListener('token', (e) => handlers.onToken?.(JSON.parse(e.data)));
    es.addEventListener('message.complete', (e) => handlers.onComplete?.(JSON.parse(e.data)));
    es.addEventListener('error', (e) => handlers.onError?.(e));
    closeRef.current = () => es.close();
    return () => closeRef.current?.();
  }, [sessionId]);
  return () => closeRef.current?.();
}
```

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
| - | - | - |
| Cost runaway (token flood) | Budget exhaustion | Hard caps per session & rate limiting |
| SSE connection churn | Load spike | Use keep-alive comments, idle timeout |
| Model latency variance | Poor UX | Show streaming skeleton + first token latency metric |
| Tool errors mid-stream | Confusing output | Emit explicit `tool.end` with error state; UX shows partial result |
| Massive sessions | Memory & retrieval degrade | Periodic summarization & truncation |

## 15. Success Criteria

| Metric | Goal |
| - | - |
| First token latency (P50) | < 1.2s |
| Completion latency (P90, 200 tokens) | < 6s |
| Error rate (5xx) | < 1% steady state |
| Session resume adoption | > 40% returning users use same session within 24h |

## 16. Open Questions

- Model provider choice & pricing tier (to finalize before Phase 3).
- Which tool(s) provide highest early value (itinerary vs attraction clustering vs safety warnings)?
- Data retention policy (anonymization / deletion schedule)?

## 17. Amendment Process

PRs can update this document; keep a concise changelog section below.

### Changelog

- v0.1 (Initial draft): Baseline + target architecture documented.

---

This vision avoids end-user feature flags: either the native system is online or we fall back wholesale to the n8n embed. Simple, predictable, transparent.

---

_This document was generated with Verdent AI assistance._
