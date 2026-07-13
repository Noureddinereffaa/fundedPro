import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import symbols from '../../shared/symbols.json' with { type: 'json' }
import { ALL_INTERVALS, COMMON_INTERVALS, cacheTTL } from '../../shared/constants.js'
import fs from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import redis from '../redis.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PERSISTENCE_FILE = join(__dirname, '..', 'market_state.json')

// ── Constants ──

export const PORT = Number(process.env.WS_PORT || process.env.PORT || 3002)
export const HEARTBEAT_MS = 15000
export const HEARTBEAT_TIMEOUT_MS = 30000
export const MAX_FAILS = 5

export { ALL_INTERVALS, COMMON_INTERVALS, cacheTTL }

export const TD_API_KEY = process.env.TWELVEDATA_API_KEY
export const POLL_INTERVAL = { crypto: 2000 }

// ── Symbol maps ──

export const SYMBOL_MAP = {}
export const SYMBOL_TYPE = {}

for (const [sym, info] of Object.entries(symbols)) {
  SYMBOL_MAP[sym] = { binance: info.binance, digits: info.digits }
  SYMBOL_TYPE[sym] = 'crypto'
}

// ── Global State ──

export const tickBuffers = new Map()
export const candleStates = new Map()
export const subscribers = new Map()
export const priceCache = new Map()
export const symbolTimers = new Map()
export const wsMeta = new WeakMap()
export const activeSubMinute = new Set()
export const klinesCache = new Map()
export const activeIntervals = new Map()
const lastRedisSave = new Map()

klinesCache.clear()

// ── Helpers ──

export function getTicks(symbol) {
  if (!tickBuffers.has(symbol)) tickBuffers.set(symbol, [])
  return tickBuffers.get(symbol)
}

export function addActiveInterval(symbol, intervalId) {
  if (!activeIntervals.has(symbol)) activeIntervals.set(symbol, new Set())
  activeIntervals.get(symbol).add(intervalId)
}

export function removeActiveInterval(symbol, intervalId) {
  const set = activeIntervals.get(symbol)
  if (set) {
    set.delete(intervalId)
    if (set.size === 0) activeIntervals.delete(symbol)
  }
}

export function toSecTimestamp(ts) {
  if (typeof ts === 'number' && ts > 1e12) return Math.floor(ts / 1000)
  return Number(ts) || Math.floor(Date.now() / 1000)
}

// ── Candle Engine ──

const TICK_VOLUME_BASE = { crypto: 0.8 }

function generateTickVolume(price) {
  const b = TICK_VOLUME_BASE.crypto
  const priceFactor = Math.max(0.1, Math.min(5, price / 100))
  const seed = Math.abs(Math.sin(price * 137.508)) * 0.5 + 0.5
  return +(b * priceFactor * seed).toFixed(2)
}

export function processTick(symbol, price, time) {
  if (price == null || typeof price !== 'number' || !isFinite(price)) return
  time = toSecTimestamp(time)
  if (time == null || typeof time !== 'number' || !isFinite(time)) return
  const ticks = getTicks(symbol)
  const last = ticks[ticks.length - 1]
  if (last && last.price === price && time - last.time < 2) return
  ticks.push({ price, time })
  if (ticks.length > 100000) { tickBuffers.set(symbol, ticks.slice(20000)); return }

  const hasSubs = subscribers.has(symbol) && subscribers.get(symbol).size > 0
  if (!hasSubs && !candleStates.has(symbol)) return

  const sc = candleStates.get(symbol) || new Map()
  candleStates.set(symbol, sc)
  const targetIntervals = hasSubs && activeIntervals.has(symbol) ? activeIntervals.get(symbol) : null
  const intervalList = hasSubs ? ALL_INTERVALS : ALL_INTERVALS.filter((i) => COMMON_INTERVALS.includes(i.id))

  for (const interval of intervalList) {
    const ct = Math.floor(time / interval.sec) * interval.sec
    const existing = sc.get(interval.id)
    if (!existing || existing.time !== ct) {
      if (existing && hasSubs && (!targetIntervals || targetIntervals.has(interval.id))) {
        broadcast(symbol, { type: 'candle', symbol, interval: interval.id, kline: existing })
      }
      sc.set(interval.id, {
        time: ct,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: generateTickVolume(price),
      })
    } else {
      existing.high = Math.max(existing.high, price)
      existing.low = Math.min(existing.low, price)
      existing.close = price
      existing.volume = (existing.volume || 0) + generateTickVolume(price)
      if (hasSubs && (!targetIntervals || targetIntervals.has(interval.id))) {
        broadcast(symbol, { type: 'candle_update', symbol, interval: interval.id, kline: { ...existing } })
      }
    }
  }

  if (sc.size > 0) {
    const now = Date.now()
    const lastSave = lastRedisSave.get(symbol) || 0
    if (now - lastSave > 5000) {
      lastRedisSave.set(symbol, now)
      for (const ci of COMMON_INTERVALS) {
        const candle = sc.get(ci)
        if (candle) redis.saveCandleState(symbol, ci, candle)
      }
    }
  }
}

export function getRecentCandles(symbol, intervalId, count = 300) {
  const ticks = getTicks(symbol)
  const intervalSec = ALL_INTERVALS.find((i) => i.id === intervalId)?.sec
  if (!intervalSec || ticks.length < 2) return []
  const now = ticks[ticks.length - 1].time
  const startTime = now - intervalSec * count
  let lo = 0,
    hi = ticks.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (ticks[mid].time >= startTime) hi = mid
    else lo = mid + 1
  }
  if (lo >= ticks.length) return []
  const relevant = ticks.slice(lo)
  if (relevant.length < 2) return []
  const candles = []
  let current = null
  for (const tick of relevant) {
    const ct = Math.floor(tick.time / intervalSec) * intervalSec
    if (!current || current.time !== ct) {
      if (current) candles.push({ ...current })
      current = {
        time: ct,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: 0,
      }
    } else {
      current.high = Math.max(current.high, tick.price)
      current.low = Math.min(current.low, tick.price)
      current.close = tick.price
    }
  }
  if (current) candles.push({ ...current })
  return candles.slice(-count)
}

export function interpolateCandles(sourceCandles, fromSec, toSec) {
  const ratio = fromSec / toSec
  if (ratio < 2 || !Number.isInteger(ratio)) return sourceCandles
  const result = []
  const steps = ratio
  for (const src of sourceCandles) {
    const { time, open, high, low, close, volume } = src
    let prevClose = open
    const stepVolume = +(volume / steps).toFixed(2)
    for (let i = 0; i < steps; i++) {
      const t = time + i * toSec
      const progress = (i + 1) / steps
      const val = open + (close - open) * progress
      const midHigh = (open + close + high) / 3
      const midLow = (open + close + low) / 3
      const stepOpen = +prevClose.toFixed(8)
      const stepClose = i === steps - 1 ? +close.toFixed(8) : +val.toFixed(8)
      const stepHigh = +Math.max(
        stepOpen,
        stepClose,
        midHigh * 0.999 + Math.abs(close - open) * 0.001,
      ).toFixed(8)
      const stepLow = +Math.min(stepOpen, stepClose, midLow * 1.001 - Math.abs(close - open) * 0.001).toFixed(
        8,
      )
      result.push({
        time: t,
        open: stepOpen,
        high: stepHigh,
        low: stepLow,
        close: stepClose,
        volume: stepVolume,
      })
      prevClose = stepClose
    }
  }
  return result
}

export function seedTickBuffer(symbol, candles, fromSec) {
  const ticks = getTicks(symbol)
  if (ticks.length > 0) return
  for (const c of candles) {
    ticks.push({ price: c.open, time: c.time })
    ticks.push({ price: c.high, time: c.time + 1 })
    ticks.push({ price: c.low, time: c.time + 2 })
    ticks.push({ price: c.close, time: c.time + 3 })
  }
  if (ticks.length > 50000) { tickBuffers.set(symbol, ticks.slice(10000)); return }
}

export function enhanceCandles(candles) {
  return candles
    .map((c) => {
      let { time, open, high, low, close, volume } = c
      time = toSecTimestamp(time)
      if (close == null || isNaN(close)) return null
      if (open == null || isNaN(open)) open = close
      if (high == null || isNaN(high)) high = close
      if (low == null || isNaN(low)) low = close
      return {
        time,
        open: +open.toFixed(8),
        high: +high.toFixed(8),
        low: +low.toFixed(8),
        close: +close.toFixed(8),
        volume: volume || generateTickVolume(close),
      }
    })
    .filter(Boolean)
}

export function aggregateCandles(sourceCandles, fromSec, toSec) {
  if (!sourceCandles || sourceCandles.length === 0) return []
  if (toSec <= fromSec) return sourceCandles
  const ratio = Math.round(toSec / fromSec)
  if (ratio < 2) return sourceCandles
  const result = []
  for (let i = 0; i < sourceCandles.length; i += ratio) {
    const slice = sourceCandles.slice(i, i + ratio)
    if (slice.length === 0) continue
    const first = slice[0]
    const last = slice[slice.length - 1]
    let high = -Infinity,
      low = Infinity,
      vol = 0
    for (const c of slice) {
      if (c.high > high) high = c.high
      if (c.low < low) low = c.low
      vol += c.volume || 0
    }
    result.push({
      time: Math.floor(first.time / toSec) * toSec,
      open: first.open,
      high,
      low,
      close: last.close,
      volume: vol,
    })
  }
  return result
}

// ── Persistence ──

function loadInitialState() {
  try {
    if (fs.existsSync(PERSISTENCE_FILE)) {
      const data = JSON.parse(fs.readFileSync(PERSISTENCE_FILE, 'utf-8'))
      if (data.tickBuffers) {
        for (const [sym, ticks] of Object.entries(data.tickBuffers)) tickBuffers.set(sym, ticks)
      }
      if (data.candleStates) {
        for (const [sym, states] of Object.entries(data.candleStates)) {
          const sc = new Map()
          for (const [interval, c] of Object.entries(states)) sc.set(interval, c)
          candleStates.set(sym, sc)
        }
      }
    }
    restoreRedisState().catch(() => {})
  } catch (e) {
    console.warn('[Persistence] Failed to load market state:', e.message)
  }
}

async function restoreRedisState() {
  try {
    const activeSymbols = await redis.getActiveSymbols()
    if (activeSymbols.length > 0) {
      for (const symbol of activeSymbols) {
        for (const interval of ALL_INTERVALS) {
          const candle = await redis.getCandleState(symbol, interval.id)
          if (candle) {
            let sc = candleStates.get(symbol)
            if (!sc) {
              sc = new Map()
              candleStates.set(symbol, sc)
            }
            sc.set(interval.id, candle)
          }
        }
      }
    }
  } catch (e) { console.warn('[Redis] restoreRedisState error:', e?.message || e) }
}

export function saveState() {
  try {
    const data = { tickBuffers: {}, candleStates: {} }
    for (const [sym, ticks] of tickBuffers) {
      if (ticks.length > 0) data.tickBuffers[sym] = ticks.slice(-1000)
    }
    for (const [sym, states] of candleStates) {
      const stateObj = {}
      for (const [interval, c] of states) stateObj[interval] = c
      data.candleStates[sym] = stateObj
    }
    fs.promises.writeFile(PERSISTENCE_FILE, JSON.stringify(data)).catch(() => {})
  } catch (e) {}
}

export function saveStateSync() {
  try {
    const data = { tickBuffers: {}, candleStates: {} }
    for (const [sym, ticks] of tickBuffers) {
      if (ticks.length > 0) data.tickBuffers[sym] = ticks.slice(-1000)
    }
    for (const [sym, states] of candleStates) {
      const stateObj = {}
      for (const [interval, c] of states) stateObj[interval] = c
      data.candleStates[sym] = stateObj
    }
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(data))
  } catch (e) {}
}

// ── WebSocket Server ──

export const httpServer = createServer((req, res) => {
  if (req.url === '/prices') {
    const now = Date.now()
    const prices = {}
    for (const [symbol, data] of priceCache) {
      prices[symbol] = { price: data.price, change: data.change, lastUpdated: data.lastUpdated, age: now - data.lastUpdated }
    }
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(JSON.stringify(prices))
    return
  }
  res.writeHead(404)
  res.end()
})

export const wss = new WebSocketServer({ server: httpServer })

export function broadcast(symbol, message) {
  const clients = subscribers.get(symbol)
  if (!clients) return
  const msg = JSON.stringify(message)
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

export function broadcastTo(ws, message) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(message))
}

// ── Initialization ──

loadInitialState()

// Save state every 60 seconds (async, non-blocking)
setInterval(saveState, 60000)

process.on('SIGINT', () => {
  saveStateSync()
  process.exit(0)
})
process.on('SIGTERM', () => {
  saveStateSync()
  process.exit(0)
})
