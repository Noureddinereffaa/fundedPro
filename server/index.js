import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'

const PORT = 3002
const HEARTBEAT_MS = 15000
const HEARTBEAT_TIMEOUT_MS = 30000
const MAX_FAILS = 5

// ── All intervals ───────────────────────────────────────────

const ALL_INTERVALS = [
  { id: '1s',  sec: 1 },    { id: '5s',  sec: 5 },
  { id: '15s', sec: 15 },   { id: '30s', sec: 30 },
  { id: '60',  sec: 60 },   { id: '300', sec: 300 },
  { id: '900', sec: 900 },  { id: '1800', sec: 1800 },
  { id: '3600', sec: 3600 }, { id: '7200', sec: 7200 },
  { id: '14400', sec: 14400 }, { id: '21600', sec: 21600 },
  { id: '43200', sec: 43200 },
  { id: 'D', sec: 86400 }, { id: 'W', sec: 604800 },
  { id: 'M', sec: 2592000 },
]

// ── Symbol map ──────────────────────────────────────────────

const MARKET_TYPE = {
  forex:   ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','NZDUSD','USDCHF',
            'EURGBP','EURJPY','EURAUD','EURCAD','EURCHF','EURNZD',
            'GBPJPY','GBPAUD','GBPCAD','GBPCHF','GBPNZD',
            'AUDJPY','AUDCAD','AUDCHF','AUDNZD','NZDJPY','NZDCAD','NZDCHF',
            'CADJPY','CADCHF','CHFJPY',
            'USDSGD','USDHKD','USDKRW','USDZAR','USDINR','USDBRL','USDMXN',
            'USDTRY','USDSEK','USDNOK','USDCNH','USDDKK','USDPLN',
            'EURTRY','EURSEK','EURNOK'],
  crypto:  ['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT','BNBUSDT','ADAUSDT',
            'DOGEUSDT','AVAXUSDT','DOTUSDT','LINKUSDT','MATICUSDT',
            'UNIUSDT','LTCUSDT','ARBUSDT','OPUSDT','APTUSDT','SUIUSDT'],
  indices: ['SPX','NDX','DJI','RUT','VIX','DAX','FTSE','CAC','SX5E','N225','HSI','AXJO'],
  commodity: ['XAUUSD','XAGUSD','XPTUSD','XPDUSD','XCUUSD','USOIL','UKOIL','NGAS'],
}

function getMarketType(symbol) {
  for (const [type, symbols] of Object.entries(MARKET_TYPE)) {
    if (symbols.includes(symbol)) return type
  }
  return 'forex'
}

function isForexType(symbol) {
  return MARKET_TYPE.forex.includes(symbol)
}

const POLL_INTERVAL = { crypto: 2000, forex: 3000, indices: 5000, commodity: 4000 }

function isMarketOpen(marketType) {
  if (marketType === 'crypto') return true
  const now = new Date()
  const day = now.getUTCDay()   // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const hour = now.getUTCHours()
  if (marketType === 'forex') {
    if (day === 6) return false                    // Saturday: always closed
    if (day === 5 && hour >= 22) return false      // Friday after 22:00 UTC: closed
    if (day === 0 && hour < 22) return false       // Sunday before 22:00 UTC: closed
    return true                                    // All other times: open
  }
  // Indices & Commodities: Mon-Fri, 06:00-22:00 UTC
  if (day === 0 || day === 6) return false
  if (hour < 6 || hour >= 22) return false
  return true
}


const TD_API_KEY = process.env.TWELVEDATA_API_KEY || '0aeba912b5fc447d9a72ac8f1f173791'

const SYMBOL_MAP = {
  EURUSD: { yahoo: 'EURUSD=X', td: 'EUR/USD', digits: 5 },
  GBPUSD: { yahoo: 'GBPUSD=X', td: 'GBP/USD', digits: 5 },
  USDJPY: { yahoo: 'USDJPY=X', td: 'USD/JPY', digits: 3 },
  AUDUSD: { yahoo: 'AUDUSD=X', td: 'AUD/USD', digits: 5 },
  USDCAD: { yahoo: 'USDCAD=X', td: 'USD/CAD', digits: 5 },
  NZDUSD: { yahoo: 'NZDUSD=X', td: 'NZD/USD', digits: 5 },
  USDCHF: { yahoo: 'USDCHF=X', td: 'USD/CHF', digits: 5 },
  EURGBP: { yahoo: 'EURGBP=X', td: 'EUR/GBP', digits: 5 },
  EURJPY: { yahoo: 'EURJPY=X', td: 'EUR/JPY', digits: 3 },
  EURAUD: { yahoo: 'EURAUD=X', td: 'EUR/AUD', digits: 5 },
  EURCAD: { yahoo: 'EURCAD=X', td: 'EUR/CAD', digits: 5 },
  EURCHF: { yahoo: 'EURCHF=X', td: 'EUR/CHF', digits: 5 },
  EURNZD: { yahoo: 'EURNZD=X', td: 'EUR/NZD', digits: 5 },
  GBPJPY: { yahoo: 'GBPJPY=X', td: 'GBP/JPY', digits: 3 },
  GBPAUD: { yahoo: 'GBPAUD=X', td: 'GBP/AUD', digits: 5 },
  GBPCAD: { yahoo: 'GBPCAD=X', td: 'GBP/CAD', digits: 5 },
  GBPCHF: { yahoo: 'GBPCHF=X', td: 'GBP/CHF', digits: 5 },
  GBPNZD: { yahoo: 'GBPNZD=X', td: 'GBP/NZD', digits: 5 },
  AUDJPY: { yahoo: 'AUDJPY=X', td: 'AUD/JPY', digits: 3 },
  AUDCAD: { yahoo: 'AUDCAD=X', td: 'AUD/CAD', digits: 5 },
  AUDCHF: { yahoo: 'AUDCHF=X', td: 'AUD/CHF', digits: 5 },
  AUDNZD: { yahoo: 'AUDNZD=X', td: 'AUD/NZD', digits: 5 },
  NZDJPY: { yahoo: 'NZDJPY=X', td: 'NZD/JPY', digits: 3 },
  NZDCAD: { yahoo: 'NZDCAD=X', td: 'NZD/CAD', digits: 5 },
  NZDCHF: { yahoo: 'NZDCHF=X', td: 'NZD/CHF', digits: 5 },
  CADJPY: { yahoo: 'CADJPY=X', td: 'CAD/JPY', digits: 3 },
  CADCHF: { yahoo: 'CADCHF=X', td: 'CAD/CHF', digits: 5 },
  CHFJPY: { yahoo: 'CHFJPY=X', td: 'CHF/JPY', digits: 3 },
  USDSGD: { yahoo: 'USDSGD=X', td: 'USD/SGD', digits: 5 },
  USDHKD: { yahoo: 'USDHKD=X', td: 'USD/HKD', digits: 5 },
  USDKRW: { yahoo: 'USDKRW=X', td: 'USD/KRW', digits: 2 },
  USDZAR: { yahoo: 'USDZAR=X', td: 'USD/ZAR', digits: 4 },
  USDINR: { yahoo: 'USDINR=X', td: 'USD/INR', digits: 2 },
  USDBRL: { yahoo: 'USDBRL=X', td: 'USD/BRL', digits: 4 },
  USDMXN: { yahoo: 'USDMXN=X', td: 'USD/MXN', digits: 4 },
  USDTRY: { yahoo: 'USDTRY=X', td: 'USD/TRY', digits: 4 },
  USDSEK: { yahoo: 'USDSEK=X', td: 'USD/SEK', digits: 4 },
  USDNOK: { yahoo: 'USDNOK=X', td: 'USD/NOK', digits: 4 },
  USDCNH: { yahoo: 'USDCNH=X', td: 'USD/CNH', digits: 4 },
  USDDKK: { yahoo: 'USDDKK=X', td: 'USD/DKK', digits: 4 },
  USDPLN: { yahoo: 'USDPLN=X', td: 'USD/PLN', digits: 4 },
  EURTRY: { yahoo: 'EURTRY=X', td: 'EUR/TRY', digits: 4 },
  EURSEK: { yahoo: 'EURSEK=X', td: 'EUR/SEK', digits: 4 },
  EURNOK: { yahoo: 'EURNOK=X', td: 'EUR/NOK', digits: 4 },
  XAUUSD: { yahoo: 'GC=F', td: 'XAU/USD', digits: 2 },
  XAGUSD: { yahoo: 'SI=F', td: 'XAG/USD', digits: 3 },
  XPTUSD: { yahoo: 'PL=F', td: 'XPT/USD', digits: 2 },
  XPDUSD: { yahoo: 'PA=F', td: 'XPD/USD', digits: 2 },
  XCUUSD: { yahoo: 'HG=F', td: 'XCU/USD', digits: 4 },
  USOIL: { yahoo: 'CL=F', td: 'USOIL', digits: 2 },
  UKOIL: { yahoo: 'BZ=F', td: 'UKOIL', digits: 2 },
  NGAS: { yahoo: 'NG=F', td: 'NGAS', digits: 3 },
  SPX: { yahoo: '%5EGSPC', td: 'SPX', digits: 2 },
  NDX: { yahoo: '%5EIXIC', td: 'NDX', digits: 2 },
  DJI: { yahoo: '%5EDJI', td: 'DJI', digits: 2 },
  RUT: { yahoo: '%5ERUT', td: 'RUT', digits: 2 },
  VIX: { yahoo: '%5EVIX', td: 'VIX', digits: 2 },
  DAX: { yahoo: '%5EGDAXI', td: 'DAX', digits: 2 },
  FTSE: { yahoo: '%5EFTSE', td: 'FTSE', digits: 2 },
  CAC: { yahoo: '%5EFCHI', td: 'CAC', digits: 2 },
  SX5E: { yahoo: '%5ESTOXX50E', td: 'SX5E', digits: 2 },
  N225: { yahoo: '%5EN225', td: 'N225', digits: 2 },
  HSI: { yahoo: '%5EHSI', td: 'HSI', digits: 2 },
  AXJO: { yahoo: '%5EAXJO', td: 'AXJO', digits: 2 },
  BTCUSDT: { yahoo: 'BTC-USD', td: 'BTC/USDT', digits: 2, binance: 'btcusdt' },
  ETHUSDT: { yahoo: 'ETH-USD', td: 'ETH/USDT', digits: 2, binance: 'ethusdt' },
  SOLUSDT: { yahoo: 'SOL-USD', td: 'SOL/USDT', digits: 2, binance: 'solusdt' },
  XRPUSDT: { yahoo: 'XRP-USD', td: 'XRP/USDT', digits: 4, binance: 'xrpusdt' },
  BNBUSDT: { yahoo: 'BNB-USD', td: 'BNB/USDT', digits: 2, binance: 'bnbusdt' },
  ADAUSDT: { yahoo: 'ADA-USD', td: 'ADA/USDT', digits: 4, binance: 'adausdt' },
  DOGEUSDT: { yahoo: 'DOGE-USD', td: 'DOGE/USDT', digits: 5, binance: 'dogeusdt' },
  AVAXUSDT: { yahoo: 'AVAX-USD', td: 'AVAX/USDT', digits: 2, binance: 'avaxusdt' },
  DOTUSDT: { yahoo: 'DOT-USD', td: 'DOT/USDT', digits: 3, binance: 'dotusdt' },
  LINKUSDT: { yahoo: 'LINK-USD', td: 'LINK/USDT', digits: 3, binance: 'linkusdt' },
  MATICUSDT: { yahoo: 'MATIC-USD', td: 'MATIC/USDT', digits: 4, binance: 'maticusdt' },
  UNIUSDT: { yahoo: 'UNI-USD', td: 'UNI/USDT', digits: 3, binance: 'uniusdt' },
  LTCUSDT: { yahoo: 'LTC-USD', td: 'LTC/USDT', digits: 2, binance: 'ltcusdt' },
  ARBUSDT: { yahoo: 'ARB-USD', td: 'ARB/USDT', digits: 3, binance: 'arbusdt' },
  OPUSDT: { yahoo: 'OP-USD', td: 'OP/USDT', digits: 3, binance: 'opusdt' },
  APTUSDT: { yahoo: 'APT-USD', td: 'APT/USDT', digits: 3, binance: 'aptusdt' },
  SUIUSDT: { yahoo: 'SUI-USD', td: 'SUI/USDT', digits: 3, binance: 'suiusdt' },
}

// ── Candle Engine ───────────────────────────────────────────

const tickBuffers = new Map()
const candleStates = new Map()
const subscribers = new Map()
const priceCache = new Map()
const symbolTimers = new Map()
const wsMeta = new WeakMap()
const activeSubMinute = new Set() // symbols with sub-minute subscribers
const klinesCache = new Map() // key: `${symbol}_${interval}`, value: { klines, time }

function getTicks(symbol) {
  if (!tickBuffers.has(symbol)) tickBuffers.set(symbol, [])
  return tickBuffers.get(symbol)
}

// Track which intervals have subscribers per symbol
const activeIntervals = new Map() // symbol -> Set<intervalId>

function addActiveInterval(symbol, intervalId) {
  if (!activeIntervals.has(symbol)) activeIntervals.set(symbol, new Set())
  activeIntervals.get(symbol).add(intervalId)
}

function removeActiveInterval(symbol, intervalId) {
  const set = activeIntervals.get(symbol)
  if (set) { set.delete(intervalId); if (set.size === 0) activeIntervals.delete(symbol) }
}

function processTick(symbol, price, time) {
  const ticks = getTicks(symbol)
  const last = ticks[ticks.length - 1]
  if (last && last.price === price && (time - last.time) < 2) return
  ticks.push({ price, time })
  if (ticks.length > 100000) ticks.splice(0, 20000)

  const sc = candleStates.get(symbol) || new Map()
  candleStates.set(symbol, sc)
  const hasSubs = subscribers.has(symbol) && subscribers.get(symbol).size > 0
  const targetIntervals = hasSubs && activeIntervals.has(symbol) ? activeIntervals.get(symbol) : null

  let broadcastCount = 0
  for (const interval of ALL_INTERVALS) {
    const ct = Math.floor(time / interval.sec) * interval.sec
    const existing = sc.get(interval.id)
    if (!existing || existing.time !== ct) {
      if (existing && hasSubs && (!targetIntervals || targetIntervals.has(interval.id))) {
        broadcast(symbol, { type: 'candle', symbol, interval: interval.id, kline: existing })
        broadcastCount++
      }
      sc.set(interval.id, { time: ct, open: price, high: price, low: price, close: price, volume: 0 })
    } else {
      existing.high = Math.max(existing.high, price)
      existing.low = Math.min(existing.low, price)
      existing.close = price
      if (hasSubs && (!targetIntervals || targetIntervals.has(interval.id))) {
        broadcast(symbol, { type: 'candle_update', symbol, interval: interval.id, kline: { ...existing } })
        broadcastCount++
      }
    }
  }
  if (broadcastCount > 0) {
    console.log(`[Tick] ${symbol} $${price} → ${broadcastCount} broadcasts`)
  }
}

function getRecentCandles(symbol, intervalId, count = 300) {
  const ticks = getTicks(symbol)
  const intervalSec = ALL_INTERVALS.find(i => i.id === intervalId)?.sec
  if (!intervalSec || ticks.length < 2) return []
  const now = ticks[ticks.length - 1].time
  const startTime = now - intervalSec * count
  const relevant = ticks.filter(t => t.time >= startTime)
  if (relevant.length < 2) return []
  const candles = []
  let current = null
  for (const tick of relevant) {
    const ct = Math.floor(tick.time / intervalSec) * intervalSec
    if (!current || current.time !== ct) {
      if (current) candles.push({ ...current })
      current = { time: ct, open: tick.price, high: tick.price, low: tick.price, close: tick.price, volume: 0 }
    } else {
      current.high = Math.max(current.high, tick.price)
      current.low = Math.min(current.low, tick.price)
      current.close = tick.price
    }
  }
  if (current) candles.push({ ...current })
  return candles.slice(-count)
}

function interpolateCandles(sourceCandles, fromSec, toSec) {
  const ratio = fromSec / toSec
  if (ratio < 2 || !Number.isInteger(ratio)) return sourceCandles
  const result = []
  const steps = ratio
  for (const src of sourceCandles) {
    const { time, open, high, low, close, volume } = src
    const halfRange = (high - low) / 2 || Math.abs(close - open) * 0.5 || 0.001
    let prevClose = open
    for (let i = 0; i < steps; i++) {
      const t = time + i * toSec
      const progress = (i + 1) / steps
      const target = open + (close - open) * progress
      const noise = (Math.random() - 0.5) * halfRange * 0.6
      const subClose = i === steps - 1 ? close : +(target + noise).toFixed(8)
      const subOpen = +(prevClose).toFixed(8)
      const subHigh = +(Math.min(high, Math.max(subOpen, subClose) + Math.random() * halfRange * 0.4)).toFixed(8)
      const subLow = +(Math.max(low, Math.min(subOpen, subClose) - Math.random() * halfRange * 0.4)).toFixed(8)
      result.push({ time: t, open: subOpen, high: subHigh, low: subLow, close: subClose, volume: +(volume / steps).toFixed(2) })
      prevClose = subClose
    }
  }
  return result
}

function seedTickBuffer(symbol, candles, fromSec) {
  const ticks = getTicks(symbol)
  if (ticks.length > 0) return
  for (const c of candles) {
    ticks.push({ price: c.open, time: c.time })
    ticks.push({ price: c.high, time: c.time + 1 })
    ticks.push({ price: c.low, time: c.time + 2 })
    ticks.push({ price: c.close, time: c.time + 3 })
  }
  if (ticks.length > 50000) ticks.splice(0, 10000)
}

function enhanceCandles(candles) {
  return candles.map(c => {
    let { time, open, high, low, close, volume } = c
    if (close == null || isNaN(close)) return null
    if (open == null || isNaN(open)) open = close
    if (high == null || isNaN(high)) high = close
    if (low == null || isNaN(low)) low = close
    const range = high - low
    const minRange = Math.abs(close) * 0.0002
    if (range >= minRange) return { time, open, high, low, close, volume: volume || 0 }
    const half = minRange / 2
    const body = Math.abs(close - open)
    if (body < minRange * 0.3) {
      open = close - minRange * 0.3 * (close >= open ? -1 : 1)
    }
    return {
      time, open: +open.toFixed(8), high: +(close + half).toFixed(8),
      low: +(close - half).toFixed(8), close, volume: volume || 0,
    }
  }).filter(Boolean)
}

// ── Yahoo helpers ───────────────────────────────────────────

function yahooInterval(interval) {
  const map = {
    '60': '1m', '300': '5m', '900': '15m', '1800': '30m',
    '3600': '1h', '7200': '2h', '14400': '4h', '21600': '6h', '43200': '12h',
    'D': '1d', 'W': '1wk', 'M': '1mo',
  }
  return map[interval] || '1h'
}

function yahooRange(days) {
  if (days <= 1) return '1d'
  if (days <= 7) return '5d'
  if (days <= 60) return '1mo'
  if (days <= 365) return '1y'
  if (days <= 730) return '2y'
  if (days <= 1460) return '5y'
  return '10y'
}

function lookbackDays(intervalId) {
  const n = parseInt(intervalId)
  if (isNaN(n)) return intervalId === 'D' ? 90 : intervalId === 'W' ? 365 : intervalId === 'M' ? 730 : 1
  if (n <= 1) return 1
  if (n <= 5) return 5
  if (n <= 15) return 7
  if (n <= 30) return 7
  if (n <= 60) return 7
  if (n <= 300) return 30
  if (n <= 900) return 60
  if (n <= 1800) return 90
  if (n <= 3600) return 180
  if (n <= 14400) return 365
  if (n <= 43200) return 365
  return 730
}

async function fetchYahooKlines(symbol, intervalId) {
  const info = SYMBOL_MAP[symbol]
  if (!info) return null
  const subMinute = ['1s', '5s', '15s', '30s'].includes(intervalId)
  const yInterval = subMinute ? '1m' : yahooInterval(intervalId)
  const days = subMinute ? 1 : lookbackDays(intervalId)
  const range = yahooRange(days)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${info.yahoo}?range=${range}&interval=${yInterval}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json?.chart?.error) return null
    const result = json?.chart?.result?.[0]
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) return null
    const timestamps = result.timestamp
    const quote = result.indicators.quote[0]
    const klines = []
    for (let i = 0; i < timestamps.length; i++) {
      const o = quote.open?.[i]; const h = quote.high?.[i]
      const l = quote.low?.[i]; const c = quote.close?.[i]
      if (o == null || h == null || l == null || c == null) continue
      klines.push({ time: timestamps[i], open: o, high: h, low: l, close: c, volume: quote.volume?.[i] || 0 })
    }
    if (klines.length === 0) return null
    if (subMinute) {
      const toSec = { '1s': 1, '5s': 5, '15s': 15, '30s': 30 }[intervalId]
      return enhanceCandles(interpolateCandles(klines, 60, toSec))
    }
    return enhanceCandles(klines)
  } catch {
    return null
  }
}

// Fetch 1-minute candles for tick buffer seeding
async function fetchYahooKlines1m(symbol) {
  const info = SYMBOL_MAP[symbol]
  if (!info) return null
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${info.yahoo}?range=5d&interval=1m`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json?.chart?.error) return null
    const result = json?.chart?.result?.[0]
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) return null
    const timestamps = result.timestamp
    const quote = result.indicators.quote[0]
    const klines = []
    for (let i = 0; i < timestamps.length; i++) {
      const o = quote.open?.[i]; const h = quote.high?.[i]
      const l = quote.low?.[i]; const c = quote.close?.[i]
      if (o == null || h == null || l == null || c == null) continue
      klines.push({ time: timestamps[i], open: o, high: h, low: l, close: c, volume: quote.volume?.[i] || 0 })
    }
    return klines.length > 0 ? klines : null
  } catch {
    return null
  }
}

async function fetchYahooQuote(symbol) {
  const info = SYMBOL_MAP[symbol]
  if (!info) return null
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${info.yahoo}?range=1d&interval=1d`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })
    if (!res.ok) {
      console.warn(`[Yahoo] ${symbol} HTTP ${res.status}`)
      return null
    }
    const json = await res.json()
    if (json?.chart?.error) {
      console.warn(`[Yahoo] ${symbol} chart error:`, json.chart.error.description)
      return null
    }
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) {
      console.warn(`[Yahoo] ${symbol} no price in meta`)
      return null
    }
    const price = meta.regularMarketPrice
    const prevClose = meta.chartPreviousClose || meta.previousClose || price
    const change = ((price - prevClose) / prevClose) * 100
    return { price: Number(price), change: Number(change.toFixed(2)) }
  } catch (e) {
    console.warn(`[Yahoo] ${symbol} fetch error:`, e.message)
  }
  return null
}

async function fetchTDQuote(symbol) {
  const info = SYMBOL_MAP[symbol]
  if (!info) return null
  try {
    const res = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(info.td)}&apikey=${TD_API_KEY}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data?.status === 'ok') return { price: Number(data.close), change: Number(data.percent_change) || 0 }
  } catch {}
  return null
}

// ── Binance WebSocket (All-Market Mini Ticker) ──────────────
// Uses !miniTicker@arr: one connection, ALL crypto prices, ~1s updates

let binanceSocket = null
let binanceReconnectTimer = null
let binanceLastMessage = 0
const BINANCE_WATCHED = new Set() // our symbol names (e.g. 'BTCUSDT')

function connectBinance() {
  if (binanceSocket) {
    try { binanceSocket.close() } catch {}
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
    console.log('[Binance] Connected — all-market mini tickers (17 crypto symbols watched)')
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
        const binanceSymbol = msg.s // e.g. 'BTCUSDT'
        const ourSymbol = binanceSymbol // our map uses same names
        if (!BINANCE_WATCHED.has(ourSymbol)) continue

        const price = Number(msg.c)
        if (!price || price <= 0) continue

        const openPrice = Number(msg.o)
        const change = openPrice > 0 ? ((price - openPrice) / openPrice) * 100 : 0

        priceCache.set(ourSymbol, { price, change: Number(change.toFixed(2)), lastUpdated: now, source: 'binance' })
        const tickTime = Math.floor(now / 1000)
        processTick(ourSymbol, price, tickTime)
        broadcast(ourSymbol, { type: 'tick', symbol: ourSymbol, price, change: Number(change.toFixed(2)), time: tickTime })
      }
    } catch {}
  }

  binanceSocket.onclose = (event) => {
    console.log(`[Binance] Disconnected (code=${event.code})`)
    binanceSocket = null
    scheduleBinanceReconnect(5000)
  }

  binanceSocket.onerror = (err) => {
    console.error('[Binance] WebSocket error')
    if (binanceSocket) {
      try { binanceSocket.close() } catch {}
    }
  }
}

function scheduleBinanceReconnect(delay) {
  if (binanceReconnectTimer) clearTimeout(binanceReconnectTimer)
  binanceReconnectTimer = setTimeout(() => {
    binanceReconnectTimer = null
    connectBinance()
  }, delay || 5000)
}

function startBinanceWatchdog() {
  setInterval(() => {
    if (BINANCE_WATCHED.size === 0) return
    if (!binanceSocket || binanceSocket.readyState !== 1) return
    if (Date.now() - binanceLastMessage > 30000) {
      console.warn('[Binance] No data for 30s, reconnecting...')
      try { binanceSocket.close() } catch {}
    }
  }, 10000)
}

function subscribeBinance(symbol) {
  const info = SYMBOL_MAP[symbol]
  if (!info?.binance) return
  BINANCE_WATCHED.add(symbol)
  if (!binanceSocket || binanceSocket.readyState !== 1) {
    connectBinance()
  }
}

function unsubscribeBinance(symbol) {
  BINANCE_WATCHED.delete(symbol)
}

// ── Twelve Data WebSocket (Forex Real-Time) ─────────────────

let tdSocket = null
let tdReconnectTimer = null
let tdSubscribedSymbols = new Set()

function connectTwelveData() {
  if (tdSocket) {
    try { tdSocket.close() } catch {}
    tdSocket = null
  }

  const url = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${TD_API_KEY}`
  try {
    tdSocket = new WebSocket(url)
  } catch (e) {
    console.error('[TwelveData] Connect failed:', e.message)
    scheduleTdReconnect(15000)
    return
  }

  tdSocket.onopen = () => {
    console.log('[TwelveData] WebSocket connected')
    resubscribeTd()
  }

  tdSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data.toString())
      if (data.event === 'price' && data.symbol && data.price) {
        const price = Number(data.price)
        if (price <= 0) return
        const symbol = findSymbolByTd(data.symbol)
        if (!symbol) return
        const now = Date.now()
        priceCache.set(symbol, { price, change: priceCache.get(symbol)?.change || 0, lastUpdated: now, source: 'twelvedata' })
        const tickTime = Math.floor(now / 1000)
        processTick(symbol, price, tickTime)
        broadcast(symbol, { type: 'tick', symbol, price, change: priceCache.get(symbol)?.change || 0, time: tickTime })
      }
      if (data.event === 'error') {
        console.warn('[TwelveData] Error:', data.message)
      }
    } catch {}
  }

  tdSocket.onclose = () => {
    console.log('[TwelveData] Disconnected')
    tdSocket = null
    scheduleTdReconnect(10000)
  }

  tdSocket.onerror = () => {
    if (tdSocket) {
      try { tdSocket.close() } catch {}
    }
  }
}

function scheduleTdReconnect(delay) {
  if (tdReconnectTimer) clearTimeout(tdReconnectTimer)
  tdReconnectTimer = setTimeout(() => {
    tdReconnectTimer = null
    connectTwelveData()
  }, delay || 10000)
}

function resubscribeTd() {
  if (!tdSocket || tdSocket.readyState !== 1) return
  const symbols = []
  for (const sym of tdSubscribedSymbols) {
    const info = SYMBOL_MAP[sym]
    if (info?.td) symbols.push(info.td)
  }
  if (symbols.length > 0) {
    const chunkSize = 8
    for (let i = 0; i < symbols.length; i += chunkSize) {
      const chunk = symbols.slice(i, i + chunkSize)
      tdSocket.send(JSON.stringify({ action: 'subscribe', params: { symbols: chunk.join(',') } }))
    }
    console.log(`[TwelveData] Subscribed to ${symbols.length} forex symbols`)
  }
}

function subscribeTwelveData(symbol) {
  tdSubscribedSymbols.add(symbol)
  if (tdSocket && tdSocket.readyState === 1) {
    const info = SYMBOL_MAP[symbol]
    if (info?.td) {
      tdSocket.send(JSON.stringify({ action: 'subscribe', params: { symbols: info.td } }))
    }
  } else {
    connectTwelveData()
  }
}

function unsubscribeTwelveData(symbol) {
  tdSubscribedSymbols.delete(symbol)
  if (tdSocket && tdSocket.readyState === 1) {
    const info = SYMBOL_MAP[symbol]
    if (info?.td) {
      tdSocket.send(JSON.stringify({ action: 'unsubscribe', params: { symbols: info.td } }))
    }
  }
}

function findSymbolByTd(tdSymbol) {
  for (const [sym, info] of Object.entries(SYMBOL_MAP)) {
    if (info.td === tdSymbol) return sym
  }
  return null
}

// ── CoinGecko REST (Crypto Backup) ──────────────────────────

const COINGECKO_IDS = {
  BTCUSDT: 'bitcoin', ETHUSDT: 'ethereum', SOLUSDT: 'solana',
  XRPUSDT: 'ripple', BNBUSDT: 'binancecoin', ADAUSDT: 'cardano',
  DOGEUSDT: 'dogecoin', AVAXUSDT: 'avalanche-2', DOTUSDT: 'polkadot',
  LINKUSDT: 'chainlink', MATICUSDT: 'matic-network', UNIUSDT: 'uniswap',
  LTCUSDT: 'litecoin', ARBUSDT: 'arbitrum', OPUSDT: 'optimism',
  APTUSDT: 'aptos', SUIUSDT: 'sui',
}

async function fetchCoinGeckoPrices() {
  const ids = Object.values(COINGECKO_IDS).join(',')
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_vol=true`)
    if (!res.ok) return
    const data = await res.json()
    const now = Date.now()
    for (const [symbol, cgId] of Object.entries(COINGECKO_IDS)) {
      const info = data[cgId]
      if (!info?.usd) continue
      const price = info.usd
      const cached = priceCache.get(symbol)
      if (cached && cached.source === 'binance') continue
      priceCache.set(symbol, { price, change: cached?.change || 0, lastUpdated: now, source: 'coingecko' })
      const tickTime = Math.floor(now / 1000)
      processTick(symbol, price, tickTime)
      broadcast(symbol, { type: 'tick', symbol, price, change: cached?.change || 0, time: tickTime })
    }
  } catch {}
}

// ── Adaptive Polling ────────────────────────────────────────

function startPolling(symbol) {
  if (symbolTimers.has(symbol)) return

  const marketType = getMarketType(symbol)
  const baseInterval = POLL_INTERVAL[marketType] || 3000
  let failCount = 0
  let pollTimer = null

  const isCrypto = marketType === 'crypto'
  const isForex = marketType === 'forex'

  async function poll() {
    const alive = subscribers.has(symbol) && subscribers.get(symbol).size > 0
    if (!alive) {
      stopPolling(symbol)
      return
    }

    const cached = priceCache.get(symbol)
    const now = Date.now()

    // For crypto: Binance handles real-time via !miniTicker@arr, skip polling
    if (isCrypto) {
      if (cached && cached.source === 'binance' && (now - cached.lastUpdated) < 5000) {
        scheduleNext(baseInterval)
        return
      }
      // Binance down → try CoinGecko
      if (!cached || (now - cached.lastUpdated) > 10000) {
        await fetchCoinGeckoPrices()
      }
      scheduleNext(baseInterval)
      return
    }

    // For forex: Twelve Data WebSocket handles real-time, skip if fresh
    if (isForex) {
      if (cached && cached.source === 'twelvedata' && (now - cached.lastUpdated) < 5000) {
        scheduleNext(baseInterval)
        return
      }
    }

    // Universal: skip if price <2s old (unless sub-minute)
    const hasSubMinute = activeSubMinute.has(symbol)
    if (!hasSubMinute && cached && (now - cached.lastUpdated) < 2000) {
      scheduleNext(baseInterval)
      return
    }

    // Fetch from Yahoo Finance → Twelve Data REST → fail
    let quote = await fetchYahooQuote(symbol)
    if (!quote) quote = await fetchTDQuote(symbol)

    if (!quote || quote.price <= 0) {
      failCount++
      if (failCount <= 3 || failCount % 20 === 0) {
        console.warn(`[Poll] ${symbol} failed ${failCount}x`)
      }
      const backoff = Math.min(60000, baseInterval * Math.pow(1.5, Math.min(failCount, 6)))
      scheduleNext(backoff)
      return
    }

    failCount = 0
    priceCache.set(symbol, { price: quote.price, change: quote.change, lastUpdated: now, source: 'yahoo' })

    const tickTime = Math.floor(now / 1000)
    processTick(symbol, quote.price, tickTime)
    broadcast(symbol, { type: 'tick', symbol, price: quote.price, change: quote.change, time: tickTime })

    scheduleNext(baseInterval)
  }

  function scheduleNext(ms) {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = setTimeout(poll, ms)
  }

  console.log(`[Poll] Start ${symbol} (${marketType}) every ${baseInterval}ms`)
  pollTimer = setTimeout(poll, 100)
  symbolTimers.set(symbol, { pollTimer, failCount, marketType })
}

function stopPolling(symbol) {
  const state = symbolTimers.get(symbol)
  if (state) {
    if (state.pollTimer) clearTimeout(state.pollTimer)
    symbolTimers.delete(symbol)
  }
}

function startAllActiveSymbols() {
  for (const [symbol, clients] of subscribers) {
    if (clients.size > 0 && !symbolTimers.has(symbol)) {
      startPolling(symbol)
    }
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [symbol, data] of priceCache) {
    if ((now - data.lastUpdated) > 300000) {
      priceCache.delete(symbol)
    }
  }
  for (const [symbol, clients] of subscribers) {
    if (clients.size === 0 && !symbolTimers.has(symbol)) {
      tickBuffers.delete(symbol)
      candleStates.delete(symbol)
    }
  }
}, 600000)

// ── WebSocket Server ────────────────────────────────────────

const httpServer = createServer((req, res) => {
  if (req.url === '/prices') {
    const prices = {}
    for (const [symbol, data] of priceCache) {
      prices[symbol] = { price: data.price, change: data.change }
    }
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(JSON.stringify(prices))
    return
  }
  res.writeHead(404)
  res.end()
})
const wss = new WebSocketServer({ server: httpServer })

function broadcast(symbol, message) {
  const clients = subscribers.get(symbol)
  if (!clients) return
  const msg = JSON.stringify(message)
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

function broadcastTo(ws, symbol, message) {
  if (ws.readyState === 1) ws.send(JSON.stringify(message))
}

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
        const rawSymbols = msg.symbols || msg.symbol
        const symbols = Array.isArray(rawSymbols) ? rawSymbols : [rawSymbols]
        const interval = msg.interval
        const isSubMinute = interval && ['1s', '5s', '15s', '30s'].includes(interval)
        const needsInitial = !!msg.needsInitial

        for (const symbol of symbols) {
          const info = SYMBOL_MAP[symbol]
          if (!info) {
            broadcastTo(ws, symbol, { type: 'error', message: `Unknown symbol: ${symbol}` })
            continue
          }

          if (!subscribers.has(symbol)) subscribers.set(symbol, new Set())
          subscribers.get(symbol).add(ws)
          if (interval) addActiveInterval(symbol, interval)

          if (isSubMinute) activeSubMinute.add(symbol)

          // Start data sources for this symbol
          const marketType = getMarketType(symbol)
          if (marketType === 'crypto') {
            subscribeBinance(symbol)
          } else if (isForexType(symbol)) {
            subscribeTwelveData(symbol)
          }

          // Seed initial price if not cached
          const existingPrice = priceCache.get(symbol)
          if (!existingPrice || !existingPrice.price) {
            const q = await fetchYahooQuote(symbol).catch(() => null)
            if (q && q.price > 0) {
              priceCache.set(symbol, { price: q.price, change: q.change, lastUpdated: Date.now(), source: 'yahoo' })
              console.log(`[Seed] ${symbol} $${q.price}`)
            }
          }

          // Start adaptive polling (fallback for all symbols)
          startPolling(symbol)

          // Only fetch historical data if explicitly requested (avoid dual-fetch)
          if (needsInitial) {
            let klines = null
            const cacheKey = `${symbol}_${interval}`

            // Check cache first (valid for 5 min)
            const cachedKlines = klinesCache.get(cacheKey)
            if (cachedKlines && (Date.now() - cachedKlines.time) < 300000) {
              klines = cachedKlines.klines
            }

            if (!klines) {
              if (isSubMinute) {
                klines = getRecentCandles(symbol, interval, 1000)
                if (!klines || klines.length < 10) {
                  const yahoo1m = await fetchYahooKlines(symbol, interval)
                  if (yahoo1m && yahoo1m.length > 0) {
                    klines = yahoo1m
                    const toSec = { '1s': 1, '5s': 5, '15s': 15, '30s': 30 }[interval]
                    seedTickBuffer(symbol, yahoo1m, toSec)
                  }
                }
              } else {
                klines = await fetchYahooKlines(symbol, interval)
              }

              // Seed tick buffer with 1m Yahoo data
              if (klines && klines.length > 10) {
                const ticks = getTicks(symbol)
                if (ticks.length === 0) {
                  const yahoo1m = await fetchYahooKlines1m(symbol)
                  if (yahoo1m && yahoo1m.length > 0) {
                    seedTickBuffer(symbol, yahoo1m, 60)
                  }
                }
              }

              if (klines && klines.length > 0) {
                klines = enhanceCandles(klines)
                klinesCache.set(cacheKey, { klines, time: Date.now() })
              }

              // If Yahoo failed, build minimal candles from tick buffer
              if (!klines || klines.length === 0) {
                const recent = getRecentCandles(symbol, interval, 50)
                if (recent.length > 0) klines = recent
              }
            }

            const cached = priceCache.get(symbol)
            let quote = cached ? { price: cached.price, change: cached.change } : null
            if (!quote) {
              quote = await fetchYahooQuote(symbol)
              if (!quote) quote = await fetchTDQuote(symbol)
              if (quote) priceCache.set(symbol, { price: quote.price, change: quote.change, lastUpdated: Date.now(), source: 'yahoo' })
            }

            broadcastTo(ws, symbol, {
              type: 'initial',
              symbol,
              interval,
              klines: klines || [],
              price: quote?.price || 0,
              change: quote?.change || 0,
            })
          }
        }
      }

      if (msg.type === 'unsubscribe') {
        const symbols = Array.isArray(msg.symbols) ? msg.symbols : [msg.symbols]
        const interval = msg.interval
        for (const symbol of symbols) {
          const clients = subscribers.get(symbol)
          if (clients) {
            clients.delete(ws)
            if (interval) removeActiveInterval(symbol, interval)
            if (clients.size === 0) {
              stopPolling(symbol)
              activeSubMinute.delete(symbol)
              unsubscribeBinance(symbol)
              unsubscribeTwelveData(symbol)
            }
          }
        }
      }
    } catch {}
  })

  ws.on('close', () => {
    for (const [symbol, clients] of subscribers) {
      clients.delete(ws)
      if (clients.size === 0) {
        stopPolling(symbol)
        activeSubMinute.delete(symbol)
      }
    }
  })

  ws.on('error', () => {
    ws.terminate()
  })
})

httpServer.listen(PORT, () => {
  console.log(`\n🔥 Real-time Engine v4 running on ws://localhost:${PORT}`)
  console.log(`   ─────────────────────────────────────────────`)
  console.log(`   Intervals:   ${ALL_INTERVALS.length}`)
  console.log(`   Symbols:     ${Object.keys(SYMBOL_MAP).length}`)
  console.log(`   Heartbeat:   ${HEARTBEAT_MS}ms`)
  console.log(`   ─────────────────────────────────────────────`)
  console.log(`   Binance:     !miniTicker@arr (17 crypto — real-time ~1s)`)
  console.log(`   TwelveData:  WebSocket (45 forex — real-time)`)
  console.log(`   CoinGecko:   REST backup (17 crypto — every 60s)`)
  console.log(`   Yahoo:       REST fallback (indices + commodities — every 5s)`)
  console.log(`   ─────────────────────────────────────────────\n`)

  // Start Binance for all-market stream
  connectBinance()
  startBinanceWatchdog()

  // Start Twelve Data WebSocket for forex streaming
  connectTwelveData()

  // CoinGecko backup poller (every 60s for crypto)
  setInterval(fetchCoinGeckoPrices, 60000)
})
