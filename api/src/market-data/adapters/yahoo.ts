import { MarketDataProvider } from '../provider.js'
import {
  Ticker, Candle, OrderBook, SymbolDefinition,
  ProviderCapabilities, ProviderConfig,
  MarketType, Resolution, ProviderName, RESOLUTION_SECONDS,
} from '../types.js'
import { MarketDataError, ProviderNotConnectedError } from '../errors.js'
import { logger } from '../../utils/logger.js'

export class YahooFinanceProvider implements MarketDataProvider {
  readonly name = ProviderName.YAHOO
  readonly capabilities: ProviderCapabilities
  readonly config: ProviderConfig
  private connected: boolean

  constructor(config: ProviderConfig) {
    this.config = config
    this.connected = false
    this.capabilities = {
      spotTrading: false,
      futuresTrading: false,
      marginTrading: false,
      ohlcv: [Resolution.M1, Resolution.M5, Resolution.M15, Resolution.M30, Resolution.H1, Resolution.H4, Resolution.D1, Resolution.W1, Resolution.MN1],
      ticker: true,
      orderBook: false,
      fundingRate: false,
      openInterest: false,
      news: true,
      economicData: true,
      fundamentalData: true,
      technicalIndicators: false,
      historicalData: true,
      realtimeStream: false,
      search: true,
    }
  }

  async connect(): Promise<void> {
    this.connected = true
    logger.info('YahooFinanceProvider: initialized')
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  isConnected(): boolean { return this.connected }

  async getTicker(symbol: string): Promise<Ticker> {
    this.ensureConnected()
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!resp.ok) throw new MarketDataError(this.name, symbol, `HTTP ${resp.status}`, true)

    const data = await resp.json() as any
    const result = data?.chart?.result?.[0]
    if (!result) throw new MarketDataError(this.name, symbol, 'No data', true)

    const meta = result.meta
    const quotes = result.indicators?.quote?.[0]

    return {
      symbol,
      price: meta.regularMarketPrice || meta.previousClose || 0,
      bid: meta.regularMarketPrice || 0,
      ask: meta.regularMarketPrice || 0,
      change: (meta.regularMarketPrice || 0) - (meta.previousClose || 0),
      changePercent: meta.previousClose ? (((meta.regularMarketPrice || 0) - meta.previousClose) / meta.previousClose) * 100 : 0,
      high24h: meta.regularMarketDayHigh || meta.regularMarketPrice || 0,
      low24h: meta.regularMarketDayLow || meta.regularMarketPrice || 0,
      volume: quotes?.volume?.[0] || 0,
      quoteVolume: quotes?.volume?.[0] || 0,
      timestamp: Math.floor((result.timestamp?.[0] || Date.now() / 1000)) * 1000,
      provider: this.name,
      marketType: MarketType.STOCKS,
    }
  }

  async getTickers(symbols: string[]): Promise<Map<string, Ticker>> {
    const result = new Map<string, Ticker>()
    const batch = Math.min(symbols.length, 10)
    const promises = symbols.slice(0, batch).map(s => this.getTicker(s).catch(() => null))
    const tickers = await Promise.all(promises)
    for (let i = 0; i < symbols.slice(0, batch).length; i++) {
      if (tickers[i]) result.set(symbols[i], tickers[i]!)
    }
    return result
  }

  async getOHLCV(symbol: string, resolution: Resolution, from?: number, to?: number, limit: number = 200): Promise<Candle[]> {
    this.ensureConnected()
    const seconds = RESOLUTION_SECONDS[resolution]
    const range = from && to ? Math.min((to - from) / seconds, 1000) : limit
    const period1 = from || Math.floor(Date.now() / 1000) - range * seconds
    const period2 = to || Math.floor(Date.now() / 1000)
    const interval = this.yahooInterval(resolution)

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=${interval}`
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!resp.ok) throw new MarketDataError(this.name, symbol, `HTTP ${resp.status}`, true)

    const data = await resp.json() as any
    const result = data?.chart?.result?.[0]
    if (!result) throw new MarketDataError(this.name, symbol, 'No data', true)

    const timestamps: number[] = result.timestamp || []
    const quotes = result.indicators?.quote?.[0]
    if (!quotes) return []

    return timestamps.map((t, i) => ({
      symbol,
      resolution,
      timestamp: t * 1000,
      open: quotes.open?.[i] || 0,
      high: quotes.high?.[i] || 0,
      low: quotes.low?.[i] || 0,
      close: quotes.close?.[i] || 0,
      volume: quotes.volume?.[i] || 0,
    })).filter(c => c.open > 0)
  }

  async getOrderBook(_symbol: string, _limit?: number): Promise<OrderBook> {
    throw new MarketDataError(this.name, _symbol, 'Yahoo Finance does not support order book', false)
  }

  async searchSymbols(query: string, _marketType?: MarketType): Promise<SymbolDefinition[]> {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!resp.ok) return []

    const data = await resp.json() as any
    return (data.quotes || []).map((q: { symbol: string; shortname?: string; longname?: string; quoteType?: string; exchange?: string }) => ({
      id: q.symbol,
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      description: `${q.longname || q.shortname || q.symbol} [${q.exchange || ''}]`,
      marketType: MarketType.STOCKS,
      baseCurrency: q.symbol,
      quoteCurrency: 'USD',
      precision: 2,
      minLot: 1,
      lotStep: 1,
      pipValue: 0.01,
      contractSize: 1,
      providerSymbols: { [ProviderName.YAHOO]: q.symbol },
      isActive: true,
    }))
  }

  subscribeTicker(_symbols: string[], _onTick: (ticker: Ticker) => void): () => void {
    logger.warn('YahooFinanceProvider: realtime not supported')
    return () => {}
  }

  subscribeOHLCV(_symbols: string[], _resolution: Resolution, _onCandle: (candle: Candle) => void): () => void {
    return () => {}
  }

  private ensureConnected(): void {
    if (!this.connected) throw new ProviderNotConnectedError(this.name, '')
  }

  private yahooInterval(resolution: Resolution): string {
    const map: Partial<Record<Resolution, string>> = {
      [Resolution.M1]: '1m', [Resolution.M5]: '5m', [Resolution.M15]: '15m',
      [Resolution.M30]: '30m', [Resolution.H1]: '60m', [Resolution.H4]: '4h',
      [Resolution.D1]: '1d', [Resolution.W1]: '1wk', [Resolution.MN1]: '1mo',
    }
    return map[resolution] || '1d'
  }
}
