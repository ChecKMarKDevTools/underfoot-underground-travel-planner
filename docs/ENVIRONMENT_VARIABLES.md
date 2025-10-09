_Document created: September 27, 2025_
_Last updated: October 9, 2025_

# Environment Variables

Central reference for all environment variables used across Underfoot. Avoid exposing secrets to the frontend — only variables explicitly prefixed with `VITE_` are shipped to the browser.

## Backend (Server Only)

| Name | Required | Default | Description |
| - | - | - | - |
| `PORT` | No | `3000` | HTTP port the Express server listens on. |
| `STONEWALKER_WEBHOOK` | Yes (prod) | Hardcoded test webhook | Upstream n8n (Stonewalker) orchestrator endpoint. Backend proxies all chat requests here. |
| `OPENAI_API_KEY` | Optional | — | Enables upstream / model logic. No synthetic fallback is generated if absent; upstream errors surface. |
| `GEOAPIFY_API_KEY` | Optional (needed for normalize endpoint) | — | Required for `/underfoot/normalize-location`. If not set that endpoint returns 503. |
| `CACHE_TTL_SECONDS` | No | `60` | In-memory cache TTL for chat + normalization responses. |
| `SSE_MAX_CONNECTIONS` | No | `100` | Soft cap on concurrent SSE chat streams. |
| `NODE_ENV` | No | `development` | Standard environment indicator. |
| `VITEST` | Auto (tests) | — | When truthy, adjusts behavior (e.g. skip caching first normalization occurrence). |

### Supabase (Vector Search & Caching)

| Name | Required | Default | Description |
| - | - | - | - |
| `SUPABASE_URL` | Yes | — | Your Supabase project URL. Format: `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | — | Public anonymous key for client-side auth (safe to expose in limited contexts). |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (backend only) | — | **SECRET** server-side key with full database access. Never expose to frontend. |
| `SUPABASE_DB_PASSWORD` | Yes (direct connections) | — | **SECRET** PostgreSQL database password for direct connections. |

#### Where to Get Supabase Credentials

1. **Project URL & API Keys:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project (e.g., `kemxwibutocuppfuagkp`)
   - Navigate to **Settings** → **API**
   - Copy:
     - **Project URL** → `SUPABASE_URL`
     - **anon public** key → `SUPABASE_ANON_KEY`
     - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **SECRET**

2. **Database Password:**
   - **Settings** → **Database** → **Connection string**
   - Password is set during project creation or can be reset here
   - Copy the password → `SUPABASE_DB_PASSWORD` ⚠️ **SECRET**

3. **Project Reference (for CLI):**
   - Found in Project URL: `https://<project-ref>.supabase.co`
   - Current project: `kemxwibutocuppfuagkp` (us-east-1)

#### What Supabase Does

Supabase provides **event-based caching with semantic vector search** for underground travel results:

- **`semantic_cache`** - Stores OpenAI embeddings (1536-dim vectors) to find similar queries without re-calling APIs
- **`api_results_cache`** - Stores actual API responses with event-based expiration (not TTL)
- **`location_cache`** - Geocoding cache to avoid repeated Google Maps API calls

**Key Features:**
- 77% similarity threshold for intent matching
- 80-mile geographic radius with exponential distance decay
- Event-based expiration: results expire when `event_date < now()` (default: 4 weeks)
- Reference-based architecture: `semantic_cache` stores UUID arrays pointing to `api_results_cache`

See [docs/supabase/README.md](./supabase/README.md) for full documentation.

### Internal / Derived

- `IS_TEST`: Derived from `VITEST` inside code.
- `CACHE KEY`: Derived from message text (`message.trim().toLowerCase()`).

## Frontend (Browser-Exposed)

| Name | Required | Default | Description |
| - | - | - | - |
| `VITE_API_BASE` | No | `window.location.origin` | Base URL for backend API calls. Must point to backend host when deployed. |
| `VITE_LIMIT` | No | `5` (implicit) | Limit passed along with chat messages (item cap hint). |

### Potential Future (Not Yet Implemented)

| Name | Purpose |
| - | - |
| `VITE_CHAT_STREAM` | Explicit toggle for forcing streaming vs fallback to POST. Currently auto-attempts SSE. |
| `ENABLE_SSE_CHAT` | Server feature flag if streaming needs staged rollout. |
| `LOG_LEVEL` | Server log verbosity selection. |

## Security Notes

- **Never expose these via `VITE_` variables:**
  - `STONEWALKER_WEBHOOK`
  - `OPENAI_API_KEY`
  - `GEOAPIFY_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **CRITICAL**
  - `SUPABASE_DB_PASSWORD` ⚠️ **CRITICAL**
- All secrets should remain in backend `.env` only.
- `SUPABASE_ANON_KEY` is safe for client-side use with proper RLS policies.

## Example Backend `.env` (Development)

```env
# Server
PORT=3000
NODE_ENV=development

# Upstream Services
STONEWALKER_WEBHOOK=https://your-n8n-instance/webhook/abcd1234
OPENAI_API_KEY=sk-...
GEOAPIFY_API_KEY=geo-...

# Supabase (Vector Search & Caching)
SUPABASE_URL=https://kemxwibutocuppfuagkp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_PASSWORD=your-secure-database-password

# Cache & Connection Settings
CACHE_TTL_SECONDS=60
SSE_MAX_CONNECTIONS=100
```

## Example Frontend `.env`

```env
VITE_API_BASE=http://localhost:3000
VITE_LIMIT=5
```

## Deployment Checklist

- [ ] Set all required Supabase variables in production environment
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is **never** exposed to frontend
- [ ] Confirm Supabase migrations are deployed (`supabase db push --linked`)
- [ ] Test vector search with `find_similar_intents_nearby()` function
- [ ] Schedule daily cleanup via `clean_expired_cache()` cron job

---

_This document was generated with Verdent AI assistance._
