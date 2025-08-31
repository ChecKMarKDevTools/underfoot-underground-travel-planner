import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

// Environment validation
const validateEnv = () => {
  const requiredEnvVars = [];
  const warnings = [];

  if (!process.env.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY not set - using fallback replies');
  }

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

const server = app.listen(PORT, () => {
  console.log(`🚇 Underfoot backend running on :${PORT}`);
  console.log(`🪨 Stonewalker webhook target: ${STONEWALKER_WEBHOOK}`);
  console.log(`💾 Cache TTL (seconds): ${CACHE_TTL_SECONDS}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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
