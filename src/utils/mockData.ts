import type { Kline } from './marketData'

const BASE_PRICES: Record<string, { price: number; spread: number; volatility: number }> = {
  EURUSD: { price: 1.0850, spread: 0.0001, volatility: 0.0005 },
  GBPUSD: { price: 1.2650, spread: 0.0002, volatility: 0.0006 },
  USDJPY: { price: 151.50, spread: 0.01, volatility: 0.05 },
  AUDUSD: { price: 0.6550, spread: 0.0001, volatility: 0.0005 },
  USDCAD: { price: 1.3650, spread: 0.0001, volatility: 0.0005 },
  NZDUSD: { price: 0.5950, spread: 0.0001, volatility: 0.0005 },
  XAUUSD: { price: 2320.00, spread: 0.10, volatility: 1.50 },
  XAGUSD: { price: 27.50, spread: 0.01, volatility: 0.10 },
}

function resolutionToSeconds(resolution: string): number {
  const map: Record<string, number> = {
    '1': 60, '3': 180, '5': 300, '15': 900,
    '30': 1800, '60': 3600, '120': 7200,
    '240': 14400, '360': 21600, '720': 43200,
    'D': 86400, 'W': 604800, 'M': 2592000,
  }
  return map[resolution] || 3600
}

export function generateMockKlines(
  symbol: string,
  resolution: string,
  from: number,
  to: number,
): Kline[] {
  const config = BASE_PRICES[symbol]
  if (!config) return []

  const interval = resolutionToSeconds(resolution)
  const count = Math.min(Math.floor((to - from) / interval), 5000)
  const result: Kline[] = []
  const seed = hashString(symbol)
  let rngState = seed

  function nextRandom(): number {
    rngState = (rngState * 1664525 + 1013904223) & 0xffffffff
    return (rngState >>> 0) / 4294967296
  }

  let price = config.price
  const spread = config.spread
  const vol = config.volatility

  for (let i = 0; i < count; i++) {
    const time = from + i * interval
    const change = (nextRandom() - 0.5) * vol * 2
    price = price + change

    const open = price
    const high = open + nextRandom() * vol
    const low = open - nextRandom() * vol
    const close = open + (nextRandom() - 0.5) * vol * 0.5

    result.push({
      time,
      open: roundToSpread(open, spread),
      high: roundToSpread(Math.max(open, high, close), spread),
      low: roundToSpread(Math.min(open, low, close), spread),
      close: roundToSpread(close, spread),
      volume: Math.floor(nextRandom() * 10000),
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
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function generateMockTicker(symbol: string): { price: number; change: number } {
  const config = BASE_PRICES[symbol]
  if (!config) return { price: 0, change: 0 }

  const basePrice = config.price
  const change = (Math.random() - 0.5) * 2
  return {
    price: roundToSpread(basePrice + change * config.volatility, config.spread),
    change: Number((change * 0.5).toFixed(2)),
  }
}
