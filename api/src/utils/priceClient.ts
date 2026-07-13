import { getCached, setCache } from './redisCache.js'

const PRICE_CACHE_KEY = 'prices:all'
const PRICE_CACHE_TTL = 5

export interface PriceSnapshotClientOptions {
  baseUrl?: string
  ttlMs?: number
  maxRetries?: number
  retryDelayMs?: number
}

export interface PriceSnapshot {
  price: number
  change: number
  source: 'primary' | 'fallback' | 'cache'
  age: number
  timestamp: number
}

export interface PriceData {
  price: number
  change: number
  lastUpdated?: number
  age?: number
}

export interface FetchResult {
  prices: Record<string, PriceData>
  source: string
  error?: Error
}

export function resolveWsServerUrl(overrides?: Partial<PriceSnapshotClientOptions>): string {
  const configured = process.env.WS_SERVER_URL || overrides?.baseUrl
  if (configured) return configured
  return 'http://localhost:3002'
}

const STALE_THRESHOLD_MS = 5000 // if upstream data is older than 5s, treat as stale

export class PriceSnapshotClient {
  private baseUrl: string
  private ttlMs: number
  private maxRetries: number
  private retryDelayMs: number
  private cache: Record<string, PriceData> | null = null
  private cacheTime = 0
  private failureCount = 0
  private lastFailureTime = 0
  private redisAttempted = false
  private maxUpstreamAge: number

  constructor(options: PriceSnapshotClientOptions = {}) {
    this.baseUrl = resolveWsServerUrl(options)
    this.ttlMs = options.ttlMs ?? 2000
    this.maxRetries = options.maxRetries ?? 2
    this.retryDelayMs = options.retryDelayMs ?? 100
    this.maxUpstreamAge = STALE_THRESHOLD_MS
  }

  private isStale(age: number): boolean {
    return age > this.ttlMs
  }

  private calculateBackoff(attempt: number): number {
    return this.retryDelayMs * Math.pow(2, Math.min(attempt, 4))
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private hasUpstreamFreshData(prices: Record<string, PriceData>): boolean {
    const now = Date.now()
    let freshCount = 0
    let totalCount = 0
    for (const symbol of Object.keys(prices)) {
      totalCount++
      const data = prices[symbol]
      if (data.lastUpdated && now - data.lastUpdated < this.maxUpstreamAge) {
        freshCount++
      } else if (!data.lastUpdated) {
        freshCount++ // no timestamp = assume fresh (legacy compat)
      }
    }
    if (totalCount === 0) return false
    return freshCount / totalCount > 0.5 // majority of symbols have fresh data
  }

  async fetchWithRetry(url: string, attempt = 0): Promise<FetchResult> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const payload = (await res.json()) as Record<string, PriceData>
      this.failureCount = 0
      this.lastFailureTime = 0

      setCache(PRICE_CACHE_KEY, payload, PRICE_CACHE_TTL)

      return { prices: payload, source: 'primary' }
    } catch (error) {
      this.failureCount += 1
      this.lastFailureTime = Date.now()

      if (attempt < this.maxRetries) {
        const delay = this.calculateBackoff(attempt)
        await this.sleep(delay)
        return this.fetchWithRetry(url, attempt + 1)
      }

      return {
        prices: {},
        source: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  async getPrices(): Promise<Record<string, PriceData>> {
    const now = Date.now()

    if (this.cache && now - this.cacheTime < this.ttlMs) {
      const upstreamAge = this.getMaxUpstreamAge(this.cache)
      if (upstreamAge < this.maxUpstreamAge) {
        return this.cache
      }
    }

    if (!this.cache && !this.redisAttempted) {
      this.redisAttempted = true
      try {
        const cached = await getCached<Record<string, PriceData>>(PRICE_CACHE_KEY)
        if (cached && Object.keys(cached).length > 0) {
          this.cache = cached
          this.cacheTime = now
          return cached
        }
      } catch { /* skip */ }
    }

    const url = `${this.baseUrl.replace(/\/$/, '')}/prices`

    if (this.failureCount > 0 && this.cache && now - this.lastFailureTime < 5000) {
      console.warn(
        `[PriceClient] Using stale cache after ${this.failureCount} failures. Age: ${now - this.cacheTime}ms`,
      )
      return this.cache
    }

    const result = await this.fetchWithRetry(url)

    if (result.error) {
      console.error(`[PriceClient] Failed to fetch prices after ${this.maxRetries} retries:`, result.error.message)
      try {
        const redisFallback = await getCached<Record<string, PriceData>>(PRICE_CACHE_KEY)
        if (redisFallback && Object.keys(redisFallback).length > 0) {
          return redisFallback
        }
      } catch { /* skip */ }
      return this.cache || {}
    }

    if (this.hasUpstreamFreshData(result.prices)) {
      this.cache = result.prices
      this.cacheTime = now
    } else if (this.cache) {
      console.warn('[PriceClient] Server returned stale data, keeping previous cache')
      return this.cache
    }

    return result.prices
  }

  private getMaxUpstreamAge(prices: Record<string, PriceData>): number {
    const now = Date.now()
    let maxAge = 0
    for (const symbol of Object.keys(prices)) {
      const data = prices[symbol]
      if (data.lastUpdated) {
        const age = now - data.lastUpdated
        if (age > maxAge) maxAge = age
      }
    }
    return maxAge
  }

  async getSinglePrice(symbol: string): Promise<PriceSnapshot | null> {
    const prices = await this.getPrices()
    const priceData = prices[symbol]

    if (!priceData) {
      return null
    }

    const now = Date.now()
    const age = now - this.cacheTime
    const upstreamAge = priceData.lastUpdated ? now - priceData.lastUpdated : age
    const source = upstreamAge < this.maxUpstreamAge ? 'primary' : age < 5000 ? 'cache' : 'fallback'

    return {
      price: priceData.price,
      change: priceData.change,
      source,
      age: upstreamAge,
      timestamp: priceData.lastUpdated || now,
    }
  }

  getFailureMetrics() {
    return {
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      isHealthy: this.failureCount === 0,
      recentFailure: Date.now() - this.lastFailureTime < 10000,
    }
  }
}
