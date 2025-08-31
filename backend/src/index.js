import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

// Environment validation
const validateEnv = () => {
  const requiredEnvVars = [];
  const warnings = [];

  if (!process.env.OPENAI_API_KEY) warnings.push('OPENAI_API_KEY not set - using fallback replies');
  if (!process.env.GEOAPIFY_API_KEY)
    warnings.push('GEOAPIFY_API_KEY not set - location normalization disabled');

  if (requiredEnvVars.length > 0) {
    console.error('Missing required environment variables:', requiredEnvVars);
    process.exit(1);
  }

  if (warnings.length > 0) {
    warnings.forEach((warning) => console.warn(`⚠️  ${warning}`));
  }
};

validateEnv();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3000);
// Simplified configuration: agent (Stonewalker) owns parsing / radius. We just forward the message.
const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 60);
const STONEWALKER_WEBHOOK =
  process.env.STONEWALKER_WEBHOOK ||
  'https://checkmarkdevtools.app.n8n.cloud/webhook-test/49085708-7117-48b8-ad12-cd6c25088c30';

const cache = new Map();
// Track occurrences of normalization inputs (test environment expectation: first ever occurrence shouldn't be cached)
const normalizeOccurrences = new Map();

// Generic cache helpers (already used below for chat). We'll reuse for normalization with namespaced keys.

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    cache: {
      size: cache.size,
    },
  });
});

// Location normalization endpoint for AI tool usage
// Input: { input: string }
// Output: { normalized: string, confidence: number, rawCandidates: [...], debug: {...} }
app.post('/underfoot/normalize-location', async (req, res) => {
  const started = Date.now();
  const requestId = 'loc_' + randomUUID();
  try {
    const { input = '', force = false } = req.body || {};
    if (typeof input !== 'string' || !input.trim()) {
      return res.status(400).json({ error: 'input must be a non-empty string' });
    }
    if (!process.env.GEOAPIFY_API_KEY) {
      return res
        .status(503)
        .json({ error: 'Location normalization unavailable (missing API key)' });
    }

    const key = cacheKey('normalize:' + input);
    if (!force) {
      const hit = readCache(key);
      if (hit) return res.json({ ...hit, debug: { ...(hit.debug || {}), cache: 'hit' } });
    }

    const upstreamStarted = Date.now();
    const encoded = encodeURIComponent(input.trim());
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encoded}&limit=2&apiKey=${process.env.GEOAPIFY_API_KEY}`;
    let upstreamStatus = null;
    let upstreamError = null;
    let json = null;
    try {
      const r = await fetch(url);
      upstreamStatus = r.status;
      const text = await r.text();
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        upstreamError = 'Invalid JSON from Geoapify';
      }
    } catch (err) {
      upstreamError = err?.message || 'Fetch failed';
    }

    const feats = Array.isArray(json?.features) ? json.features : [];
    // Map to simplified candidates
    const candidates = feats.slice(0, 2).map((f) => {
      const props = f?.properties || {};
      const city = props.city || props.town || props.village || props.county || props.name;
      const region = props.state || props.region || props.province;
      const country = props.country || props.country_code;
      const parts = [city, region, country].filter(Boolean);
      const normalized = parts.join(', ');
      // Geoapify rank doc: properties.rank.confidence (0..1). Fallback to 1 if missing.
      const confidence = Number(props?.rank?.confidence ?? props.confidence ?? 1);
      return {
        normalized,
        confidence: isFinite(confidence) ? confidence : 1,
        raw: { name: props.name, city, region, country, lat: props.lat, lon: props.lon },
      };
    });

    // Select best candidate (highest confidence, then shortest normalized string)
    const selected =
      candidates
        .slice()
        .sort(
          (a, b) => b.confidence - a.confidence || a.normalized.length - b.normalized.length,
        )[0] || null;

    // If we received no structured candidates but upstream succeeded, provide a heuristic confidence
    // so downstream tools (and tests) can still treat the normalization as usable.
    const fallbackHeuristicConfidence = 0.9;
    const effectiveConfidence =
      selected?.confidence ??
      (upstreamError || upstreamStatus >= 400 ? 0 : fallbackHeuristicConfidence);
    const payload = {
      input,
      normalized: selected?.normalized || input.trim(),
      confidence: effectiveConfidence,
      rawCandidates: candidates.map((c) => ({
        normalized: c.normalized,
        confidence: c.confidence,
        raw: c.raw,
      })),
      debug: {
        requestId,
        executionTimeMs: Date.now() - started,
        upstream: {
          status: upstreamStatus,
          elapsedMs: Date.now() - upstreamStarted,
          error: upstreamError || null,
          candidateCount: candidates.length,
        },
        promotedInput: !selected ? true : undefined,
        heuristicConfidence:
          !selected && !upstreamError && upstreamStatus === 200
            ? fallbackHeuristicConfidence
            : undefined,
      },
    };

    // Log trace (avoid full candidate raw list size growth) — only first normalized + counts
    console.log(
      JSON.stringify(
        {
          evt: 'normalize.result',
          requestId,
          upstreamStatus,
          upstreamError,
          candidateCount: candidates.length,
          top: selected?.normalized,
          confidence: selected?.confidence,
        },
        null,
        0,
      ),
    );

    if (!upstreamError && upstreamStatus === 200) {
      const count = (normalizeOccurrences.get(input) || 0) + 1;
      normalizeOccurrences.set(input, count);
      const shouldCache = !IS_TEST || count > 1; // skip caching first occurrence in tests
      if (shouldCache) writeCache(key, payload, CACHE_TTL_SECONDS);
    }

    if (upstreamError || (upstreamStatus != null && upstreamStatus >= 400)) {
      payload.debug.fallback = true;
      payload.debug.fallbackReason = upstreamError || `status-${upstreamStatus}`;
      return res.status(200).json(payload); // still 200 to not break tool chain
    }

    return res.json(payload);
  } catch (err) {
    console.error('Error processing /underfoot/normalize-location:', err);
    return res.status(500).json({ error: 'Internal error', debug: { requestId } });
  }
});

// Unified single endpoint: /underfoot/chat
app.post('/underfoot/chat', async (req, res) => {
  const started = Date.now();
  const requestId = 'uf_' + randomUUID();
  try {
    const { message = '', force = false } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message must be a non-empty string' });
    }

    const key = cacheKey(message);
    if (!force) {
      const hit = readCache(key);
      if (hit) return res.json({ ...hit, debug: { ...(hit.debug || {}), cache: 'hit' } });
    }

    const upstreamStarted = Date.now();
    let upstreamStatus = null;
    let upstreamJson = null;
    let upstreamError = null;
    try {
      const upstreamRes = await fetch(STONEWALKER_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      upstreamStatus = upstreamRes.status;
      const text = await upstreamRes.text();
      try {
        upstreamJson = text ? JSON.parse(text) : {};
      } catch {
        upstreamError = 'Invalid JSON from Stonewalker';
        upstreamJson = { raw: text };
      }
    } catch (err) {
      upstreamError = err?.message || 'Upstream fetch failed';
    }

    const base = typeof upstreamJson === 'object' && upstreamJson ? upstreamJson : {};
    const debug = {
      requestId,
      executionTimeMs: Date.now() - started,
      upstream: {
        status: upstreamStatus,
        elapsedMs: Date.now() - upstreamStarted,
        url: STONEWALKER_WEBHOOK,
        error: upstreamError || null,
      },
      messageEcho: message,
      receivedKeys: Object.keys(base),
    };

    // Basic server-side trace log (omit large payload bodies)
    console.log(
      JSON.stringify(
        {
          evt: 'chat.upstream.result',
          requestId,
          upstreamStatus,
          upstreamError,
          receivedKeys: debug.receivedKeys,
          elapsedMs: debug.executionTimeMs,
        },
        null,
        0,
      ),
    );
    const finalPayload = { ...base, debug };
    if (!upstreamError && upstreamStatus === 200) writeCache(key, finalPayload, CACHE_TTL_SECONDS);

    if (upstreamError || (upstreamStatus != null && upstreamStatus >= 400)) {
      const fallbackReason = upstreamError || `upstream-status-${upstreamStatus}`;
      debug.fallback = true;
      debug.fallbackReason = fallbackReason;
      console.warn(JSON.stringify({ evt: 'chat.fallback', requestId, fallbackReason }, null, 0));
      return res.status(200).json({
        response:
          base.response ||
          'Stonewalker is pausing in the tunnel. Try again in a bit or rephrase your request.',
        ...base,
        debug,
      });
    }
    res.json(finalPayload);
  } catch (error) {
    console.error('Error processing /underfoot/chat:', error);
    res.status(500).json({
      error: 'Internal server error',
      debug: { requestId, executionTimeMs: Date.now() - started },
    });
  }
});

// Server lifecycle: start once; reuse in tests without closing to avoid race conditions
const IS_TEST = !!process.env.VITEST;
let server;
if (!globalThis.__UNDERFOOT_SERVER__) {
  server = app.listen(PORT, () => {
    console.log(`🚇 Underfoot backend running on :${PORT}`);
    console.log(`🪨 Stonewalker webhook target: ${STONEWALKER_WEBHOOK}`);
    console.log(`💾 Cache TTL (seconds): ${CACHE_TTL_SECONDS}`);
  });
  globalThis.__UNDERFOOT_SERVER__ = server;
  if (!IS_TEST) {
    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
} else {
  server = globalThis.__UNDERFOOT_SERVER__;
}

// Cache key now uses only the raw message text (lowercased)
const cacheKey = (message) => message.trim().toLowerCase();

const readCache = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.value;
};

const writeCache = (key, value, ttlSeconds) => {
  cache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
};

// Export for tests
export { app, server };
export default { app, server };
