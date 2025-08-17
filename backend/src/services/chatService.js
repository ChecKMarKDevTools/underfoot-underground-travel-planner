// Chat service: encapsulates parsing, fetching, caching, and composing replies
import { config } from '../config/index.js'
import { demoFetch } from './fetchAdapter.js'

const approx = (mi) => (mi != null ? `≈${mi} mi` : '')

const parseMessage = (text, DEFAULT_RADIUS) => {
  try {
    const locMatch = text.match(/([A-Za-z][A-Za-z\s]+,\s?[A-Z]{2})/)
    const vibeMatch = text.match(/\b(outdoors|history|food|art|music|quirky|nature|hike|coffee)\b/i)
    const radiusMatch = text.match(/(\d+)\s*mile[s]?(?:\s+radius)?/i)

    const radius = radiusMatch ? Math.max(1, Math.min(100, Number(radiusMatch[1]))) : DEFAULT_RADIUS

    return {
      location: locMatch?.[1] || 'Pikeville, KY',
      vibe: vibeMatch?.[0]?.toLowerCase() || '',
      radius: radius
    }
  } catch (error) {
    console.error('Error parsing message:', error)
    return {
      location: 'Pikeville, KY',
      vibe: '',
      radius: DEFAULT_RADIUS
    }
  }
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

const cacheKey = (parsed, radius) => {
  const { location, vibe } = parsed
  return `${location}|${vibe}|${radius}`
}

export default class ChatService {
  constructor() {
    this.cache = new Map()
    this.defaultRadius = config.DEFAULT_RADIUS_MILES
    this.maxRadius = config.MAX_RADIUS_MILES
    this.cacheTtl = config.CACHE_TTL_SECONDS
  }

  readCache(key) {
    const hit = this.cache.get(key)
    if (!hit) return null
    if (Date.now() > hit.expires) {
      this.cache.delete(key)
      return null
    }
    return hit.value
  }

  writeCache(key, value, ttlSeconds = this.cacheTtl) {
    this.cache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 })
  }

  async handleChat(body) {
    const { message = '', limit = 5, force = false } = body || {}
    if (typeof message !== 'string') {
      const err = new Error('Message must be a string')
      err.status = 400
      throw err
    }

    const parsedLimit = Math.max(1, Math.min(20, Number(limit) || 5))
    const parsed = parseMessage(String(message), this.defaultRadius)
    const userRadius = parsed.radius
    const key = cacheKey(parsed, userRadius)

    if (!force) {
      const hit = this.readCache(key)
      if (hit) return hit
    }

    const tiers = [userRadius, Math.min(userRadius * 2, this.maxRadius), Math.min(userRadius * 4, this.maxRadius)]
    let gathered = { core: [], stretch: [], nearby: [] }
    for (let i = 0; i < tiers.length; i++) {
      const miles = tiers[i]
      const raw = demoFetch(parsed, miles) // stub
      const bucket = i === 0 ? 'core' : i === 1 ? 'stretch' : 'nearby'
      gathered[bucket] = dedupe(filterBlocked(raw.items))
      const total = gathered.core.length + gathered.stretch.length + gathered.nearby.length
      if (total >= Math.max(4, Math.min(6, parsedLimit))) break
    }

    const primary = [...gathered.core, ...gathered.stretch].slice(0, 5)
    const leftover = [...gathered.core, ...gathered.stretch].slice(5)
    const nearby = [...leftover, ...gathered.nearby].slice(0, 2)

    const reply = await this.composeReply(parsed, primary, nearby)

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
        filtered: { primary, nearby }
      }
    }

    this.writeCache(key, payload, this.cacheTtl)
    return payload
  }

  async composeReply(parsed, primary, nearby) {
    if (!config.OPENAI_API_KEY) {
      const p = primary.map((it, i) => `${i + 1}. ${it.name} — ${it.blurb} (${approx(it.distanceMi)})`).join('\n')
      const n = nearby.length ? `\n\nNear(ish) by:\n${nearby.map(it => `• ${it.name} — ${approx(it.distanceMi)}`).join('\n')}` : ''
      const radiusNote = parsed.radius !== this.defaultRadius ? ` within ${parsed.radius} miles` : ` (searched ${parsed.radius} mile radius)`
      return `Alright, ${parsed.location}${radiusNote}. I found some underground gems.\n\nTop picks:\n${p}${n}`
    }
    // Real OpenAI integration would go here.
    return ''
  }
}
