import { createClient, RedisClientType } from 'redis'
import { Ticker, Candle, OrderBook } from './types'
import { logger } from '../utils/logger'

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export class MarketDataCache {
  private memoryCache: Map<string, CacheEntry<unknown>>
  private redis: RedisClientType | null
  private useRedis: boolean

  constructor() {
    this.memoryCache = new Map()
    this.redis = null
    this.useRedis = false
  }

  async connect(redisUrl?: string): Promise<void> {
    if (!redisUrl) return
    try {
      this.redis = createClient({ url: redisUrl })
      await this.redis.connect()
      this.useRedis = true
      logger.info('MarketDataCache: Redis connected')
    } catch {
      logger.warn('MarketDataCache: Redis unavailable, using memory cache')
      this.useRedis = false
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
      this.redis = null
    }
    this.memoryCache.clear()
  }

  private memoryKey(prefix: string, key: string): string {
    return `${prefix}:${key}`
  }

  async getTicker(symbol: string): Promise<Ticker | null> {
    return this.get<Ticker>('ticker', symbol)
  }

  async setTicker(symbol: string, ticker: Ticker, ttlMs: number = 5000): Promise<void> {
    await this.set('ticker', symbol, ticker, ttlMs)
  }

  async getCandles(symbol: string, resolution: string): Promise<Candle[] | null> {
    return this.get<Candle[]>('candles', `${symbol}:${resolution}`)
  }

  async setCandles(symbol: string, resolution: string, candles: Candle[], ttlMs: number = 60000): Promise<void> {
    await this.set('candles', `${symbol}:${resolution}`, candles, ttlMs)
  }

  async getOrderBook(symbol: string): Promise<OrderBook | null> {
    return this.get<OrderBook>('orderbook', symbol)
  }

  async setOrderBook(symbol: string, book: OrderBook, ttlMs: number = 1000): Promise<void> {
    await this.set('orderbook', symbol, book, ttlMs)
  }

  private async get<T>(prefix: string, key: string): Promise<T | null> {
    if (this.useRedis && this.redis) {
      try {
        const raw = await this.redis.get(`md:${prefix}:${key}`)
        if (raw) return JSON.parse(raw) as T
      } catch { /* fall through to memory */ }
    }

    const memKey = this.memoryKey(prefix, key)
    const entry = this.memoryCache.get(memKey) as CacheEntry<T> | undefined
    if (entry && Date.now() < entry.expiresAt) return entry.data
    if (entry) this.memoryCache.delete(memKey)
    return null
  }

  private async set<T>(prefix: string, key: string, data: T, ttlMs: number): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.set(`md:${prefix}:${key}`, JSON.stringify(data), { PX: ttlMs })
      } catch { /* skip redis error */ }
    }

    const memKey = this.memoryKey(prefix, key)
    this.memoryCache.set(memKey, { data, expiresAt: Date.now() + ttlMs })
  }

  async invalidate(prefix: string, key: string): Promise<void> {
    const memKey = this.memoryKey(prefix, key)
    this.memoryCache.delete(memKey)
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(`md:${prefix}:${key}`)
      } catch { /* ignore */ }
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear()
    if (this.useRedis && this.redis) {
      try {
        const keys = await this.redis.keys('md:*')
        if (keys.length > 0) await this.redis.del(keys)
      } catch { /* ignore */ }
    }
  }
}
