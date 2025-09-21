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

## Environment Variables

Copy `.env.example` to `.env` to customize behavior. Only variables prefixed with `VITE_` are exposed to the client at build time.

Key vars for the n8n chat page (`/n8n-chat`):

| Variable                    | Purpose                                                     | Mode   |
| --------------------------- | ----------------------------------------------------------- | ------ |
| `VITE_N8N_CHAT_IFRAME_URL`  | Hosted n8n chat UI URL (renders full-screen iframe)         | Iframe |
| `VITE_N8N_CHAT_WEBHOOK_URL` | n8n Chat Trigger webhook URL for dynamic `@n8n/chat` widget | Widget |
| `VITE_N8N_CHAT_METADATA`    | Optional JSON metadata string sent with widget requests     | Widget |

Precedence: if the iframe URL is set it wins; otherwise the widget is used if its webhook URL is present. If neither is set the page shows a friendly "Chat Not Configured" message with guidance.

Force iframe mode for smoke tests (ignores webhook) by visiting:

```
http://localhost:5173/n8n-chat?iframe=1
```

See `docs/CLOUDFLARE_PAGES_DEPLOY.md` for deployment notes and the same variable descriptions in a Cloudflare Pages context.

## Notes for contributors

- Add global theme tokens in `styles.css` under `:root`.
- Prefer importing assets from components (e.g., `import logo from '../assets/underfoot-logo.png'`) so Vite resolves them.
- For component-scoped styles, use CSS modules or inline Tailwind classes.

## End-to-End (E2E) Tests (Playwright)

We use Playwright for browser E2E coverage (`frontend/tests-e2e`). CI installs the required browser binary explicitly (`chromium`). Locally you'll need to do the same once per machine (or after updating Playwright):

```bash
cd frontend
npm run playwright:install
```

### Run E2E tests

Build the production assets and execute the tests against the Vite preview server (this is what the script does):

```bash
cd frontend
npm run test:e2e
```

That script will:

1. `vite build`
2. Launch the preview server (handled automatically by Playwright `webServer` config)
3. Run all specs in `tests-e2e/`
4. Produce an HTML report at `playwright-report/`

Open the HTML report after a run:

```bash
npx playwright show-report
```

### Headed / debug mode

```bash
cd frontend
npx playwright test --headed --debug
```

### Changing the base URL

Tests default to `http://localhost:5173` (or `PLAYWRIGHT_BASE_URL` if set). When deploying behind a path (e.g. `/labs/underfoot`) export:

```bash
export PLAYWRIGHT_BASE_URL=http://localhost:5173/labs/underfoot
```

Then re-run the tests.
