
# Frontend Design ADR: Native Chat UI (Reaffirmed) vs Embedded n8n Widget

## Status

Accepted (revised on 2025-08-29 — embed approach deprioritized)

## Context

The initial chat interface in the Underfoot frontend was built rapidly as a **bespoke React + Tailwind UI** to enable: quick iteration on prompt/response flows, early usability feedback, and validation of result card concepts (dynamic rendering, URL handling, debug surfacing). It served as an MVP shell while backend data pipelines and orchestration approaches were still fluid.

We have since identified the availability of an **embedded n8n experience** (via their published npm package / embed SDK) that could provide a production‑grade, fully managed conversation/workflow surface with reduced maintenance overhead. Leveraging the n8n embedded component may allow us to externalize workflow state handling, retry logic, and potentially real‑time execution visualization, letting us focus on domain logic, data quality, and result curation.

## Decision

We are **reaffirming the bespoke native React chat UI as the primary and shipped interface**. The previously explored n8n embed (iframe / widget) path is **paused** and treated as an optional future experiment rather than the main line. All development effort will focus on iterating the native components (`Chat`, `ResultCard`, `DebugSheet`) and ensuring they directly consume backend `/chat` responses shaped like the example in `docs/example-chat-output.json` (fields: `response`, `items[ ]`, metadata fields like `intent`, `location`, `source`).

## Rationale (Updated)

- **Tighter UX Control**: We need rapid, opinionated iteration on card layout, debug surfacing, and playful voice; an embed constrained that.
- **Schema Evolution**: Direct ownership lets us evolve the response schema (`items` enrichment, metadata tags) without adapter glue.
- **Debug Depth**: Our Debug Sheet shows structured + raw payload slices; embedding limited transparent access to intermediate data.
- **Cognitive Simplicity**: One code path (native) reduces branching in tests, CI, and onboarding.
- **Performance**: Avoids extra iframe / script load overhead and gives finer control over incremental rendering / future streaming.

## Non‑Goals (Current Scope)

- Embedding third‑party chat surfaces.
- Complex multi‑session persistence (will revisit after core discovery loop is solid).
- Token‑level streaming (may be added later; current approach awaits full response then renders cards).

## Open Questions / Near-Term Research

| Topic | Question | Owner | Notes |
| - | - | - | - |
| Auth / Sessions | Lightweight per-session ID tracking + future persistence | TBD | sessionId already returned. |
| Item Ranking | Introduce scoring visualization (stars, ordering justification) | TBD | UI slot reserved in cards (rating). |
| Streaming | Evaluate incremental partials vs whole payload for perception of speed | TBD | Requires backend support. |
| Caching Hints | Show when result came from cache vs live scrape | TBD | `source` field present (e.g., `cache`). |
| Accessibility | Refine announcements for new batch of cards + bot reply | TBD | aria-live region exists; may need granular chunks. |

## Alternatives Rejected (Now)

1. **Embedded n8n Widget / Iframe**: Rejected for current iteration (reasons above). Could return if workflow visualization becomes a must-have.
2. **Third‑Party Generic AI Chat SaaS**: Would dilute domain-specific narrative voice.
3. **Server-Side Rendered Responses Only**: Loses interactive composition and future streaming potential.

## Impact on Codebase

- Removed dependency path motivation for embed flag logic (may prune routes later).
- `Chat.jsx` updated to accept both legacy `{ reply, results }` and new `{ response, items }` schema and normalize to `ResultCard` props.
- Debug payload now nests `chatResponse` for full fidelity snapshot.
- Tests updated to cover new normalization.
- Future cleanup: consider removing `N8nChatPage.jsx` if unused after a deprecation window.

## Incremental Enhancements Roadmap (Native Path)

1. Card Meta Badges: Display `source`, `rating` badges.
2. Skeleton / Shimmer: While waiting on response, show placeholder cards.
3. Error Recovery: Offer retry inline on failure message.
4. Streaming (optional): Append partial response text while items gather.
5. Accessibility Polish: Announce new results in an aria-live region distinct from chat transcript.

## Risks

- **Scope Creep**: Owning all UX could slow feature delivery.
- **Performance Tuning**: Need to measure render cost with large `items` arrays.
- **Backend Contract Drift**: Schema evolution must stay synchronized (add a lightweight schema doc).

## Mitigations

- Add integration test for example payload (`example-chat-output.json`).
- Introduce TypeScript or JSDoc typing for response shape (future task) to flag drift.
- Performance budget: track first paint after send.

## Future Enhancements

- Analytics layer capturing conversation turn metrics.
- Result enrichment (clustering, dedupe) before display.
- Pluggable message transforms (e.g., redact PII) pre‑send and pre‑display.

## References

- Color palette tokens: `docs/color_palette.json`
- Existing fallback chat: `frontend/src/components/Chat.jsx`
- Result rendering: `frontend/src/components/ResultCard.jsx`
- Debug surface: `frontend/src/components/DebugSheet.jsx`

## Decision Review Window

Revisit only if a compelling workflow visualization or orchestration requirement emerges that native UI cannot satisfy with reasonable effort.

---

_This document was generated with Verdent AI assistance._
