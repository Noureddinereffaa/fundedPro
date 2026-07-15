import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import Redis from 'ioredis'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '..', '.env') })

const PORT = Number(process.env.WS_V2_PORT) || 3003
const REDIS_URL = process.env.REDIS_URL || ''

if (!REDIS_URL) {
  console.warn('[WSv2] REDIS_URL not set — running with in-memory only (no Redis bridge)')
}

// ── Redis client (subscriber) ──────────────────────────────────

let sub = null
let pub = null

function connectRedis() {
  if (!REDIS_URL) return

  sub = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      return Math.min(times * 200, 10000)
    },
    lazyConnect: true,
  })

  pub = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      return Math.min(times * 200, 10000)
    },
    lazyConnect: true,
  })

  sub.on('error', (err) => console.warn('[WSv2] Redis sub error:', err.message))
  pub.on('error', (err) => console.warn('[WSv2] Redis pub error:', err.message))

  // Handle exact channel messages (tickers)
  sub.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message)
      const symbol = data.symbol
      if (!symbol) return

      const clients = subscriptions.get(symbol.toUpperCase())
      if (!clients || clients.size === 0) return

      const payload = JSON.stringify(data)
      for (const ws of clients) {
        if (ws.readyState === 1) {
          ws.send(payload)
        }
      }
    } catch (err) {
      console.warn('[WSv2] Redis message error:', err.message)
    }
  })

  // Handle pattern channel messages (candles via PSUBSCRIBE)
  sub.on('pmessage', (pattern, channel, message) => {
    try {
      const data = JSON.parse(message)
      const symbol = data.symbol
      if (!symbol) return

      const clients = subscriptions.get(symbol.toUpperCase())
      if (!clients || clients.size === 0) return

      const payload = JSON.stringify(data)
      for (const ws of clients) {
        if (ws.readyState === 1) {
          ws.send(payload)
        }
      }
    } catch (err) {
      console.warn('[WSv2] Redis pmessage error:', err.message)
    }
  })
}

// ── WebSocket Server ───────────────────────────────────────────

const httpServer = createServer()
const wss = new WebSocketServer({ server: httpServer })

// Map<symbol_upper, Set<WebSocket>>
const subscriptions = new Map()
// Refcounts for Redis subscriptions
const tickerSubCount = new Map()  // exact SUBSCRIBE count per symbol
const candleSubCount = new Map()  // pattern PSUBSCRIBE count per pattern

// ── Connection handler ─────────────────────────────────────────

wss.on('connection', (ws) => {
  ws._alive = true
  ws._lastPong = Date.now()

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      if (msg.type === 'pong') {
        ws._lastPong = Date.now()
        return
      }

      if (msg.type === 'subscribe') {
        handleSubscribe(ws, msg)
        return
      }

      if (msg.type === 'unsubscribe') {
        handleUnsubscribe(ws, msg)
        return
      }
    } catch (e) {
      console.warn('[WSv2] message error:', e?.message || e)
    }
  })

  ws.on('close', () => {
    for (const [symbol, clients] of subscriptions) {
      if (clients.has(ws)) {
        clients.delete(ws)
        if (clients.size === 0) {
          subscriptions.delete(symbol)
          removeTickerSubscription(symbol)
          removeCandleSubscription(symbol)
        }
      }
    }
  })

  ws.on('error', () => ws.terminate())
})

// ── Subscribe / Unsubscribe ────────────────────────────────────

function handleSubscribe(ws, msg) {
  const rawSymbols = msg.symbols || msg.symbol
  const symbols = Array.isArray(rawSymbols) ? rawSymbols : [rawSymbols]
  const isCandle = !!msg.interval

  for (const symbol of symbols) {
    const key = symbol.toUpperCase()

    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Set())
    }
    subscriptions.get(key).add(ws)

    if (isCandle) {
      addCandleSubscription(key)
    } else {
      addTickerSubscription(key)
    }

    // Send an initial confirmation
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'subscribed', symbol }))
    }
  }
}

function handleUnsubscribe(ws, msg) {
  const rawSymbols = msg.symbols || msg.symbol
  const symbols = Array.isArray(rawSymbols) ? rawSymbols : [rawSymbols]
  const isCandle = !!msg.interval

  for (const symbol of symbols) {
    const key = symbol.toUpperCase()
    const clients = subscriptions.get(key)
    if (clients) {
      clients.delete(ws)
      if (clients.size === 0) {
        subscriptions.delete(key)
        if (isCandle) {
          removeCandleSubscription(key)
        } else {
          removeTickerSubscription(key)
        }
      }
    }
  }
}

// Ticker subscriptions use exact Redis SUBSCRIBE
function addTickerSubscription(symbol) {
  if (!sub) return
  const key = symbol.toUpperCase()
  const count = tickerSubCount.get(key) || 0
  if (count === 0) {
    sub.subscribe(`market:ticker:${key}`)
      .catch(err => console.warn(`[WSv2] ticker subscribe error for ${key}:`, err.message))
  }
  tickerSubCount.set(key, count + 1)
}

function removeTickerSubscription(symbol) {
  if (!sub) return
  const key = symbol.toUpperCase()
  const count = tickerSubCount.get(key) || 1
  if (count <= 1) {
    tickerSubCount.delete(key)
    sub.unsubscribe(`market:ticker:${key}`)
      .catch(() => {})
  } else {
    tickerSubCount.set(key, count - 1)
  }
}

// Candle subscriptions use Redis PSUBSCRIBE for pattern matching
function addCandleSubscription(symbol) {
  if (!sub) return
  const key = symbol.toUpperCase()
  const pattern = `market:candle:${key}:*`
  const count = candleSubCount.get(pattern) || 0
  if (count === 0) {
    sub.psubscribe(pattern)
      .catch(err => console.warn(`[WSv2] candle psubscribe error for ${key}:`, err.message))
  }
  candleSubCount.set(pattern, count + 1)
}

function removeCandleSubscription(symbol) {
  if (!sub) return
  const key = symbol.toUpperCase()
  const pattern = `market:candle:${key}:*`
  const count = candleSubCount.get(pattern) || 1
  if (count <= 1) {
    candleSubCount.delete(pattern)
    sub.punsubscribe(pattern)
      .catch(() => {})
  } else {
    candleSubCount.set(pattern, count - 1)
  }
}

// ── Heartbeat ──────────────────────────────────────────────────

const HEARTBEAT_MS = 30000
const HEARTBEAT_TIMEOUT_MS = 60000

setInterval(() => {
  for (const ws of wss.clients) {
    if (Date.now() - ws._lastPong > HEARTBEAT_TIMEOUT_MS) {
      ws.terminate()
      continue
    }
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'ping' }))
    }
  }
}, HEARTBEAT_MS)

// ── Start ──────────────────────────────────────────────────────

httpServer.listen(PORT, async () => {
  console.log(`\n🔥 WS Bridge v2 running on ws://0.0.0.0:${PORT}`)
  console.log(`   ─────────────────────────────────────────────`)
  console.log(`   Mode:       ${REDIS_URL ? 'Redis Bridge' : 'Memory Only'}`)
  console.log(`   Heartbeat:  ${HEARTBEAT_MS}ms`)
  console.log(`   ─────────────────────────────────────────────\n`)

  connectRedis()
  if (sub) {
    try {
      await sub.connect()
      await pub.connect()
      console.log('[WSv2] Redis connected')
    } catch (err) {
      console.warn('[WSv2] Redis connection failed:', err.message)
    }
  }
})

// ── Graceful shutdown ──────────────────────────────────────────

function shutdown() {
  console.log('\n[WSv2] Shutting down...')
  wss.close()
  httpServer.close()
  if (sub) sub.quit().catch(() => {})
  if (pub) pub.quit().catch(() => {})
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
