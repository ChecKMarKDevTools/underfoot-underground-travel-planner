# Frontend Design ADR: Chat UI vs Embedded n8n Widget

## Status

Draft (research in progress)

## Context

The initial chat interface in the Underfoot frontend was built rapidly as a **bespoke React + Tailwind UI** to enable: quick iteration on prompt/response flows, early usability feedback, and validation of result card concepts (dynamic rendering, URL handling, debug surfacing). It served as an MVP shell while backend data pipelines and orchestration approaches were still fluid.

We have since identified the availability of an **embedded n8n experience** (via their published npm package / embed SDK) that could provide a production‑grade, fully managed conversation/workflow surface with reduced maintenance overhead. Leveraging the n8n embedded component may allow us to externalize workflow state handling, retry logic, and potentially real‑time execution visualization, letting us focus on domain logic, data quality, and result curation.

## Decision (Provisional)

Keep the current custom chat UI in the repository but treat it as **fallback / minimal shell**. The primary near‑term design direction is to integrate the **n8n embedded widget** (pending capability confirmation) for core conversational interactions.

## Rationale

- **Speed vs Maintainability**: The custom UI gave us speed; an embedded provider gives us sustained velocity and lowers surface area (less to test, style, and harden).
- **Resilience & Features**: n8n may ship enhancements (execution logs, retries, branching) that we would otherwise need to implement manually.
- **Consistency**: Offloading session orchestration reduces the risk of UI drift between experimental branches.
- **Fallback Safety Net**: Retaining the current chat UI ensures we can decouple front end development from embed integration risk; if the embed is delayed or lacks a required feature, we still have a working interface.

## Non‑Goals (for now)

- Re‑implementing advanced tooling (streaming tokens, avatars, conversation persistence) in the custom UI before embed evaluation completes.
- Polishing the chat UI beyond baseline accessibility and stability.

## Open Questions / Research Needed

| Topic | Question | Owner | Notes |
| - | - | - | - |
| Auth / Sessions | Does the n8n embed support auth scoping per end user? | TBD | May affect multi‑tenant roadmap. |
| Theming | Depth of theme overrides (fonts, dark palette alignment) | TBD | Need parity with existing dark tokens. |
| Events API | Webhook or callback hooks for message lifecycle | TBD | Required to sync debug sheet. |
| Rate Limits | How are burst interactions throttled? | TBD | Might need local queueing. |
| Offline Mode | Graceful degradation without embed? | TBD | Fallback to current custom UI. |

## Alternatives Considered

1. **Continue Custom Chat Only**: Higher long‑term maintenance; slower feature parity with automation workflows.
2. **Hybrid (Embed inside custom wrapper)**: Possible; adds complexity unless wrapper adds clear value (e.g., instrumentation, multi‑panel debug).
3. **Third‑Party Chat Vendor**: Would fragment architecture; n8n alignment keeps workflow + UI cohesive.

## Impact on Codebase

- Current components kept: `Chat.jsx`, `ResultCard.jsx`, `MainContent.jsx`, debug panel.
- Future integration: New `EmbeddedChatContainer` (placeholder) could lazy‑load n8n package and fall back to existing `Chat` if unsupported / offline.
- Color system remains centralized (`docs/color_palette.json`, Tailwind extended theme) enabling consistent theming whether using custom or embedded UI.
- **Interim Result Display**: During the earliest embed adoption phase we may render **raw JSON payloads** (pretty‑printed) instead of stylized `ResultCard` components to accelerate validation of data shape and workflow correctness. The existing card layer remains available and can be re‑enabled once the schema stabilizes.

## Migration Plan (High Level)

1. Spike: Prototype n8n embed in an isolated playground route with hardcoded workflow ID.
2. Capability Matrix: Compare feature checklist vs existing chat (scroll behavior, Enter submit, result injection, debug events).
3. Theming Hookup: Map Underfoot dark tokens to embed theming API.
4. Abstraction Layer: Create a facade (interface) for sending a message + receiving structured responses (results, debug meta) used by both custom and embedded versions.
5. Progressive Switch: Feature flag (ENV or query param) toggles between implementations.
6. Deprecation Review: Decide whether to entirely remove custom UI or freeze it as a fallback after embed proves stable in production.

## Risks

- **Feature Gaps**: Embed may not expose all granular hooks (e.g., intermediate tokens) we could custom‑build later.
- **Lock‑In**: Relying on embed might limit deep UX experimentation.
- **Latency**: Additional indirection vs in‑app rendering path.

## Mitigations

- Maintain thin fallback chat UI until confidence threshold met.
- Instrument latency metrics early (time to first response, full result set render).
- Wrap embed calls with defensive error handling & timeout fallback to custom UI.

## Future Enhancements (Post Integration)

- Shared analytics layer capturing conversation turn metrics regardless of underlying implementation.
- Unified result enrichment pipeline (scoring, clustering) decoupled from presentation.
- Pluggable message transforms (e.g., redact PII) pre‑send and pre‑display.

## References

- Color palette tokens: `docs/color_palette.json`
- Existing fallback chat: `frontend/src/components/Chat.jsx`
- Result rendering: `frontend/src/components/ResultCard.jsx`
- Debug surface: `frontend/src/components/DebugSheet.jsx`

## Decision Review Window

Revisit after: first embed spike + capability matrix (target: 2–3 iterations). This ADR remains DRAFT until that evaluation is complete.
