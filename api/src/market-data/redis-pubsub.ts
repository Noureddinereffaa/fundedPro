import { createClient, RedisClientType } from 'redis'
import { Ticker, Candle, OrderBook } from './types.js'
import { logger } from '../utils/logger.js'

// Channel name helpers (matches shared/redis-channels.js)
const CH = {
  TICKER: (s: string) => `market:ticker:${s}`,
  CANDLE: (s: string, r: string) => `market:candle:${s}:${r}`,
  ORDERBOOK: (s: string) => `market:orderbook:${s}`,
  ACTIVE_SYMBOLS: 'market:active:symbols',
}

export class MarketDataPublisher {
  private client: RedisClientType | null
  private enabled: boolean

  constructor() {
    this.client = null
    this.enabled = false
  }

  async connect(redisUrl?: string): Promise<void> {
    if (!redisUrl) {
      logger.warn('MarketDataPublisher: REDIS_URL not set, publishing disabled')
      return
    }
    try {
      this.client = createClient({ url: redisUrl })
      await this.client.connect()
      this.enabled = true
      logger.info('MarketDataPublisher: connected to Redis')
    } catch (err) {
      logger.warn(`MarketDataPublisher: Redis connection failed: ${err}`)
      this.enabled = false
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.client = null
    }
    this.enabled = false
  }

  async publishTicker(ticker: Ticker): Promise<void> {
    if (!this.enabled || !this.client) return
    try {
      await this.client.publish(CH.TICKER(ticker.symbol), JSON.stringify({
        type: 'ticker',
        symbol: ticker.symbol,
        price: ticker.price,
        bid: ticker.bid,
        ask: ticker.ask,
        change: ticker.change,
        changePercent: ticker.changePercent,
        high24h: ticker.high24h,
        low24h: ticker.low24h,
        volume: ticker.volume,
        timestamp: ticker.timestamp,
        provider: ticker.provider,
        marketType: ticker.marketType,
      }))
    } catch (err) {
      logger.warn(`MarketDataPublisher: publishTicker error: ${err}`)
    }
  }

  async publishCandle(candle: Candle): Promise<void> {
    if (!this.enabled || !this.client) return
    try {
      await this.client.publish(CH.CANDLE(candle.symbol, candle.resolution), JSON.stringify({
        type: 'candle',
        symbol: candle.symbol,
        resolution: candle.resolution,
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }))
    } catch (err) {
      logger.warn(`MarketDataPublisher: publishCandle error: ${err}`)
    }
  }

  async publishOrderBook(symbol: string, book: OrderBook): Promise<void> {
    if (!this.enabled || !this.client) return
    try {
      await this.client.publish(CH.ORDERBOOK(symbol), JSON.stringify({
        type: 'orderbook',
        symbol,
        bids: book.bids,
        asks: book.asks,
        timestamp: book.timestamp,
        provider: book.provider,
      }))
    } catch (err) {
      logger.warn(`MarketDataPublisher: publishOrderBook error: ${err}`)
    }
  }

  async setActiveSymbol(symbol: string): Promise<void> {
    if (!this.enabled || !this.client) return
    try {
      await this.client.sAdd(CH.ACTIVE_SYMBOLS, symbol)
      await this.client.expire(CH.ACTIVE_SYMBOLS, 86400)
    } catch { /* ignore */ }
  }

  async removeActiveSymbol(symbol: string): Promise<void> {
    if (!this.enabled || !this.client) return
    try {
      await this.client.sRem(CH.ACTIVE_SYMBOLS, symbol)
    } catch { /* ignore */ }
  }

  async getActiveSymbols(): Promise<string[]> {
    if (!this.enabled || !this.client) return []
    try {
      return await this.client.sMembers(CH.ACTIVE_SYMBOLS)
    } catch {
      return []
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }
}

export const marketDataPublisher = new MarketDataPublisher()
