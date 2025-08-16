# Frontend (Underfoot)

This folder contains the single-page React frontend built with Vite and Tailwind.

## Quick overview

- `index.html` — Vite entry (served at `/labs/underfoot/` in dev). It loads `/src/main.jsx`.
- `src/main.jsx` — bootstraps React and imports the global stylesheet.
- `styles.css` — the single global stylesheet. It contains Tailwind directives, theme tokens (CSS variables), and modest component fallbacks that are always applied.
- `src/components/` — React components (Header, Chat, DebugSheet, etc.).
- `public/` — static assets (favicon.png, etc.).

## How to run (dev)

From the repository root, run:
```bash
npm run dev
```
This will start the frontend development server.

## Notes for contributors

- Add global theme tokens in `styles.css` under `:root`.
- Prefer importing assets from components (e.g., `import logo from '../assets/underfoot-logo.png'`) so Vite resolves them.
- For component-scoped styles, use CSS modules or inline Tailwind classes.
