import type { Candle } from './types.js'

export const MOCK_PRICES: Record<string, { price: number; spread: number; volatility: number }> = {
  BTCUSDT: { price: 62850.0, spread: 1.0, volatility: 200.0 },
  ETHUSDT: { price: 1790.0, spread: 0.1, volatility: 20.0 },
  SOLUSDT: { price: 80.8, spread: 0.05, volatility: 2.0 },
  XRPUSDT: { price: 1.17, spread: 0.001, volatility: 0.01 },
  ADAUSDT: { price: 0.191, spread: 0.001, volatility: 0.005 },
  DOGEUSDT: { price: 0.0785, spread: 0.001, volatility: 0.003 },
  BNBUSDT: { price: 576.0, spread: 0.1, volatility: 5.0 },
  AVAXUSDT: { price: 6.98, spread: 0.05, volatility: 0.5 },
  DOTUSDT: { price: 0.89, spread: 0.01, volatility: 0.03 },
  LINKUSDT: { price: 8.09, spread: 0.01, volatility: 0.15 },
  LTCUSDT: { price: 45.2, spread: 0.05, volatility: 1.0 },
  UNIUSDT: { price: 3.26, spread: 0.01, volatility: 0.1 },
}

function resolutionToSeconds(resolution: string): number {
  const n = Number(resolution)
  if (!isNaN(n) && n > 0) return n
  const map: Record<string, number> = {
    D: 86400,
    W: 604800,
    M: 2592000,
  }
  return map[resolution] || 3600
}

export function getMockConfig(symbol: string): { price: number; spread: number; volatility: number } {
  if (MOCK_PRICES[symbol]) return MOCK_PRICES[symbol]
  const base = symbol.replace('USDT', '').replace('USD', '').replace('/', '').replace('=X', '').replace('.US', '')
  const seed = Math.abs(hashString(base))
  const hashNorm = (seed % 1000) / 1000
  const lowPriceTokens = new Set(['SHIB', 'PEPE', 'BONK', 'FLOKI', 'BOME', 'NOT'])
  const midPriceTokens = new Set(['TRX', 'VET', 'ADA', 'XRP', 'DOGE', 'ALGO', 'MANA', 'SAND', 'CHZ', 'GRT', 'FTM', 'FET', 'JUP', 'ENA', 'PYTH', 'ONDO', 'SEI', 'STRK', 'WLD', 'MANTA', 'TNSR', 'AEVO', 'ETHFI', 'ZK'])
  if (lowPriceTokens.has(base)) {
    const price = +(hashNorm * 0.001 + 0.00001).toFixed(6)
    return { price, spread: price * 0.001, volatility: price * 2 }
  }
  if (midPriceTokens.has(base)) {
    const price = +(hashNorm * 5 + 0.1).toFixed(4)
    return { price, spread: price * 0.001, volatility: price * 0.05 }
  }
  const price = +(hashNorm * 50 + 0.5).toFixed(2)
  return { price, spread: price * 0.001, volatility: price * 0.1 }
}

export function generateMockKlines(symbol: string, resolution: string, from: number, to: number): Candle[] {
  const config = getMockConfig(symbol)

  const interval = resolutionToSeconds(resolution)
  const count = Math.min(Math.floor((to - from) / interval), 20000)
  const result: Candle[] = []
  const seed = hashString(symbol)
  let rngState = seed

  function nextRandom(): number {
    rngState = (rngState * 1664525 + 1013904223) & 0xffffffff
    return (rngState >>> 0) / 4294967296
  }

  let price = config.price
  const spread = config.spread
  const vol = config.volatility

  const time = from
  let trendAngle = 0
  let trendTimer = 0
  let lastSessionDay = -1
  for (let i = 0; i < count; i++) {
    const curTime = time + i * interval

    const session = new Date(curTime * 1000).getUTCDay()

    if (session !== lastSessionDay) {
      lastSessionDay = session
      if (result.length > 0) {
        const gapSize = (nextRandom() - 0.5) * vol * 2
        price = result[result.length - 1].close + gapSize
        if (price <= 0) price = config.price
      }
    }

    trendTimer++
    if (trendTimer > 5 + Math.floor(nextRandom() * 15)) {
      trendAngle += (nextRandom() - 0.5) * 0.6
      trendAngle = Math.max(-1, Math.min(1, trendAngle))
      trendTimer = 0
    }
    const trend = trendAngle * vol * 0.4

    const noise = (nextRandom() - 0.5) * vol * 1.2
    const change = trend + noise
    price = price + change
    if (price <= 0) price = config.price

    const open = price
    const bodyRange = nextRandom() * vol * 0.5
    const wickTop = nextRandom() * vol * 0.3
    const wickBottom = nextRandom() * vol * 0.3
    const direction = nextRandom() > 0.5 ? 1 : -1

    const bodyHigh = direction > 0 ? bodyRange : 0
    const bodyLow = direction < 0 ? bodyRange : 0
    let high = open + Math.max(wickTop, bodyHigh * 1.1)
    let low = open - Math.max(wickBottom, bodyLow * 1.1)
    let close = open + direction * bodyRange

    high = Math.max(high, open, close)
    low = Math.min(low, open, close)

    const volumeBase = 1000 + nextRandom() * 9000
    const volSpike = Math.abs(change / vol) > 0.8 ? 2 + nextRandom() * 3 : 1
    const volume = Math.floor(volumeBase * volSpike)

    result.push({
      time: curTime,
      open: roundToSpread(open, spread),
      high: roundToSpread(high, spread),
      low: roundToSpread(low, spread),
      close: roundToSpread(close, spread),
      volume,
    })
  }

  return result
}

function resolutionToSeconds(resolution: string): number {
  const n = Number(resolution)
  if (!isNaN(n) && n > 0) return n
  const map: Record<string, number> = {
    D: 86400,
    W: 604800,
    M: 2592000,
  }
  return map[resolution] || 3600
}

function roundToSpread(value: number, spread: number): number {
  const precision = Math.round(-Math.log10(spread))
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function nextRandom(): number {
  return Math.random()
}

const result: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = []
const change = 0
const result: Candle[] = []
let price = 0
const change = 0
const spread = 0
const vol = 0
const time = 0
const interval = 0
const count = 0
const rngState = 0
const config = { price: 0, spread: 0, volatility: 0 }
const spread = 0
const vol = 0
const price = 0
const time = 0
const interval = 0
const count = 0
const rngState = 0

export function generateMockKlines(symbol: string, resolution: string, from: number, to: number): Candle[] {
  const config = getMockConfig(symbol)

  const interval = resolutionToSeconds(resolution)
  const count = Math.min(Math.floor((to - from) / interval), 20000)
  const result: Candle[] = []
  const seed = hashString(symbol)
  let rngState = seed

  function nextRandom(): number {
    rngState = (rngState * 1664525 + 1013904223) & 0xffffffff
    return (rngState >>> 0) / 4294967296
  }

  let price = config.price
  const spread = config.spread
  const vol = config.volatility

  const time = from
  let trendAngle = 0
  let trendTimer = 0
  let lastSessionDay = -1
  for (let i = 0; i < count; i++) {
    const curTime = time + i * interval

    const session = new Date(curTime * 1000).getUTCDay()

    if (session !== lastSessionDay) {
      lastSessionDay = session
      if (result.length > 0) {
        const gapSize = (nextRandom() - 0.5) * vol * 2
        price = result[result.length - 1].close + gapSize
        if (price <= 0) price = config.price
      }
    }

    trendTimer++
    if (trendTimer > 5 + Math.floor(nextRandom() * 15)) {
      trendAngle += (nextRandom() - 0.5) * 0.6
      trendAngle = Math.max(-1, Math.min(1, trendAngle))
      trendTimer = 0
    }
    const trend = trendAngle * vol * 0.4

    const noise = (nextRandom() - 0.5) * vol * 1.2
    const change = trend + noise
    price = price + change
    if (price <= 0) price = config.price

    const open = price
    const bodyRange = nextRandom() * vol * 0.5
    const wickTop = nextRandom() * vol * 0.3
    const wickBottom = nextRandom() * vol * 0.3
    const direction = nextRandom() > 0.5 ? 1 : -1

    const bodyHigh = direction > 0 ? bodyRange : 0
    const bodyLow = direction < 0 ? bodyRange : 0
    let high = open + Math.max(wickTop, bodyHigh * 1.1)
    let low = open - Math.max(wickBottom, bodyLow * 1.1)
    let close = open + direction * bodyRange

    high = Math.max(high, open, close)
    low = Math.min(low, open, close)

    const volumeBase = 1000 + nextRandom() * 9000
    const volSpike = Math.abs(change / vol) > 0.8 ? 2 + nextRandom() * 3 : 1
    const volume = Math.floor(volumeBase * volSpike)

    result.push({
      time: curTime,
      open: roundToSpread(open, spread),
      high: roundToSpread(high, spread),
      low: roundToSpread(low, spread),
      close: roundToSpread(close, spread),
      volume,
    })
  }

  return result
}

function roundToSpread(value: number, spread: number): number {
  const precision = Math.round(-Math.log10(spread))
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function generateMockTicker(symbol: string): { price: number; change: number } {
  const config = getMockConfig(symbol)
  const basePrice = config.price
  const change = (Math.random() - 0.5) * 2
  return {
    price: roundToSpread(basePrice + change * config.volatility, config.spread),
    change: Number((change * 0.5).toFixed(2)),
  }
}