import type { Candle } from '../../shared/types'
import { cacheTTL } from '../../shared/constants'

interface KlineCacheEntry {
  klines: Candle[]
  time: number
}

const klineCache = new Map<string, KlineCacheEntry>()
const MAX_CACHE = 500

export function getCachedKlines(symbol: string, interval: string): Candle[] | null {
  const key = `${symbol}|${interval}`
  const entry = klineCache.get(key)
  if (entry && Date.now() - entry.time < cacheTTL(interval)) {
    klineCache.delete(key)
    klineCache.set(key, entry)
    return entry.klines
  }
  if (entry) klineCache.delete(key)
  return null
}

export function setCachedKlines(symbol: string, interval: string, klines: Candle[]) {
  if (klineCache.size >= MAX_CACHE) {
    const oldest = klineCache.keys().next().value
    if (oldest !== undefined) klineCache.delete(oldest)
  }
  const key = `${symbol}|${interval}`
  klineCache.set(key, { klines, time: Date.now() })
}
