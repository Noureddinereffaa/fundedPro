import * as ccxt from 'ccxt'
import { MarketDataProvider } from '../provider.js'
import {
  Ticker, Candle, OrderBook, FundingRate, OpenInterest,
  SymbolDefinition, ProviderCapabilities, ProviderConfig,
  MarketType, Resolution, ProviderName,
} from '../types.js'
import { MarketDataError, ProviderNotConnectedError } from '../errors.js'
import { logger } from '../../utils/logger.js'

const CCXT_INTERVAL_MAP: Partial<Record<Resolution, string>> = {
  [Resolution.M1]: '1m',
  [Resolution.M5]: '5m',
  [Resolution.M15]: '15m',
  [Resolution.M30]: '30m',
  [Resolution.H1]: '1h',
  [Resolution.H4]: '4h',
  [Resolution.D1]: '1d',
  [Resolution.W1]: '1w',
  [Resolution.MN1]: '1M',
}

function toNum(v: ccxt.Num | undefined, fallback: number = 0): number {
  if (v === undefined || v === null) return fallback
  return Number(v)
}

export class CCXTProvider implements MarketDataProvider {
  readonly name = ProviderName.CCXT
  readonly capabilities: ProviderCapabilities
  readonly config: ProviderConfig

  private exchange: ccxt.Exchange | null
  private tickerSubscriptions: Map<string, Set<(ticker: Ticker) => void>>
  private ohlcvSubscriptions: Map<string, Set<(candle: Candle) => void>>
  private watchDogTimer: ReturnType<typeof setInterval> | null

  constructor(config: ProviderConfig) {
    this.config = config
    this.exchange = null
    this.tickerSubscriptions = new Map()
    this.ohlcvSubscriptions = new Map()
    this.watchDogTimer = null

    this.capabilities = {
      spotTrading: true,
      futuresTrading: false,
      marginTrading: false,
      ohlcv: [
        Resolution.M1, Resolution.M5, Resolution.M15, Resolution.M30,
        Resolution.H1, Resolution.H4, Resolution.D1, Resolution.W1, Resolution.MN1,
      ],
      ticker: true,
      orderBook: true,
      fundingRate: false,
      openInterest: false,
      news: false,
      economicData: false,
      fundamentalData: false,
      technicalIndicators: false,
      historicalData: true,
      realtimeStream: true,
      search: true,
    }
  }

  async connect(): Promise<void> {
    try {
      const options: Record<string, unknown> = {
        enableRateLimit: true,
        timeout: 30000,
        ...this.config.options,
      }

      if (this.config.apiKey) options.apiKey = this.config.apiKey
      if (this.config.apiSecret) options.apiSecret = this.config.apiSecret

      this.exchange = new ccxt.binance(options)
      await this.exchange.loadMarkets()
      this.watchDogTimer = setInterval(() => this.checkConnection(), 30000)
      logger.info(`CCXTProvider: connected to ${this.config.baseUrl || 'binance'}`)
    } catch (err) {
      throw new MarketDataError(this.name, '', `Connection failed: ${err}`, true, 'CONNECTION_FAILED')
    }
  }

  async disconnect(): Promise<void> {
    if (this.watchDogTimer) {
      clearInterval(this.watchDogTimer)
      this.watchDogTimer = null
    }
    this.tickerSubscriptions.clear()
    this.ohlcvSubscriptions.clear()
    this.exchange = null
    logger.info('CCXTProvider: disconnected')
  }

  isConnected(): boolean {
    return this.exchange !== null
  }

  async getTicker(symbol: string): Promise<Ticker> {
    this.ensureConnected()
    try {
      const ticker = await this.exchange!.fetchTicker(symbol)
      return this.normalizeTicker(ticker)
    } catch (err) {
      throw new MarketDataError(this.name, symbol, `getTicker failed: ${err}`, true)
    }
  }

  async getTickers(symbols: string[]): Promise<Map<string, Ticker>> {
    this.ensureConnected()
    const result = new Map<string, Ticker>()
    try {
      const tickers = await this.exchange!.fetchTickers(symbols)
      for (const [sym, ticker] of Object.entries(tickers)) {
        if (ticker) result.set(sym, this.normalizeTicker(ticker))
      }
    } catch {
      for (const sym of symbols) {
        try {
          const ticker = await this.getTicker(sym)
          result.set(sym, ticker)
        } catch { continue }
      }
    }
    return result
  }

  async getOHLCV(
    symbol: string,
    resolution: Resolution,
    from?: number,
    to?: number,
    limit: number = 500
  ): Promise<Candle[]> {
    this.ensureConnected()
    const interval = CCXT_INTERVAL_MAP[resolution]
    if (!interval) throw new MarketDataError(this.name, symbol, `Unsupported resolution: ${resolution}`, false)

    try {
      const since = from ? from * 1000 : undefined
      const candles = await this.exchange!.fetchOHLCV(symbol, interval, since, limit, {
        until: to ? to * 1000 : undefined,
      })
      return candles.map(c => ({
        symbol,
        resolution,
        timestamp: toNum(c[0]),
        open: toNum(c[1]),
        high: toNum(c[2]),
        low: toNum(c[3]),
        close: toNum(c[4]),
        volume: toNum(c[5]),
      }))
    } catch (err) {
      throw new MarketDataError(this.name, symbol, `getOHLCV failed: ${err}`, true)
    }
  }

  async getOrderBook(symbol: string, limit: number = 50): Promise<OrderBook> {
    this.ensureConnected()
    try {
      const book = await this.exchange!.fetchOrderBook(symbol, limit)
      return {
        symbol,
        bids: book.bids.map(([price, size]) => ({ price: toNum(price), size: toNum(size) })),
        asks: book.asks.map(([price, size]) => ({ price: toNum(price), size: toNum(size) })),
        timestamp: book.timestamp || Date.now(),
        provider: this.name,
      }
    } catch (err) {
      throw new MarketDataError(this.name, symbol, `getOrderBook failed: ${err}`, true)
    }
  }

  async getFundingRate(symbol: string): Promise<FundingRate> {
    this.ensureConnected()
    try {
      const result = await this.exchange!.fetchFundingRate(symbol)
      return {
        symbol,
        fundingRate: toNum(result.fundingRate),
        nextFundingTime: toNum(result.nextFundingDatetime ? new Date(result.nextFundingDatetime).getTime() : 0),
        timestamp: toNum(result.timestamp, Date.now()),
      }
    } catch (err) {
      throw new MarketDataError(this.name, symbol, `getFundingRate failed: ${err}`, true)
    }
  }

  async getOpenInterest(symbol: string): Promise<OpenInterest> {
    this.ensureConnected()
    try {
      const result = await this.exchange!.fetchOpenInterest(symbol)
      return {
        symbol,
        openInterest: toNum('openInterest' in result ? (result as Record<string, unknown>).openInterest as number : 0),
        timestamp: toNum(result.timestamp, Date.now()),
      }
    } catch (err) {
      throw new MarketDataError(this.name, symbol, `getOpenInterest failed: ${err}`, true)
    }
  }

  async searchSymbols(query: string, _marketType?: MarketType): Promise<SymbolDefinition[]> {
    if (!this.exchange) throw new ProviderNotConnectedError(this.name, '')
    const q = query.toUpperCase()
    const markets = this.exchange.markets
    const results: SymbolDefinition[] = []

    for (const [id, market] of Object.entries(markets)) {
      if (!market.active || !market.spot) continue
      if (!id.includes(q)) continue
      results.push({
        id,
        symbol: id,
        name: `${market.base}/${market.quote}`,
        description: `${market.base} / ${market.quote} on ${market.exchange}`,
        marketType: MarketType.CRYPTO,
        baseCurrency: market.base || id,
        quoteCurrency: market.quote || 'USDT',
        precision: market.precision?.price || 2,
        minLot: market.limits?.amount?.min || 0.001,
        lotStep: market.precision?.amount || 0.001,
        pipValue: 0.01,
        contractSize: 1,
        providerSymbols: { [ProviderName.CCXT]: id },
        isActive: true,
      })
    }
    return results.slice(0, 20)
  }

  subscribeTicker(symbols: string[], onTick: (ticker: Ticker) => void): () => void {
    for (const symbol of symbols) {
      if (!this.tickerSubscriptions.has(symbol)) {
        this.tickerSubscriptions.set(symbol, new Set())
      }
      this.tickerSubscriptions.get(symbol)!.add(onTick)
    }
    this.startWatchDog()
    return () => {
      for (const symbol of symbols) {
        const subs = this.tickerSubscriptions.get(symbol)
        if (subs) {
          subs.delete(onTick)
          if (subs.size === 0) this.tickerSubscriptions.delete(symbol)
        }
      }
      if (this.tickerSubscriptions.size === 0 && this.ohlcvSubscriptions.size === 0) this.stopWatchDog()
    }
  }

  subscribeOHLCV(symbols: string[], resolution: Resolution, onCandle: (candle: Candle) => void): () => void {
    const key = `${resolution}`
    for (const symbol of symbols) {
      const subKey = `${symbol}:${key}`
      if (!this.ohlcvSubscriptions.has(subKey)) this.ohlcvSubscriptions.set(subKey, new Set())
      this.ohlcvSubscriptions.get(subKey)!.add(onCandle)
    }
    this.startWatchDog()
    return () => {
      for (const symbol of symbols) {
        const subKey = `${symbol}:${key}`
        const subs = this.ohlcvSubscriptions.get(subKey)
        if (subs) {
          subs.delete(onCandle)
          if (subs.size === 0) this.ohlcvSubscriptions.delete(subKey)
        }
      }
      if (this.tickerSubscriptions.size === 0 && this.ohlcvSubscriptions.size === 0) this.stopWatchDog()
    }
  }

  subscribeOrderBook(symbol: string, onBook: (book: OrderBook) => void): () => void {
    const intervalId = setInterval(async () => {
      try {
        const book = await this.getOrderBook(symbol)
        onBook(book)
      } catch { /* ignore poll errors */ }
    }, 1000)
    return () => clearInterval(intervalId)
  }

  private startWatchDog(): void {
    if (this.watchDogTimer) return
    this.watchDogTimer = setInterval(() => this.pollSubscriptions(), 2000)
  }

  private stopWatchDog(): void {
    if (this.watchDogTimer) {
      clearInterval(this.watchDogTimer)
      this.watchDogTimer = null
    }
  }

  private async pollSubscriptions(): Promise<void> {
    if (!this.exchange) return
    const tickerSymbols = Array.from(this.tickerSubscriptions.keys())
    if (tickerSymbols.length > 0) {
      try {
        const tickers = await this.exchange.fetchTickers(tickerSymbols)
        for (const [sym, ticker] of Object.entries(tickers)) {
          if (!ticker) continue
          const normalized = this.normalizeTicker(ticker)
          const callbacks = this.tickerSubscriptions.get(sym)
          if (callbacks) for (const cb of callbacks) cb(normalized)
        }
      } catch (err) {
        logger.warn(`CCXTProvider: ticker poll error: ${err}`)
      }
    }
    const ohlcvSet = new Set<string>(Array.from(this.ohlcvSubscriptions.keys()).map(k => k.split(':')[0]))
    for (const sym of ohlcvSet) {
      try {
        const c = await this.exchange.fetchOHLCV(sym, '1m', undefined, 1)
        if (c.length > 0) {
          const candle: Candle = {
            symbol: sym,
            resolution: Resolution.M1,
            timestamp: toNum(c[0][0]),
            open: toNum(c[0][1]),
            high: toNum(c[0][2]),
            low: toNum(c[0][3]),
            close: toNum(c[0][4]),
            volume: toNum(c[0][5]),
          }
          const subKey = `${sym}:${Resolution.M1}`
          const callbacks = this.ohlcvSubscriptions.get(subKey)
          if (callbacks) for (const cb of callbacks) cb(candle)
        }
      } catch { continue }
    }
  }

  private async checkConnection(): Promise<void> {
    if (!this.exchange) return
    try {
      await this.exchange.fetchTime()
    } catch {
      logger.warn('CCXTProvider: connection lost, reconnecting...')
      try {
        await this.disconnect()
        await this.connect()
      } catch (err) {
        logger.error(`CCXTProvider: reconnect failed: ${err}`)
      }
    }
  }

  private ensureConnected(): void {
    if (!this.exchange) throw new ProviderNotConnectedError(this.name, '')
  }

  private normalizeTicker(ticker: ccxt.Ticker): Ticker {
    return {
      symbol: ticker.symbol || '',
      price: toNum(ticker.last),
      bid: toNum(ticker.bid),
      ask: toNum(ticker.ask),
      change: toNum(ticker.change),
      changePercent: toNum(ticker.percentage),
      high24h: toNum(ticker.high),
      low24h: toNum(ticker.low),
      volume: toNum(ticker.baseVolume),
      quoteVolume: toNum(ticker.quoteVolume),
      timestamp: toNum(ticker.timestamp, Date.now()),
      provider: this.name,
      marketType: MarketType.CRYPTO,
    }
  }
}
