import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || ''
const REDIS_ENABLED = !!REDIS_URL
const REDIS_PREFIX = 'trading:'
const STATE_TTL = 3600
const CANDLE_TTL = 300
const HEARTBEAT_TTL = 15

let pubClient = null
let subClient = null
let messageCallback = null
let connectAttempted = false
let connectionFailed = false

// In-memory fallback when Redis is unavailable
const memoryStore = new Map()
const memorySubscribers = new Map()

function log(...args) {
  console.log('[Redis]', ...args)
}
function warn(...args) {
  console.warn('[Redis]', ...args)
}

// ── Client creation with robust retry ─────────────────────────

function createClient(name, opts = {}) {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 10000)
      log(`${name} reconnect attempt ${times} in ${delay}ms`)
      return delay
    },
    reconnectOnError(err) {
      const targetError = 'READONLY'
      if (err.message.includes(targetError)) return true
      return false
    },
    lazyConnect: true,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    ...opts,
  })

  client.on('connecting', () => log(`${name} connecting...`))
  client.on('connect', () => log(`${name} connected`))
  client.on('ready', () => log(`${name} ready`))
  client.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      if (!connectionFailed) {
        connectionFailed = true
        warn(`${name} connection refused — using in-memory fallback`)
      }
    } else {
      warn(`${name} error:`, err.message)
    }
  })
  client.on('close', () => {
    if (REDIS_ENABLED) warn(`${name} disconnected`)
  })
  client.on('reconnecting', () => log(`${name} reconnecting...`))
  client.on('end', () => log(`${name} connection ended`))

  return client
}

// ── Connection lifecycle ──────────────────────────────────────

export async function connect() {
  if (!REDIS_URL) {
    log('REDIS_URL not set — using in-memory fallback')
    return false
  }
  if (connectAttempted) {
    if (connectionFailed) return false
    return pubClient !== null && subClient !== null
  }
  connectAttempted = true

  try {
    pubClient = createClient('Pub')
    subClient = createClient('Sub')

    await Promise.all([pubClient.connect(), subClient.connect()])
    connectionFailed = false

    subClient.on('message', (channel, message) => {
      if (channel === `${REDIS_PREFIX}messages` && messageCallback) {
        try {
          messageCallback(JSON.parse(message))
        } catch {}
      }
    })
    await subClient.subscribe(`${REDIS_PREFIX}messages`)

    log(`Connected to ${REDIS_URL.replace(/\/\/.*@/, '//***@')}`)
    log('Subscribed to trading:messages')
    return true
  } catch (e) {
    warn('Connection failed:', e.message, '— using in-memory fallback')
    pubClient = null
    subClient = null
    connectionFailed = true
    return false
  }
}

export function isEnabled() {
  return pubClient !== null && subClient !== null && !connectionFailed
}

// ── Pub/Sub ──────────────────────────────────────────────────

export function onMessage(cb) {
  messageCallback = cb
}

export async function publish(channel, message) {
  if (!pubClient) return
  try {
    await pubClient.publish(`${REDIS_PREFIX}${channel}`, JSON.stringify(message))
  } catch {}
}

// ── State persistence ─────────────────────────────────────────

function memSet(key, data, ttl) {
  memoryStore.set(key, { data, time: Date.now(), ttl })
}

function memGet(key) {
  const entry = memoryStore.get(key)
  if (!entry) return null
  if (Date.now() - entry.time > (entry.ttl || STATE_TTL) * 1000) {
    memoryStore.delete(key)
    return null
  }
  return entry.data
}

function memDel(key) {
  memoryStore.delete(key)
}

export async function setState(key, data, ttl = STATE_TTL) {
  if (isEnabled()) {
    try {
      const serialized = JSON.stringify(data)
      if (ttl > 0) {
        await pubClient.setex(`${REDIS_PREFIX}state:${key}`, ttl, serialized)
      } else {
        await pubClient.set(`${REDIS_PREFIX}state:${key}`, serialized)
      }
      return
    } catch {}
  }
  memSet(key, data, ttl)
}

export async function getState(key) {
  if (isEnabled()) {
    try {
      const raw = await pubClient.get(`${REDIS_PREFIX}state:${key}`)
      if (raw) return JSON.parse(raw)
    } catch {}
  }
  return memGet(key)
}

export async function delState(key) {
  if (isEnabled()) {
    try {
      await pubClient.del(`${REDIS_PREFIX}state:${key}`)
    } catch {}
  }
  memDel(key)
}

// ── Active symbols tracking (Redis Set) ───────────────────────

export async function addActiveSymbol(symbol) {
  if (isEnabled()) {
    try {
      await pubClient.sadd(`${REDIS_PREFIX}active:symbols`, symbol)
    } catch {}
    return
  }
  memorySubscribers.set(symbol, (memorySubscribers.get(symbol) || 0) + 1)
}

export async function removeActiveSymbol(symbol) {
  if (isEnabled()) {
    try {
      await pubClient.srem(`${REDIS_PREFIX}active:symbols`, symbol)
    } catch {}
    return
  }
  const count = memorySubscribers.get(symbol) || 1
  if (count <= 1) {
    memorySubscribers.delete(symbol)
  } else {
    memorySubscribers.set(symbol, count - 1)
  }
}

export async function getActiveSymbols() {
  if (isEnabled()) {
    try {
      return await pubClient.smembers(`${REDIS_PREFIX}active:symbols`)
    } catch {}
  }
  return [...memorySubscribers.keys()]
}

// ── Candle state backup ───────────────────────────────────────

export async function saveCandleState(symbol, interval, candle) {
  return setState(`candle:${symbol}:${interval}`, candle, CANDLE_TTL)
}

export async function getCandleState(symbol, interval) {
  return getState(`candle:${symbol}:${interval}`)
}

// ── Heartbeat / Instance tracking ─────────────────────────────

export async function heartbeat(instanceId) {
  if (!isEnabled()) return
  try {
    await pubClient.setex(`${REDIS_PREFIX}instance:${instanceId}`, HEARTBEAT_TTL, Date.now().toString())
  } catch {}
}

export async function getInstances() {
  if (!isEnabled()) return []
  try {
    const keys = await pubClient.keys(`${REDIS_PREFIX}instance:*`)
    return keys.map((k) => k.replace(`${REDIS_PREFIX}instance:`, ''))
  } catch {
    return []
  }
}

// ── Health check ──────────────────────────────────────────────

export async function ping() {
  if (!isEnabled()) return false
  try {
    const result = await pubClient.ping()
    return result === 'PONG'
  } catch {
    return false
  }
}

export function getStatus() {
  if (!REDIS_URL) return { mode: 'memory', reason: 'REDIS_URL not set' }
  if (connectionFailed) return { mode: 'memory', reason: 'connection failed' }
  if (!pubClient || !subClient) return { mode: 'memory', reason: 'not connected' }
  return { mode: 'redis', url: REDIS_URL.replace(/\/\/.*@/, '//***@') }
}

// ── Cleanup ───────────────────────────────────────────────────

export async function disconnect() {
  if (subClient) {
    try { await subClient.quit() } catch {}
  }
  if (pubClient) {
    try { await pubClient.quit() } catch {}
  }
  pubClient = null
  subClient = null
  memoryStore.clear()
  memorySubscribers.clear()
}

export default {
  connect,
  isEnabled,
  onMessage,
  publish,
  setState,
  getState,
  delState,
  addActiveSymbol,
  removeActiveSymbol,
  getActiveSymbols,
  saveCandleState,
  getCandleState,
  heartbeat,
  getInstances,
  ping,
  getStatus,
  disconnect,
}
