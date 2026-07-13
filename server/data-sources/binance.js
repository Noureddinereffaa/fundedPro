import { WebSocket } from 'ws'
import {
  priceCache,
  processTick,
  broadcast,
  SYMBOL_MAP,
  enhanceCandles,
  aggregateCandles,
} from '../lib/engine.js'

// ── Binance REST API ─────────────────────────────────────────

export function binanceInterval(intervalId) {
  const map = {
    '1s': '1s',
    '5s': '1s',
    '15s': '1s',
    '30s': '1s',
    60: '1m',
    300: '5m',
    900: '15m',
    1800: '30m',
    3600: '1h',
    7200: '2h',
    14400: '4h',
    21600: '6h',
    43200: '12h',
    D: '1d',
    W: '1w',
    M: '1M',
  }
  return map[intervalId] || '1h'
}

export async function fetchBinanceKlines(symbol, intervalId) {
  const info = SYMBOL_MAP[symbol]
  if (!info || !info.binance) {
    console.error(`[BinanceKlines] No info/binance for ${symbol}`)
    return null
  }
  const bInterval = binanceInterval(intervalId)
  const isSubMinute = ['1s', '5s', '15s', '30s'].includes(intervalId)
  const limit = isSubMinute ? 1000 : 500

  const url = `https://api.binance.com/api/v3/klines?symbol=${info.binance.toUpperCase()}&interval=${bInterval}&limit=${limit}`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) {
      console.error(`[BinanceKlines] HTTP ${res.status} for ${symbol} ${intervalId}`)
      return null
    }
    const json = await res.json()
    if (!Array.isArray(json)) {
      console.error(`[BinanceKlines] Non-array response for ${symbol} ${intervalId}`)
      return null
    }

    let klines = json.map((k) => ({
      time: Math.floor(k[0] / 1000),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }))

    if (isSubMinute && intervalId !== '1s') {
      const toSec = { '5s': 5, '15s': 15, '30s': 30 }[intervalId]
      klines = aggregateCandles(klines, 1, toSec)
    }

    return enhanceCandles(klines)
  } catch (e) {
    console.error(`[BinanceKlines] Error for ${symbol} ${intervalId}:`, e.message)
    return null
  }
}

// ── Binance WebSocket (All-Market Mini Ticker) ──────────────

let binanceSocket = null
let binanceReconnectTimer = null
let binanceLastMessage = 0
const BINANCE_WATCHED = new Set()

function scheduleBinanceReconnect(delay) {
  if (binanceReconnectTimer) clearTimeout(binanceReconnectTimer)
  binanceReconnectTimer = setTimeout(() => {
    binanceReconnectTimer = null
    connectBinance()
  }, delay || 5000)
}

export function connectBinance() {
  if (binanceSocket) {
    try {
      binanceSocket.close()
    } catch {}
    binanceSocket = null
  }

  const url = 'wss://stream.binance.com:9443/ws/!miniTicker@arr'
  try {
    binanceSocket = new WebSocket(url)
  } catch (e) {
    console.error('[Binance] Connect failed:', e.message)
    scheduleBinanceReconnect(10000)
    return
  }

  binanceSocket.onopen = () => {
    console.log('[Binance] Connected — all-market mini tickers')
    binanceLastMessage = Date.now()
  }

  binanceSocket.onmessage = (event) => {
    try {
      binanceLastMessage = Date.now()
      const arr = JSON.parse(event.data.toString())
      if (!Array.isArray(arr)) return
      const now = Date.now()
      for (const msg of arr) {
        if (msg.e !== '24hrMiniTicker') continue
        const ourSymbol = msg.s
        const price = Number(msg.c)
        if (!price || price <= 0) continue
        const openPrice = Number(msg.o)
        const change = openPrice > 0 ? ((price - openPrice) / openPrice) * 100 : 0
        const eventTime = Number(msg.E) || now
        const tickTime = Math.floor(eventTime / 1000)
        priceCache.set(ourSymbol, {
          price,
          change: Number(change.toFixed(2)),
          lastUpdated: now,
          source: 'binance',
        })
        if (!BINANCE_WATCHED.has(ourSymbol)) continue
        processTick(ourSymbol, price, tickTime)
        broadcast(ourSymbol, {
          type: 'tick',
          symbol: ourSymbol,
          price,
          change: Number(change.toFixed(2)),
          time: tickTime,
        })
      }
    } catch (e) {
      console.warn(`[Binance] WS message error:`, e?.message || e)
    }
  }

  binanceSocket.onclose = (event) => {
    console.log(`[Binance] Disconnected (code=${event.code})`)
    binanceSocket = null
    scheduleBinanceReconnect(5000)
  }

  binanceSocket.onerror = () => {
    console.error('[Binance] WebSocket error')
    if (binanceSocket) {
      try {
        binanceSocket.close()
      } catch {}
    }
  }
}

export function startBinanceWatchdog() {
  setInterval(() => {
    if (BINANCE_WATCHED.size === 0) return
    if (!binanceSocket || binanceSocket.readyState !== 1) return
    if (Date.now() - binanceLastMessage > 30000) {
      console.warn('[Binance] No data for 30s, reconnecting...')
      try {
        binanceSocket.close()
      } catch {}
    }
  }, 10000)
}

export function subscribeBinance(symbol) {
  const info = SYMBOL_MAP[symbol]
  if (!info?.binance || info.type !== 'crypto') return
  BINANCE_WATCHED.add(symbol)
  if (!binanceSocket || binanceSocket.readyState !== 1) {
    connectBinance()
  }
}

export function unsubscribeBinance(symbol) {
  BINANCE_WATCHED.delete(symbol)
}
