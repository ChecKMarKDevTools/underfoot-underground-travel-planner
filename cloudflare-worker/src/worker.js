// Underfoot Cloudflare Worker backend
// Provides: GET /health, POST /underfoot/chat, GET /underfoot/chat?chatInput=...&stream=true (SSE)
// Updated to use new self-contained search backend instead of n8n webhook

const cacheMap = new Map();
let activeSSE = 0;

const writeCache = (key, value, ttlSeconds) => {
  cacheMap.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
};
const readCache = (key) => {
  const rec = cacheMap.get(key);
  if (!rec) {
    return null;
  }
  if (Date.now() > rec.expires) {
    cacheMap.delete(key);
    return null;
  }
  return rec.value;
};

const json = (obj, status = 200, extraHeaders = {}) => {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
  });
};

const handleChatPost = async (request, env) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const chatInput = (body?.chatInput || body?.message || '').trim();
  const force = body?.force || false;
  if (!chatInput) {
    return json({ error: 'empty_chat_input' }, 400);
  }

  const key = chatInput.toLowerCase();
  const cached = readCache(key);
  const requestId = 'uf_' + crypto.randomUUID();
  if (cached && !force) {
    return json({ ...cached, debug: { ...(cached.debug || {}), cache: 'hit', requestId } });
  }

  // Use the new search backend instead of Stonewalker webhook
  const backendUrl = env.BACKEND_URL || 'http://localhost:3000';
  let upstreamStatus = 0;
  let upstreamError = null;
  let upstreamPayload = null;
  try {
    const upstreamRes = await fetch(`${backendUrl}/underfoot/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput, force }),
    });
    upstreamStatus = upstreamRes.status;
    const text = await upstreamRes.text();
    try {
      upstreamPayload = JSON.parse(text);
    } catch {
      upstreamError = 'invalid_upstream_json';
    }
  } catch (e) {
    upstreamError = e.message || 'upstream_fetch_error';
  }

  const base = {
    response: upstreamPayload?.response,
    items: upstreamPayload?.places || upstreamPayload?.items,
    user_intent: upstreamPayload?.user_intent,
    user_location: upstreamPayload?.user_location,
    requestId,
  };
  const debug = {
    requestId,
    upstreamStatus,
    upstreamError,
    cache: 'miss',
    backend: 'cloudflare-worker',
    upstream: upstreamPayload?.debug,
  };
  const finalPayload = { ...base, debug };
  if (!upstreamError && upstreamStatus === 200) {
    const ttl = Number(env.CACHE_TTL_SECONDS || 1800);
    writeCache(key, finalPayload, ttl);
  }
  const status = upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 200;
  return json(finalPayload, status);
};

const handleChatSSE = (url, env) => {
  const chatInput = (
    url.searchParams.get('chatInput') ||
    url.searchParams.get('message') ||
    ''
  ).trim();
  if (!chatInput) {
    return json({ error: 'missing_chatInput' }, 400);
  }
  const key = chatInput.toLowerCase();

  const max = Number(env.SSE_MAX_CONNECTIONS || 100);
  if (activeSSE >= max) {
    return json({ error: 'sse_over_capacity' }, 503);
  }
  activeSSE++;

  const requestId = 'uf_' + crypto.randomUUID();
  const cached = readCache(key);

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const writeEvent = (evt, data) =>
    writer.write(enc.encode(`event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`));

  let heartbeatTimer;
  const cleanup = () => {
    try {
      heartbeatTimer && clearInterval(heartbeatTimer);
    } catch {
      // Ignore cleanup errors
    }
    try {
      writer.close();
    } catch {
      // Ignore cleanup errors
    }
    activeSSE--;
  };

  writeEvent('start', { requestId, protocolVersion: 1, cacheHit: !!cached })
    .then(async () => {
      if (cached) {
        await writeEvent('complete', cached);
        await writeEvent('end', { requestId });
        cleanup();
        return;
      }
      // upstream fetch using new backend
      const backendUrl = env.BACKEND_URL || 'http://localhost:3000';
      let upstreamStatus = 0;
      let upstreamError = null;
      let upstreamPayload = null;
      try {
        const upstreamRes = await fetch(`${backendUrl}/underfoot/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatInput }),
        });
        upstreamStatus = upstreamRes.status;
        const text = await upstreamRes.text();
        try {
          upstreamPayload = JSON.parse(text);
        } catch {
          upstreamError = 'invalid_upstream_json';
        }
      } catch (e) {
        upstreamError = e.message || 'upstream_fetch_error';
      }

      const base = {
        response: upstreamPayload?.response,
        items: upstreamPayload?.places || upstreamPayload?.items,
        user_intent: upstreamPayload?.user_intent,
        user_location: upstreamPayload?.user_location,
        requestId,
      };
      const debug = {
        requestId,
        upstreamStatus,
        upstreamError,
        cache: 'miss',
        backend: 'cloudflare-worker-sse',
        upstream: upstreamPayload?.debug,
      };
      const finalPayload = { ...base, debug };
      if (!upstreamError && upstreamStatus === 200) {
        writeCache(key, finalPayload, Number(env.CACHE_TTL_SECONDS || 1800));
      }
      await writeEvent('complete', finalPayload);
      await writeEvent('end', { requestId });
      cleanup();
    })
    .catch(() => cleanup());

  heartbeatTimer = setInterval(() => {
    writeEvent('heartbeat', { ts: Date.now(), requestId }).catch(() => cleanup());
  }, 20000);

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    if (pathname === '/health') {
      return json({ ok: true, cache: { size: cacheMap.size }, activeSSE });
    }
    if (pathname === '/underfoot/chat' && request.method === 'POST') {
      return handleChatPost(request, env);
    }
    if (
      pathname === '/underfoot/chat' &&
      request.method === 'GET' &&
      searchParams.get('stream') === 'true'
    ) {
      return handleChatSSE(url, env);
    }

    return json({ error: 'not_found' }, 404);
  },
};
