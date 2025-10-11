# ✅ Python Backend Setup Complete

## What Got Done

### 1. Replaced Geoapify with Google Maps

- ✅ Updated `settings.py` - removed `geoapify_api_key`, added `google_maps_api_key`
- ✅ Updated `geocoding_service.py` - now uses Google Maps Geocoding API
- ✅ Updated `.env` with your real keys

**Why Google Maps?** You have $300 GCP credits. Google Maps includes geocoding + places + more.

### 2. Simplified Config

- ✅ Removed env vars for non-secrets (cache TTL, rate limits, etc.)
- ✅ Hard-coded sensible defaults in `constants.py`
- ✅ Only secrets go in `.env`

**Why?** You're not running staging/prod environments. Hard-code it.

### 3. Updated AGENTS.md (Ashley Enterprise Edition)

- ✅ Removed "how to write Python" examples
- ✅ Focused on **upgrade patterns** and **gotchas**
- ✅ Links to actual code instead of duplicating
- ✅ Your style: "Help when asked, not before"

### 4. Your Real Keys (CONFIGURED ✅)

```
✅ OpenAI: sk-svc-acct-...
✅ Supabase URL: https://uqvwaiexsgprdbdecoxx.supabase.co
✅ Supabase Anon: eyJhbGci... (legacy)
✅ Supabase Service: eyJhbGci... (legacy)

⏳ Google Maps: placeholder (get from GCP console)
⏳ SERP API: placeholder
⏳ Reddit: placeholder
⏳ Eventbrite: placeholder
```

---

## What You Need to Get

### 1. Google Maps API Key (Priority 1)

**Where**: [Google Cloud Console](https://console.cloud.google.com/)

**Steps**:

```
1. Go to console.cloud.google.com
2. Create project (or select existing)
3. Enable "Geocoding API"
4. APIs & Services → Credentials
5. Create API key
6. Copy key → backend/.env (GOOGLE_MAPS_API_KEY=...)
```

**Cost**: Free with $300 credits

### 2. SERP API Key (When you want search)

**Where**: [serpapi.com](https://serpapi.com/)

- Free tier: 100 searches/month
- Or use your existing key if you have one

### 3. Reddit API (When you want Reddit data)

**Where**: [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)

1. "Create app"
2. Type: "script"
3. Get client ID + secret

### 4. Eventbrite (When you want events)

**Where**: [eventbrite.com/platform](https://www.eventbrite.com/platform/)

- Free API, just sign up

---

## Quick Test

```bash
cd backend

# Run tests
poetry run pytest tests/unit/test_models/ -v
# Should pass: 8/8 ✅

# Start dev server
poetry run uvicorn src.workers.chat_worker:app --reload

# Visit in browser
open http://localhost:8000/docs
```

---

## What Changed vs "Enterprise Patterns"

**Before (over-engineered)**:

- Type hints on every variable
- AGENTS.md with copy-paste examples
- Config in env vars (staging/prod nonsense)
- Geoapify (separate service)

**Now (Ashley Enterprise)**:

- Type hints at contracts only (function signatures)
- AGENTS.md for **your future self** doing upgrades
- Config hard-coded (only secrets in .env)
- Google Maps (you already have GCP credits)

---

## File Summary

### Updated

- ✅ `backend/.env` - Your real keys
- ✅ `backend/src/config/settings.py` - Removed Geoapify, added Google Maps
- ✅ `backend/src/config/constants.py` - Hard-coded config, removed env vars
- ✅ `backend/src/services/geocoding_service.py` - Google Maps API
- ✅ `backend/AGENTS.md` - Ashley edition

### Removed

- ❌ Geoapify dependency
- ❌ Unnecessary env var configs
- ❌ "How to code Python" examples

---

## Next Steps

1. **Get Google Maps API key** (5 mins)
2. **Test geocoding**:
   ```bash
   # When you have the key
   poetry run python -c "
   from src.services.geocoding_service import normalize_location
   import asyncio
   result = asyncio.run(normalize_location('Pikeville KY'))
   print(result)
   "
   ```
3. **Get other API keys** when you need those features

---

**Bottom Line**:

- ✅ OpenAI + Supabase ready NOW
- ⏳ Need Google Maps key to test geocoding
- ⏳ Other APIs when you want those features

Everything else is good to go!
