import 'dotenv/config'
import express from 'express'
import cors from 'cors'

// Environment validation
const validateEnv = () => {
  const requiredEnvVars = []
  const warnings = []

  if (!process.env.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY not set - using fallback replies')
  }

  if (requiredEnvVars.length > 0) {
    console.error('Missing required environment variables:', requiredEnvVars)
    process.exit(1)
  }

  if (warnings.length > 0) {
    warnings.forEach(warning => console.warn(`⚠️  ${warning}`))
  }
}

validateEnv()

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const PORT = Number(process.env.PORT || 3000)
const DEFAULT_RADIUS = Number(process.env.DEFAULT_RADIUS_MILES || 10)
const MAX_RADIUS = Number(process.env.MAX_RADIUS_MILES || 40)
const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 60)

const cache = new Map()

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    cache: {
      size: cache.size
    }
  })
})

app.post('/chat', async (req, res) => {
  const started = Date.now()
  try {
    // Input validation
    const { message = '', limit = 5, force = false } = req.body || {}

    if (typeof message !== 'string') {
      return res.status(400).json({ error: 'Message must be a string' })
    }

    const parsedLimit = Math.max(1, Math.min(20, Number(limit) || 5))
    const parsed = parseMessage(String(message))
    const userRadius = parsed.radius // Use the radius from user input
    const key = cacheKey(parsed, userRadius)

    if (!force) {
      const hit = readCache(key)
      if (hit) return res.json(hit)
    }

    const tiers = [userRadius, Math.min(userRadius * 2, MAX_RADIUS), Math.min(userRadius * 4, MAX_RADIUS)]
    let gathered = { core: [], stretch: [], nearby: [] }
    for (let i = 0; i < tiers.length; i++) {
      const miles = tiers[i]
      const raw = demoFetch(parsed, miles) // ← stub instead of n8n
      const bucket = i === 0 ? 'core' : i === 1 ? 'stretch' : 'nearby'
      gathered[bucket] = dedupe(filterBlocked(raw.items))
      const total = gathered.core.length + gathered.stretch.length + gathered.nearby.length
      if (total >= Math.max(4, Math.min(6, parsedLimit))) break
    }

    // pick for primary / nearby
    const primary = [...gathered.core, ...gathered.stretch].slice(0, 5)
    const leftover = [...gathered.core, ...gathered.stretch].slice(5)
    const nearby = [...leftover, ...gathered.nearby].slice(0, 2)

    // witty reply (OpenAI optional)
    const reply = await composeReply(parsed, primary, nearby)

    const payload = {
      reply,
      debug: {
        parsed,
        radiusCore: userRadius,
        radiusUsed: tiers.findLast(t => gathered.core.length + gathered.stretch.length + gathered.nearby.length > 0) || userRadius,
        coreCount: gathered.core.length,
        stretchCount: gathered.stretch.length,
        nearbyCount: gathered.nearby.length,
        raw: { core: gathered.core, stretch: gathered.stretch, nearby: gathered.nearby },
        filtered: { primary, nearby },
        executionTimeMs: Date.now() - started
      }
    }

    writeCache(key, payload, CACHE_TTL_SECONDS)
    res.json(payload)
  } catch (error) {
    console.error('Error processing chat request:', error)
    res.status(500).json({
      error: 'Internal server error',
      debug: {
        executionTimeMs: Date.now() - started
      }
    })
  }
})

const server = app.listen(PORT, () => {
  console.log(`🚇 Underfoot backend running on :${PORT}`)
  console.log(`📍 Default search radius: ${DEFAULT_RADIUS} miles`)
  console.log(`💾 Cache TTL: ${CACHE_TTL_SECONDS} seconds`)
})

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`)
  server.close(() => {
    console.log('HTTP server closed.')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

const parseMessage = (text) => {
  try {
    const locMatch = text.match(/([A-Za-z][A-Za-z\s]+,\s?[A-Z]{2})/)
    const vibeMatch = text.match(/\b(outdoors|history|food|art|music|quirky|nature|hike|coffee)\b/i)
    const radiusMatch = text.match(/(\d+)\s*mile[s]?(?:\s+radius)?/i)

    const radius = radiusMatch ? Math.max(1, Math.min(100, Number(radiusMatch[1]))) : DEFAULT_RADIUS // limit to 100 miles

    return {
      location: locMatch?.[1] || 'Pikeville, KY',
      vibe: vibeMatch?.[0]?.toLowerCase() || '',
      radius: radius
    }
  } catch (error) {
    console.error('Error parsing message:', error)
    // Return fallback values
    return {
      location: 'Pikeville, KY',
      vibe: '',
      radius: DEFAULT_RADIUS
    }
  }
}

const demoFetch = (parsed, radiusMiles) => {
  // stubbed candidates with fake distances; pretend this came from n8n
  const pool = [
    { name: 'Hidden Trail Overlook', blurb: 'Sunrise ridge locals love.', url: 'https://localblog.example/overlook', host: 'localblog.example', distanceMi: 6 },
    { name: 'Basement Bluegrass Night', blurb: 'Thursday pickers’ circle.', url: 'https://indiecalendar.example/bluegrass', host: 'indiecalendar.example', distanceMi: 2 },
    { name: 'Pop-up Hand Pie Window', blurb: 'Rotating flavors by the river.', url: 'https://substack.example/pies', host: 'substack.example', distanceMi: 12 },
    { name: 'Art Alley Micro-Gallery', blurb: 'Unmarked door, student shows.', url: 'https://campus.example/art', host: 'campus.example', distanceMi: 17 },
    { name: 'Coal Camp History Walk', blurb: 'Occasional docent strolls.', url: 'https://historyclub.example/walk', host: 'historyclub.example', distanceMi: 28 },
    { name: 'Creekside Night Market', blurb: 'DIY crafts and late bites.', url: 'https://indiecommunity.example/market', host: 'indiecommunity.example', distanceMi: 33 },
    { name: 'Old Rail Tunnel Echoes', blurb: 'Acoustic geek spot.', url: 'https://railnerds.example/echo', host: 'railnerds.example', distanceMi: 41 } // beyond 40
  ]
  return { items: pool.filter(x => x.distanceMi <= radiusMiles) }
}

const filterBlocked = (items) => {
  const blocked = ['tripadvisor', 'yelp', 'foursquare', 'facebook', 'instagram']
  return items.filter(x => !blocked.some(b => x.url.includes(b)))
}

const dedupe = (items) => {
  const seen = new Set()
  return items.filter(x => {
    const k = x.url.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const cacheKey= (parsed, radius) => {
  const { location, vibe } = parsed
  return `${location}|${vibe}|${radius}`
}

const readCache = (key) => {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    cache.delete(key)
    return null
  }
  return hit.value
}

const writeCache = (key, value, ttlSeconds) => {
  cache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 })
}

const composeReply = async (parsed, primary, nearby) => {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    // cost-free local reply
    const p = primary.map((it, i) => `${i + 1}. ${it.name} — ${it.blurb} (${approx(it.distanceMi)})`).join('\n')
    const n = nearby.length ? `\n\nNear(ish) by:\n${nearby.map(it => `• ${it.name} — ${approx(it.distanceMi)}`).join('\n')}` : ''
    const radiusNote = parsed.radius !== DEFAULT_RADIUS ? ` within ${parsed.radius} miles` : ` (searched ${parsed.radius} mile radius)`
    return `Alright, ${parsed.location}${radiusNote}. I found some underground gems.\n\nTop picks:\n${p}${n}`
  }
  // If you want real style: uncomment and use OpenAI call here.
  // Keeping stubbed to avoid spend during local bring-up.
  // const p = primary.map((it, i) => `${i + 1}. ${it.name} — ${it.blurb} (${approx(it.distanceMi)})`).join('\n')
  // const n = nearby.length ? `\n\nNear(ish) by:\n${nearby.map(it => `• ${it.name} — ${approx(it.distanceMi)}`).join('\n')}` : ''
  // const radiusNote = parsed.radius !== DEFAULT_RADIUS ? ` within ${parsed.radius} miles` : ` (searched ${parsed.radius} mile radius)`
  // return `Alright, ${parsed.location}${radiusNote}. I found some underground gems.\n\nTop picks:\n${p}${n}`
}

const approx = (mi) => {
  return mi != null ? `≈${mi} mi` : ''
}
