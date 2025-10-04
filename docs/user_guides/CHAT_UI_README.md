
# Underfoot Chat UI

## Purpose

This directory (and related components in `frontend/src/components`) contains the **lightweight custom chat interface** originally built to validate conversational workflows, dynamic result cards, and allow for debugging before an embedded automation/assistant solution (n8n embed) is adopted.

## Current Scope

- Bottom‑anchored message stream (ChatGPT style) with smooth auto‑scroll.
- Textarea composer: Enter to send, Shift+Enter for newline.
- Result cards appear only after backend (or mocked) response includes a `results[]` array.
- Debug sheet (slide over) to inspect raw payload / metadata.
- Dark theme only (color tokens defined in Tailwind + `docs/color_palette.json`).

## Planned Direction

We expect to transition primary interaction to the **n8n embedded widget** (see `FRONTEND_DESIGN_ADR.md`). The custom UI now serves as a sandbox for rapid UX spikes without affecting embed integration.

## Key Components

| Component | Role |
| - | - |
| `Chat.jsx` | Core conversation view and message state, API bridge, Enter submit logic |
| `ResultCard.jsx` | Modular result output (title, description, optional image, URL) |
| `MainContent.jsx` | Conditional container mapping results to cards |
| `DebugSheet.jsx` | Developer/debugging panel for inspecting structured response data |
| `Header.jsx` | Minimal top bar: logo, restart, debug trigger |

## Interaction Contract (Custom Chat)

- Input submit -> POST /chat (configurable base via `VITE_API_BASE`).
- Response shape (expected subset): `{ reply: string, results?: Array<Result>, debug?: object }`.
- Emits results upward via `onResults(results)` so host can render cards elsewhere.

## Result Object Schema (Current)

```
{
  id?: string | number,
  title: string,
  description: string,
  url?: string,
  imageUrl?: string
}
```

## Theming

All palette values flow from Tailwind extended `cm.*` tokens and the design token reference in `docs/color_palette.json`. This keeps future embed theming alignment straightforward.

## Accessibility Notes

- Messages use `role="article"` + aria-label ("Your message" vs "Underfoot reply") for screen reader clarity.
- Conversation container uses `aria-live="polite"` to announce bot replies.
- Buttons and interactive elements have text or `aria-label` (Debug View trigger).

## Deviation from Final Vision

Not implemented (intentionally deferred):

- Streaming token display.
- Persistent conversation history beyond page lifecycle.
- Multi‑thread or saved sessions.
- Advanced formatting / markdown rendering.

## Embed Toggle (Future)

If both native and embed variants coexist, a lightweight runtime flag can select between them while preserving a minimal shared contract (`onResults`, `onDebug`).

## Maintenance Guidelines

- Avoid adding heavy state management libs; keep it simple.
- Keep test coverage around current level (>90% statements) for regression safety.
- If embed adoption stabilizes, mark this UI as deprecated in README and freeze feature additions.

## Related Docs

- `FRONTEND_DESIGN_ADR.md` – strategy & decision record.
- `DATA_RETRIEVAL_ADR.md` – upstream data pipeline plan informing result cards.
- `FUTURE_ENHANCEMENTS.md` – broader project improvement backlog.

## Review Cadence

Reassess necessity every two iterations once embed PoC lands.

---

_This document was generated with Verdent AI assistance._
