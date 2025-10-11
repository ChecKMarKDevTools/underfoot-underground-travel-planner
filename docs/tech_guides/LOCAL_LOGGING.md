# Google Maps API Requirements

## APIs Actually Being Used

### Backend

- **Geocoding API** - `backend/src/services/geocoding_service.py:24`
  - Converts location strings to normalized addresses with coordinates
  - Endpoint: `https://maps.googleapis.com/maps/api/geocode/json`

### Frontend

- **Maps JavaScript API** - `frontend/index.html:19`
  - Interactive map display with custom markers
  - Libraries loaded: `places`, `geometry`
  - Features used: Map, Marker, InfoWindow, Size, Point, Animation

## APIs NOT Being Used

- **Places API** - Library loaded but no API calls in code
- **Geometry Library** - Loaded but not actively used
- **Distance Matrix API** - Not referenced anywhere
- **Directions API** - Not referenced anywhere
- **Street View API** - Explicitly disabled in map options

## Recommendation

**Keep enabled:**

- Geocoding API
- Maps JavaScript API

**Can disable:**

- Distance Matrix API
- Geolocation API
- Address Validation API
- Places API (New)
- Places UI Kit
- Maps Static API

## Current Configuration

Backend API key: `GOOGLE_MAPS_API_KEY` in `backend/.env`
Frontend API key: `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env`

Both keys are now configured to access all APIs per screenshot provided.

# Local Development Logging

## Current Setup

Backend uses **structlog** with colored console output for local development.

### Log Format

```
2025-10-06 19:47:23 [INFO] src.workers.chat_worker: search.intent_parsed
```

### Log Levels

- DEBUG - Detailed diagnostic information
- INFO - General informational messages
- WARNING - Warning messages (validation errors, degraded services)
- ERROR - Error messages (service failures, API errors)
- CRITICAL - Critical errors (unhandled exceptions)

## Viewing Logs Locally

### Backend Logs

Start the backend with:

```bash
cd backend
poetry run uvicorn src.workers.chat_worker:app --reload
```

Logs will appear in the terminal with colored output.

Set log level via environment variable:

```bash
LOG_LEVEL=DEBUG poetry run uvicorn src.workers.chat_worker:app --reload
```

### Frontend Logs

Frontend logs go to browser console. Open DevTools:

- Chrome: `Cmd+Option+I` (Mac) or `F12` (Windows/Linux)
- Click "Console" tab

## Current Issues

1. **Supabase connection degraded** - Backend health check failing due to Supabase connectivity
2. **Backend service degraded** - `/health` endpoint returning 503
3. **Search requests hanging** - Due to degraded backend state

## Next Steps

1. Fix Supabase connection
2. Verify all environment variables are loaded
3. Test search endpoint once backend is healthy
