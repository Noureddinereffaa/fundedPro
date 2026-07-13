import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || ''
const CACHE_PREFIX = 'api:cache:'
const DEFAULT_TTL = 30

let client: Redis | null = null
let enabled = false
let fallbackMode = false

function createClient() {
  const c = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      return Math.min(times * 200, 10000)
    },
    lazyConnect: true,
    enableOfflineQueue: false,
  })
  c.on('error', (err: any) => {
    if (err?.code === 'ECONNREFUSED' && !fallbackMode) {
      fallbackMode = true
      console.warn('[RedisCache] Connection refused — using in-memory fallback')
    }
  })
  c.on('connect', () => { fallbackMode = false })
  c.on('close', () => { if (enabled) console.warn('[RedisCache] Disconnected') })
  return c
}

function isAvailable() { return enabled && !fallbackMode }

export async function initCache() {
  if (!REDIS_URL) {
    console.log('[RedisCache] REDIS_URL not set — disabled')
    return false
  }
  client = createClient()
  try {
    await client.connect()
    enabled = true
    fallbackMode = false
    console.log('[RedisCache] Connected')
    return true
  } catch (e: any) {
    console.warn('[RedisCache] Connection failed:', e.message, '— disabled')
    client = null
    return false
  }
}

export async function getCached<T>(key: string): Promise<T | null> {
  if (!isAvailable() || !client) return null
  try {
    const raw = await client.get(`${CACHE_PREFIX}${key}`)
    return raw ? JSON.parse(raw) as T : null
  } catch { return null }
}

export async function setCache(key: string, data: unknown, ttl = DEFAULT_TTL) {
  if (!isAvailable() || !client) return
  try {
    await client.setex(`${CACHE_PREFIX}${key}`, ttl, JSON.stringify(data))
  } catch { /* skip */ }
}

export async function delCache(key: string) {
  if (!isAvailable() || !client) return
  try { await client.del(`${CACHE_PREFIX}${key}`) } catch { /* skip */ }
}

export async function disconnectCache() {
  if (client) {
    try { await client.quit() } catch {}
    client = null
    enabled = false
  }
}

export function getCacheStatus() {
  if (!REDIS_URL) return { mode: 'disabled', reason: 'REDIS_URL not set' }
  if (fallbackMode) return { mode: 'memory', reason: 'connection failed' }
  if (!enabled || !client) return { mode: 'disabled', reason: 'not connected' }
  return { mode: 'redis' }
}
