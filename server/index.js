import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import redis from './redis.js'
import {
  PORT,
  wss,
  wsMeta,
  HEARTBEAT_MS,
  HEARTBEAT_TIMEOUT_MS,
  httpServer,
  broadcastTo,
  subscribers,
  symbolTimers,
  priceCache,
  tickBuffers,
  candleStates,
  klinesCache,
  activeSubMinute,
  saveState,
  saveStateSync,
  SYMBOL_MAP,
  SYMBOL_TYPE,
  ALL_INTERVALS,
} from './lib/engine.js'
import { handleSubscribe, handleUnsubscribe } from './lib/ws-handlers.js'
import {
  connectBinance,
  startBinanceWatchdog,
  unsubscribeBinance,
} from './data-sources/binance.js'


const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

// ── Heartbeat ───────────────────────────────────────────────

function heartbeat() {
  for (const ws of wss.clients) {
    const meta = wsMeta.get(ws)
    if (!meta) continue
    if (Date.now() - meta.lastPong > HEARTBEAT_TIMEOUT_MS) {
      ws.terminate()
      continue
    }
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'ping' }))
    }
  }
}
setInterval(heartbeat, HEARTBEAT_MS)

// ── Cleanup intervals ───────────────────────────────────────

setInterval(() => {
  const now = Date.now()
  for (const [symbol, data] of priceCache) {
    if (now - data.lastUpdated > 300000) priceCache.delete(symbol)
  }
  for (const [symbol, clients] of subscribers) {
    if (clients.size === 0 && !symbolTimers.has(symbol)) {
      tickBuffers.delete(symbol)
      candleStates.delete(symbol)
    }
  }
  for (const [key, entry] of klinesCache) {
    if (now - entry.time > 7200000) klinesCache.delete(key)
  }
}, 600000)

// ── WebSocket Server ────────────────────────────────────────

wss.on('connection', (ws) => {
  wsMeta.set(ws, { alive: true, lastPong: Date.now() })

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      if (msg.type === 'pong') {
        const meta = wsMeta.get(ws)
        if (meta) meta.lastPong = Date.now()
        return
      }
      if (msg.type === 'subscribe') {
        await handleSubscribe(ws, msg)
        return
      }
      if (msg.type === 'unsubscribe') {
        handleUnsubscribe(ws, msg)
        return
      }
    } catch (e) {
      console.warn(`[WS] message handler error:`, e?.message || e)
    }
  })

  ws.on('close', () => {
    for (const [symbol, clients] of subscribers) {
      clients.delete(ws)
      if (clients.size === 0) {
        activeSubMinute.delete(symbol)
        unsubscribeBinance(symbol)
        redis.removeActiveSymbol(symbol)
      }
    }
  })

  ws.on('error', () => ws.terminate())
})

// ── Start server ────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`\n🔥 Real-time Engine v5 running on ws://localhost:${PORT}`)
  console.log(`   ─────────────────────────────────────────────`)
  console.log(`   Intervals:   ${ALL_INTERVALS.length}`)
  console.log(`   Symbols:     ${Object.keys(SYMBOL_MAP).length}`)
  console.log(`   Heartbeat:   ${HEARTBEAT_MS}ms`)
  console.log(`   ─────────────────────────────────────────────`)
  console.log(`   Binance:     !miniTicker@arr (All Crypto — real-time ~1s)`)
  console.log(`   ─────────────────────────────────────────────\n`)

  connectBinance()
  startBinanceWatchdog()
})

// ── Graceful shutdown ───────────────────────────────────────

process.on('SIGINT', () => {
  saveStateSync()
  process.exit(0)
})
process.on('SIGTERM', () => {
  saveStateSync()
  process.exit(0)
})
