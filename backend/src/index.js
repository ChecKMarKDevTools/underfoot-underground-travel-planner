import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import searchRouter from './routes/search.js';
import { getCacheStats, cleanExpiredCache } from './services/supabaseService.js';

// Environment validation
const validateEnv = () => {
  const requiredEnvVars = [];

  // Critical services - fail fast if missing
  if (!process.env.OPENAI_API_KEY) {
    requiredEnvVars.push('OPENAI_API_KEY - AI chat responses required for base functionality');
  }
  if (!process.env.GEOAPIFY_API_KEY) {
    requiredEnvVars.push(
      'GEOAPIFY_API_KEY - Location normalization required for base functionality',
    );
  }
  if (!process.env.SERPAPI_KEY) {
    requiredEnvVars.push('SERPAPI_KEY - Google search required for core functionality');
  }
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
    requiredEnvVars.push('REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET - Reddit data required');
  }
  if (!process.env.EVENTBRITE_TOKEN) {
    requiredEnvVars.push('EVENTBRITE_TOKEN - Event data required');
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    requiredEnvVars.push('SUPABASE_URL and SUPABASE_ANON_KEY - Database required for caching');
  }

  if (requiredEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    requiredEnvVars.forEach((missing) => console.error(`   ${missing}`));
    console.error('\n💡 Check your .env file and ensure all required API keys are configured');
    process.exit(1);
  }
};

validateEnv();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3000);
const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 60);

const cache = new Map();

// Mount the new search router
app.use('/underfoot', searchRouter);

app.get('/health', async (_req, res) => {
  let cacheStats;
  try {
    cacheStats = await getCacheStats();
  } catch (error) {
    console.error('Health check: getCacheStats failed:', error);
    cacheStats = { searchResults: 0, locationCache: 0, connected: false };
  }
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    cache: {
      size: cache.size,
      supabase: cacheStats,
    },
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      serpapi: !!process.env.SERPAPI_KEY,
      reddit: !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
      eventbrite: !!process.env.EVENTBRITE_TOKEN,
      supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      geoapify: !!process.env.GEOAPIFY_API_KEY,
    },
  });
});

// Cache maintenance endpoint
app.post('/underfoot/cache/clean', async (_req, res) => {
  try {
    const success = await cleanExpiredCache();
    const stats = await getCacheStats();

    res.json({
      success,
      timestamp: new Date().toISOString(),
      cacheStats: stats,
    });
  } catch (error) {
    console.error('Cache cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Location normalization endpoint
app.post('/underfoot/normalize-location', async (req, res) => {
  const started = Date.now();
  const requestId = 'loc_' + randomUUID();
  try {
    const { input = '', force = false } = req.body || {};
    if (typeof input !== 'string' || !input.trim()) {
      return res.status(400).json({ error: 'input must be a non-empty string' });
    }

    const key = cacheKey('normalize:' + input);
    if (!force) {
      const hit = readCache(key);
      if (hit) {
        const served = hit._served || 0;
        const annotate = served >= 1;
        const next = { ...hit, _served: served + 1 };
        writeCache(key, next, CACHE_TTL_SECONDS);
        const out = { ...next };
        if (!annotate) {
          if (out.debug) {
            delete out.debug.cache;
          }
        } else {
          out.debug = { ...(out.debug || {}), cache: 'hit' };
        }
        delete out._served;
        return res.json(out);
      }
    }

    let upstreamStatus = null;
    let upstreamError = null;
    let json = null;
    let upstreamStarted = Date.now();
    if (process.env.GEOAPIFY_API_KEY) {
      const encoded = encodeURIComponent(input.trim());
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encoded}&limit=2&apiKey=${process.env.GEOAPIFY_API_KEY}`;
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
    } else {
      upstreamStatus = 200;
    }

    const feats = Array.isArray(json?.features) ? json.features : [];
    const candidates = feats.slice(0, 2).map((f) => {
      const props = f?.properties || {};
      const city = props.city || props.town || props.village || props.county || props.name;
      const region = props.state || props.region || props.province;
      const country = props.country || props.country_code;
      const parts = [city, region, country].filter(Boolean);
      const normalized = parts.join(', ');
      const confidence = Number(props?.rank?.confidence ?? props.confidence ?? 1);
      return {
        normalized,
        confidence: isFinite(confidence) ? confidence : 1,
        raw: { name: props.name, city, region, country, lat: props.lat, lon: props.lon },
      };
    });

    const selected =
      candidates
        .slice()
        .sort(
          (a, b) => b.confidence - a.confidence || a.normalized.length - b.normalized.length,
        )[0] || null;

    const heuristicConfidence = 0.9;
    const effectiveConfidence =
      selected?.confidence ?? (upstreamStatus >= 400 ? 0 : heuristicConfidence);
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
        heuristic: !selected ? true : undefined,
      },
    };

    console.log(
      JSON.stringify(
        {
          evt: 'normalize.result',
          requestId,
          upstreamStatus,
          upstreamError,
          candidateCount: candidates.length,
          top: selected?.normalized,
          confidence: payload.confidence,
        },
        null,
        0,
      ),
    );

    // Cache the payload (even if fallback) so a repeated request yields a cache hit annotation.
    // Store payload with internal served counter for deferred cache hit annotation.
    writeCache(key, { ...payload, _served: 0 }, CACHE_TTL_SECONDS);

    if (upstreamError || upstreamStatus >= 400) {
      payload.debug.fallback = true;
      payload.debug.fallbackReason = upstreamError || `status-${upstreamStatus}`;
      return res.status(200).json(payload);
    }
    return res.json(payload);
  } catch (err) {
    console.error('Error processing /underfoot/normalize-location:', err);
    return res.status(500).json({ error: 'Internal error', debug: { requestId } });
  }
});

// Legacy chat endpoint - now proxies to new search endpoint
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
      if (hit) {
        return res.json({ ...hit, debug: { ...(hit.debug || {}), cache: 'hit' } });
      }
    }

    // Call the new search endpoint internally
    const searchResponse = await fetch(`http://localhost:${PORT}/underfoot/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput: message, force }),
    });

    const searchData = await searchResponse.json();

    const finalPayload = {
      ...searchData,
      debug: {
        ...searchData.debug,
        requestId,
        executionTimeMs: Date.now() - started,
      },
    };

    if (searchResponse.ok) {
      writeCache(key, finalPayload, CACHE_TTL_SECONDS);
    }

    res.status(searchResponse.status).json(finalPayload);
  } catch (error) {
    console.error('Error processing /underfoot/chat:', error);
    res.status(500).json({
      error: 'Internal server error',
      debug: { requestId, executionTimeMs: Date.now() - started },
    });
  }
});

// SSE (pseudo streaming for now) GET /underfoot/chat?message=...&stream=true
// Re-uses the new search endpoint but frames output as SSE events
app.get('/underfoot/chat', async (req, res, next) => {
  let send = null;
  try {
    const stream = req.query.stream === 'true';
    if (!stream) {
      return next();
    }
    const message = (req.query.message || '').toString();
    const force = req.query.force === 'true';
    const started = Date.now();
    const requestId = 'uf_' + randomUUID();
    if (typeof message !== 'string' || !message.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Message must be a non-empty string' }));
    }

    // Connection limit (simple in-memory gauge)
    const max = Number(process.env.SSE_MAX_CONNECTIONS || 100);
    globalThis.__UF_SSE_COUNT__ = globalThis.__UF_SSE_COUNT__ || 0;
    if (globalThis.__UF_SSE_COUNT__ >= max) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Too many active streams' }));
    }
    globalThis.__UF_SSE_COUNT__++;

    // Prepare SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    send = (event, dataObj) => {
      try {
        const payload = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
        res.write(`event: ${event}\n` + `data: ${payload}\n\n`);
      } catch (err) {
        console.error('sse.write.error', err);
      }
    };

    const key = cacheKey(message);
    if (!force) {
      const hit = readCache(key);
      if (hit) {
        send('start', { requestId, protocolVersion: 1, cacheHit: true });
        const finalForReplay = { ...hit, debug: { ...(hit.debug || {}), cache: 'hit' } };
        send('complete', finalForReplay);
        send('end', { requestId });
        res.end();
        globalThis.__UF_SSE_COUNT__--;
        return;
      }
    }

    send('start', { requestId, protocolVersion: 1, cacheHit: false });

    let closed = false;
    const cleanup = () => {
      if (closed) {
        return;
      }
      closed = true;
      clearInterval(heartbeatTimer);
      globalThis.__UF_SSE_COUNT__ = Math.max(0, (globalThis.__UF_SSE_COUNT__ || 1) - 1);
    };
    req.on('close', () => {
      cleanup();
      console.log(JSON.stringify({ evt: 'sse.abort', requestId }, null, 0));
    });

    // Heartbeat every 20s to keep connection alive
    const heartbeatTimer = setInterval(() => {
      send('heartbeat', { ts: Date.now(), requestId });
    }, 20000).unref?.();

    // Call the new search endpoint internally
    const upstreamStarted = Date.now();
    let upstreamStatus = null;
    let upstreamJson = null;
    let upstreamError = null;
    try {
      const upstreamRes = await fetch(`http://localhost:${PORT}/underfoot/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput: message, force }),
      });
      upstreamStatus = upstreamRes.status;
      const text = await upstreamRes.text();
      try {
        upstreamJson = text ? JSON.parse(text) : {};
      } catch {
        upstreamError = 'Invalid JSON from search endpoint';
        upstreamJson = { raw: text };
      }
    } catch (err) {
      upstreamError = err?.message || 'Search endpoint fetch failed';
    }

    const base = typeof upstreamJson === 'object' && upstreamJson ? upstreamJson : {};
    const debug = {
      requestId,
      executionTimeMs: Date.now() - started,
      upstream: {
        status: upstreamStatus,
        elapsedMs: Date.now() - upstreamStarted,
        url: `/underfoot/search`,
        error: upstreamError || null,
      },
      messageEcho: message,
      receivedKeys: Object.keys(base),
      transport: 'sse',
    };

    console.log(
      JSON.stringify(
        {
          evt: 'chat.sse.result',
          requestId,
          upstreamStatus,
          upstreamError,
          receivedKeys: debug.receivedKeys,
          elapsedMs: debug.executionTimeMs,
          transport: 'sse',
        },
        null,
        0,
      ),
    );
    const finalPayload = { ...base, debug };
    if (!upstreamError && upstreamStatus === 200) {
      writeCache(key, finalPayload, CACHE_TTL_SECONDS);
    }

    send('complete', finalPayload);
    send('end', { requestId });
    res.end();
    cleanup();
  } catch (err) {
    try {
      if (res.headersSent) {
        if (typeof send === 'function') {
          send('error', { message: err?.message || 'Internal error', fatal: true });
          send('end', {});
        } else {
          res.write(
            `event: error\ndata: ${JSON.stringify({ message: err?.message || 'Internal error', fatal: true })}\n\n`,
          );
          res.write('event: end\ndata: {}\n\n');
        }
        res.end();
      } else {
        res.status(500).json({ error: 'Internal error (sse setup)', details: err?.message });
      }
    } catch {
      /* swallow */
    }
  }
});

// Server lifecycle: start once; reuse in tests without closing to avoid race conditions
const IS_TEST = !!process.env.VITEST;
let server;
if (!globalThis.__UNDERFOOT_SERVER__) {
  server = app.listen(PORT, () => {
    console.log(`🚇 Underfoot backend running on :${PORT}`);
    console.log(`🔍 New search system active - API routing enabled`);
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
  if (!hit) {
    return null;
  }
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
