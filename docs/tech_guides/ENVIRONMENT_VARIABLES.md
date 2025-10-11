
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

### Internal / Derived

- `IS_TEST`: Derived from `VITEST` inside code.
- `CACHE KEY`: Derived from message text (`message.trim().toLowerCase()`).

## Frontend (Browser-Exposed)

| Name | Required | Default | Description |
| - | - | - | - |
| `VITE_API_BASE` | No | `window.location.origin` | Base URL for backend API calls. Must point to backend host when deployed. |
| `VITE_LIMIT` | No | `5` (implicit) | Limit passed along with chat messages (item cap hint). |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes (for maps) | — | Google Maps JavaScript API key. Required for map visualization features. Get from [Google Cloud Console](https://console.cloud.google.com/apis/credentials). |
| `VITE_GOOGLE_PLACES_API_KEY` | Optional | — | Google Places API key for enhanced location search. Can use same key as Maps API. |

### Potential Future (Not Yet Implemented)

| Name | Purpose |
| - | - |
| `VITE_CHAT_STREAM` | Explicit toggle for forcing streaming vs fallback to POST. Currently auto-attempts SSE. |
| `ENABLE_SSE_CHAT` | Server feature flag if streaming needs staged rollout. |
| `LOG_LEVEL` | Server log verbosity selection. |

## Security Notes

- Never expose `STONEWALKER_WEBHOOK` or backend API keys via `VITE_` variables.
- All secrets should remain in backend `.env` only.

### Google Maps API Key Security

The `VITE_GOOGLE_MAPS_API_KEY` must be exposed client-side - this is the correct and expected implementation for Google Maps JavaScript API. Google designed this API for browser use with proper security measures:

1. **HTTP Referrer Restrictions**: In Google Cloud Console, restrict the API key to your specific domains (e.g., `yourdomain.com/*`, `localhost:3000/*`)
2. **API Restrictions**: Limit the key to only the APIs you need (Maps JavaScript API, Places API)
3. **Usage Quotas**: Set daily quota limits to prevent abuse
4. **Monitoring**: Enable billing alerts and monitor usage in Cloud Console

**Why client-side exposure is acceptable:**
- The Maps JavaScript API requires the key in the browser to authenticate requests
- Domain restrictions prevent unauthorized sites from using your key
- Google's billing model expects and accounts for this exposure pattern
- Backend proxying would add latency and complexity without security benefit

## Example Backend `.env` (Development)

```env
PORT=3000
STONEWALKER_WEBHOOK=https://your-n8n-instance/webhook/abcd1234
OPENAI_API_KEY=sk-...
GEOAPIFY_API_KEY=geo-...
CACHE_TTL_SECONDS=60
SSE_MAX_CONNECTIONS=100
```

## Example Frontend `.env`

```env
VITE_API_BASE=http://localhost:3000
VITE_LIMIT=5
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

---

_Generated documentation — keep synchronized when adding or renaming variables._

---

_This document was generated with Verdent AI assistance._
