import Redis from 'ioredis'
import crypto from 'crypto'

const REDIS_URL = process.env.REDIS_URL || ''
const KEY_PREFIX = 'api:bl:'
const MEMORY_MAX_SIZE = 10_000

let client: Redis | null = null
let enabled = false
let fallbackMode = false

const memoryBlacklist = new Map<string, number>()
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function createClient() {
  const c = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      return Math.min(times * 200, 10_000)
    },
    lazyConnect: true,
    enableOfflineQueue: false,
  })
  c.on('error', (err: any) => {
    if (err?.code === 'ECONNREFUSED' && !fallbackMode) {
      fallbackMode = true
      console.warn('[TokenBlacklist] Redis connection refused — using in-memory fallback')
    }
  })
  c.on('connect', () => {
    if (fallbackMode) console.log('[TokenBlacklist] Redis reconnected')
    fallbackMode = false
  })
  c.on('close', () => {
    if (enabled) console.warn('[TokenBlacklist] Redis disconnected')
  })
  return c
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function isRedisAvailable() {
  return enabled && !fallbackMode && client !== null
}

// ── In-memory fallback ──────────────────────────────────────

function purgeExpiredMemory(): void {
  const now = Date.now()
  for (const [key, exp] of memoryBlacklist) {
    if (exp <= now) memoryBlacklist.delete(key)
  }
}

function startMemoryCleanup(): void {
  if (cleanupTimer) return
  cleanupTimer = setInterval(purgeExpiredMemory, 60_000).unref?.() as ReturnType<typeof setInterval>
}

// ── Public API ──────────────────────────────────────────────

export async function initBlacklist(): Promise<boolean> {
  if (!REDIS_URL) {
    console.log('[TokenBlacklist] REDIS_URL not set — using in-memory mode')
    return false
  }
  client = createClient()
  try {
    await client.connect()
    enabled = true
    fallbackMode = false
    console.log('[TokenBlacklist] Connected to Redis')
    return true
  } catch (e: any) {
    console.warn('[TokenBlacklist] Redis connection failed:', e.message, '— using in-memory')
    client = null
    return false
  }
}

/**
 * Add a token to the blacklist until its expiry time.
 * Redis keys auto-expire via EXAT; in-memory entries use periodic purge.
 */
export async function addToBlacklist(token: string, exp: number): Promise<void> {
  const ttlMs = exp - Date.now()
  if (ttlMs <= 0) return

  if (isRedisAvailable()) {
    const ttlSeconds = Math.ceil(ttlMs / 1000)
    try {
      await client!.setex(`${KEY_PREFIX}${hashToken(token)}`, ttlSeconds, '1')
      return
    } catch {
      // Fall through to memory
    }
  }

  // In-memory fallback
  if (memoryBlacklist.size >= MEMORY_MAX_SIZE) purgeExpiredMemory()
  if (memoryBlacklist.size >= MEMORY_MAX_SIZE) {
    const oldest = memoryBlacklist.keys().next().value
    if (oldest) memoryBlacklist.delete(oldest)
  }
  memoryBlacklist.set(token, exp)
  startMemoryCleanup()
}

/**
 * Returns true if the token has been revoked.
 * Redis: O(1) EXISTS check. In-memory: Map lookup with lazy eviction.
 */
export async function isBlacklisted(token: string): Promise<boolean> {
  if (isRedisAvailable()) {
    try {
      const exists = await client!.exists(`${KEY_PREFIX}${hashToken(token)}`)
      return exists === 1
    } catch {
      return false
    }
  }

  // In-memory fallback
  const exp = memoryBlacklist.get(token)
  if (exp === undefined) return false
  if (exp <= Date.now()) {
    memoryBlacklist.delete(token)
    return false
  }
  return true
}

/**
 * Expose current blacklist size.
 * Redis: counts keys via SCAN (cached for 30s). In-memory: direct Map size.
 */
let cachedRedisSize = 0
let cacheTimestamp = 0

export async function getBlacklistSize(): Promise<number> {
  if (isRedisAvailable()) {
    const now = Date.now()
    if (now - cacheTimestamp < 30_000) return cachedRedisSize
    try {
      let count = 0
      let cursor = '0'
      do {
        const [nextCursor, keys] = await client!.scan(cursor, 'MATCH', `${KEY_PREFIX}*`, 'COUNT', 100)
        cursor = nextCursor
        count += keys.length
      } while (cursor !== '0')
      cachedRedisSize = count
      cacheTimestamp = now
      return count
    } catch {
      return cachedRedisSize
    }
  }
  return memoryBlacklist.size
}

export async function disconnectBlacklist(): Promise<void> {
  if (client) {
    try { await client.quit() } catch {}
    client = null
    enabled = false
  }
}
