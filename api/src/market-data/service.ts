import {
  Ticker, Candle, OrderBook, Subscription, ProviderConfig,
  MarketType, Resolution, ProviderName, DEFAULT_PROVIDER_PRIORITY,
  SymbolDefinition, SearchResult,
} from './types.js'
import { MarketDataProvider } from './provider.js'
import { providerFactory } from './factory.js'
import { symbolRegistry } from './registry.js'
import { MarketDataCache } from './cache.js'
import { MarketDataError, AllProvidersFailedError, ProviderNotConnectedError } from './errors.js'
import { marketDataPublisher } from './redis-pubsub.js'
import { logger } from '../utils/logger.js'

interface SubscriptionManager {
  ticker: Map<string, Set<(ticker: Ticker) => void>>
  ohlcv: Map<string, Set<(candle: Candle) => void>>
  orderbook: Map<string, Set<(book: OrderBook) => void>>
}

export class MarketDataService {
  private cache: MarketDataCache
  private subscriptions: SubscriptionManager
  private providerSubscriptions: Map<string, () => void>
  private initialized: boolean
  private fallbackTimeout: number

  constructor() {
    this.cache = new MarketDataCache()
    this.subscriptions = {
      ticker: new Map(),
      ohlcv: new Map(),
      orderbook: new Map(),
    }
    this.providerSubscriptions = new Map()
    this.initialized = false
    this.fallbackTimeout = 5000
  }

  async initialize(configs: ProviderConfig[]): Promise<void> {
    if (this.initialized) return

    providerFactory.configure(configs)
    await this.cache.connect(process.env.REDIS_URL)
    await marketDataPublisher.connect(process.env.REDIS_URL)
    this.initialized = true
    logger.info(`MarketDataService: initialized with providers [${configs.map(c => c.name).join(', ')}]`)
  }

  async shutdown(): Promise<void> {
    for (const [, unsubscribe] of this.providerSubscriptions) {
      unsubscribe()
    }
    this.providerSubscriptions.clear()
    await providerFactory.disconnectAll()
    await this.cache.disconnect()
    await marketDataPublisher.disconnect()
    this.initialized = false
    logger.info('MarketDataService: shut down')
  }

  async getTicker(symbol: string, preferProvider?: ProviderName): Promise<Ticker> {
    const sym = symbolRegistry.getBySymbol(symbol)
    if (!sym) throw new MarketDataError(ProviderName.OPENBB, symbol, `Unknown symbol: ${symbol}`, false, 'UNKNOWN_SYMBOL')

    const cached = await this.cache.getTicker(sym.id)
    if (cached && Date.now() - cached.timestamp < 3000) return cached

    return this.withFallback<Ticker>(sym, preferProvider, async (provider, nativeSymbol) => {
      const ticker = await provider.getTicker(nativeSymbol)
      await this.cache.setTicker(sym.id, ticker)
      return ticker
    })
  }

  async getTickers(symbols: string[]): Promise<Map<string, Ticker>> {
    const result = new Map<string, Ticker>()
    const uncached: SymbolDefinition[] = []

    for (const symbol of symbols) {
      const sym = symbolRegistry.getBySymbol(symbol)
      if (!sym) continue
      const cached = await this.cache.getTicker(sym.id)
      if (cached && Date.now() - cached.timestamp < 3000) {
        result.set(sym.id, cached)
      } else {
        uncached.push(sym)
      }
    }

    if (uncached.length === 0) return result

    const provider = await this.resolveProvider(uncached[0].marketType)
    const nativeSymbols = uncached
      .map(s => s.providerSymbols[provider.name])
      .filter(Boolean) as string[]

    try {
      const tickers = await provider.getTickers(nativeSymbols)
      for (const [nativeSym, ticker] of tickers) {
        const sym = symbolRegistry.getByNativeSymbol(provider.name, nativeSym)
        if (sym) {
          result.set(sym.id, ticker)
          await this.cache.setTicker(sym.id, ticker)
        }
      }
    } catch (err) {
      logger.error(`MarketDataService: batch ticker error: ${err}`)
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
    const sym = symbolRegistry.getBySymbol(symbol)
    if (!sym) throw new MarketDataError(ProviderName.OPENBB, symbol, `Unknown symbol: ${symbol}`, false, 'UNKNOWN_SYMBOL')

    // For non-crypto symbols, fall back to daily resolution if sub-daily requested
    const isCrypto = sym.marketType === MarketType.CRYPTO
    const isSubDaily = resolution !== Resolution.D1 && resolution !== Resolution.W1 && resolution !== Resolution.MN1
    const effectiveResolution = isCrypto || !isSubDaily ? resolution : Resolution.D1

    const cached = await this.cache.getCandles(sym.id, effectiveResolution)
    if (cached && cached.length >= limit) return cached

    return this.withFallback<Candle[]>(sym, undefined, async (provider, nativeSymbol) => {
      const candles = await provider.getOHLCV(nativeSymbol, effectiveResolution, from, to, limit)
      await this.cache.setCandles(sym.id, effectiveResolution, candles)
      return candles
    })
  }

  async getOrderBook(symbol: string, limit?: number): Promise<OrderBook> {
    const sym = symbolRegistry.getBySymbol(symbol)
    if (!sym) throw new MarketDataError(ProviderName.OPENBB, symbol, `Unknown symbol: ${symbol}`, false, 'UNKNOWN_SYMBOL')

    const cached = await this.cache.getOrderBook(sym.id)
    if (cached && Date.now() - cached.timestamp < 1000) return cached

    return this.withFallback<OrderBook>(sym, ProviderName.CCXT, async (provider, nativeSymbol) => {
      const book = await provider.getOrderBook!(nativeSymbol, limit)
      await this.cache.setOrderBook(sym.id, book)
      return book
    })
  }

  async searchSymbols(query: string, marketType?: MarketType): Promise<SearchResult[]> {
    return symbolRegistry.search(query, marketType)
  }

  subscribeTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
    const key = symbol.toUpperCase()
    if (!this.subscriptions.ticker.has(key)) {
      this.subscriptions.ticker.set(key, new Set())
      this.startTickerSubscription(symbol)
    }
    this.subscriptions.ticker.get(key)!.add(callback)

    return () => {
      const callbacks = this.subscriptions.ticker.get(key)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.subscriptions.ticker.delete(key)
          this.stopProviderSubscription(`ticker:${key}`)
        }
      }
    }
  }

  subscribeOHLCV(symbol: string, resolution: Resolution, callback: (candle: Candle) => void): () => void {
    const key = `${symbol.toUpperCase()}:${resolution}`
    if (!this.subscriptions.ohlcv.has(key)) {
      this.subscriptions.ohlcv.set(key, new Set())
      this.startOHLCVSubscription(symbol, resolution)
    }
    this.subscriptions.ohlcv.get(key)!.add(callback)

    return () => {
      const callbacks = this.subscriptions.ohlcv.get(key)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.subscriptions.ohlcv.delete(key)
          this.stopProviderSubscription(`ohlcv:${key}`)
        }
      }
    }
  }

  getSymbolInfo(symbol: string): SymbolDefinition | undefined {
    return symbolRegistry.getBySymbol(symbol)
  }

  getAllSymbols(): SymbolDefinition[] {
    return symbolRegistry.getAll()
  }

  getSymbolsByMarketType(type: MarketType): SymbolDefinition[] {
    return symbolRegistry.getByMarketType(type)
  }

  private async resolveProvider(marketType: MarketType, prefer?: ProviderName): Promise<MarketDataProvider> {
    const fallbackProviders = DEFAULT_PROVIDER_PRIORITY[marketType]
    const providers = prefer ? [prefer, ...fallbackProviders.filter(p => p !== prefer)] : fallbackProviders

    for (const name of providers) {
      if (providerFactory.isInitialized(name)) {
        return providerFactory.getProvider(name)
      }
    }

    for (const name of providers) {
      try {
        return await providerFactory.getProvider(name)
      } catch {
        continue
      }
    }

    throw new ProviderNotConnectedError(providers[0], `${marketType} market`)
  }

  private async withFallback<T>(
    sym: SymbolDefinition,
    prefer: ProviderName | undefined,
    fn: (provider: MarketDataProvider, nativeSymbol: string) => Promise<T>
  ): Promise<T> {
    const providers = prefer
      ? [prefer, ...DEFAULT_PROVIDER_PRIORITY[sym.marketType].filter(p => p !== prefer)]
      : DEFAULT_PROVIDER_PRIORITY[sym.marketType]

    const errors: MarketDataError[] = []

    for (const name of providers) {
      if (!providerFactory.isInitialized(name)) {
        try {
          await providerFactory.getProvider(name)
        } catch (err) {
          errors.push(new MarketDataError(name, sym.id, `${err}`, false))
          continue
        }
      }

      const nativeSymbol = sym.providerSymbols[name]
      if (!nativeSymbol) {
        errors.push(new MarketDataError(name, sym.id, `No mapping for ${name}`, false))
        continue
      }

      try {
        const provider = await providerFactory.getProvider(name)
        return await fn(provider, nativeSymbol)
      } catch (err) {
        const mdErr = err instanceof MarketDataError
          ? err
          : new MarketDataError(name, sym.id, `${err}`, true)
        errors.push(mdErr)
        logger.warn(`MarketDataService: fallback from ${name} for ${sym.id}: ${mdErr.message}`)
        continue
      }
    }

    throw new AllProvidersFailedError(sym.id, errors)
  }

  private async startTickerSubscription(symbol: string): Promise<void> {
    const sym = symbolRegistry.getBySymbol(symbol)
    if (!sym) return

    try {
      const provider = await this.resolveProvider(sym.marketType)
      const nativeSymbol = sym.providerSymbols[provider.name]
      if (!nativeSymbol) return

      const unsubscribe = provider.subscribeTicker([nativeSymbol], (ticker) => {
        this.cache.setTicker(sym.id, ticker)
        marketDataPublisher.publishTicker(ticker)
        const callbacks = this.subscriptions.ticker.get(sym.id.toUpperCase())
        if (callbacks) {
          for (const cb of callbacks) cb(ticker)
        }
      })
      this.providerSubscriptions.set(`ticker:${sym.id.toUpperCase()}`, unsubscribe)
    } catch (err) {
      logger.error(`MarketDataService: ticker subscription failed for ${symbol}: ${err}`)
    }
  }

  private async startOHLCVSubscription(symbol: string, resolution: Resolution): Promise<void> {
    const sym = symbolRegistry.getBySymbol(symbol)
    if (!sym) return

    try {
      const provider = await this.resolveProvider(sym.marketType)
      const nativeSymbol = sym.providerSymbols[provider.name]
      if (!nativeSymbol) return

      const unsubscribe = provider.subscribeOHLCV([nativeSymbol], resolution, (candle) => {
        marketDataPublisher.publishCandle(candle)
        const callbacks = this.subscriptions.ohlcv.get(`${sym.id.toUpperCase()}:${resolution}`)
        if (callbacks) {
          for (const cb of callbacks) cb(candle)
        }
      })
      this.providerSubscriptions.set(`ohlcv:${sym.id.toUpperCase()}:${resolution}`, unsubscribe)
    } catch (err) {
      logger.error(`MarketDataService: OHLCV subscription failed for ${symbol}: ${err}`)
    }
  }

  private stopProviderSubscription(key: string): void {
    const unsubscribe = this.providerSubscriptions.get(key)
    if (unsubscribe) {
      unsubscribe()
      this.providerSubscriptions.delete(key)
    }
  }
}

export const marketDataService = new MarketDataService()
