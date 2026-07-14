import { MarketDataProvider } from '../provider'
import {
  Ticker, Candle, OrderBook, SymbolDefinition,
  ProviderCapabilities, ProviderConfig,
  MarketType, Resolution, ProviderName, RESOLUTION_SECONDS,
} from '../types'
import { MarketDataError, ProviderNotConnectedError } from '../errors'
import { logger } from '../../utils/logger'

interface OpenBBTickerResponse {
  symbol: string
  price: number
  change: number
  changePercent: number
  high?: number
  low?: number
  volume?: number
  timestamp?: number
}

interface OpenBBOHLCVResponse {
  symbol: string
  interval: string
  data: Array<{
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
}

export class OpenBBProvider implements MarketDataProvider {
  readonly name = ProviderName.OPENBB
  readonly capabilities: ProviderCapabilities
  readonly config: ProviderConfig

  private baseUrl: string
  private apiKey: string
  private connected: boolean

  constructor(config: ProviderConfig) {
    this.config = config
    this.baseUrl = config.baseUrl || 'https://openbb.co/api/v1'
    this.apiKey = config.apiKey || ''
    this.connected = false

    this.capabilities = {
      spotTrading: false,
      futuresTrading: false,
      marginTrading: false,
      ohlcv: [
        Resolution.M1, Resolution.M5, Resolution.M15, Resolution.M30,
        Resolution.H1, Resolution.H4, Resolution.D1, Resolution.W1, Resolution.MN1,
      ],
      ticker: true,
      orderBook: false,
      fundingRate: false,
      openInterest: false,
      news: true,
      economicData: true,
      fundamentalData: true,
      technicalIndicators: true,
      historicalData: true,
      realtimeStream: false,
      search: true,
    }
  }

  async connect(): Promise<void> {
    if (this.apiKey) {
      try {
        const resp = await fetch(`${this.baseUrl}/health`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        })
        this.connected = resp.ok
        if (this.connected) {
          logger.info('OpenBBProvider: connected via REST API')
          return
        }
      } catch {
        logger.warn('OpenBBProvider: REST API unavailable, using fallback HTTP mode')
      }
    }

    this.connected = true
    logger.info('OpenBBProvider: initialized in HTTP fallback mode')
  }

  async disconnect(): Promise<void> {
    this.connected = false
    logger.info('OpenBBProvider: disconnected')
  }

  isConnected(): boolean {
    return this.connected
  }

  async getTicker(symbol: string): Promise<Ticker> {
    this.ensureConnected()

    if (this.apiKey) {
      try {
        return await this.fetchTickerFromAPI(symbol)
      } catch { /* fall through */ }
    }

    return this.fetchTickerFromYahoo(symbol)
  }

  async getTickers(symbols: string[]): Promise<Map<string, Ticker>> {
    const result = new Map<string, Ticker>()
    const batchSize = 10

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      const promises = batch.map(s => this.getTicker(s).catch(() => null))
      const tickers = await Promise.all(promises)
      for (let j = 0; j < batch.length; j++) {
        if (tickers[j]) result.set(batch[j], tickers[j]!)
      }
    }

    return result
  }

  async getOHLCV(
    symbol: string,
    resolution: Resolution,
    from?: number,
    to?: number,
    limit: number = 200
  ): Promise<Candle[]> {
    this.ensureConnected()

    if (this.apiKey) {
      try {
        return await this.fetchOHLCVFromAPI(symbol, resolution, from, to, limit)
      } catch { /* fall through */ }
    }

    return this.fetchOHLCVFromYahoo(symbol, resolution, from, to, limit)
  }

  async getOrderBook(_symbol: string, _limit?: number): Promise<OrderBook> {
    throw new MarketDataError(this.name, _symbol, 'OpenBB does not support order book data', false)
  }

  async searchSymbols(query: string, marketType?: MarketType): Promise<SymbolDefinition[]> {
    const results: SymbolDefinition[] = []

    if (marketType && marketType !== MarketType.CRYPTO) {
      const yahooResults = await this.searchYahooFinance(query, marketType)
      results.push(...yahooResults)
    }

    return results.slice(0, 20)
  }

  subscribeTicker(
    _symbols: string[],
    _onTick: (ticker: Ticker) => void
  ): () => void {
    logger.warn('OpenBBProvider: realtime ticker not supported')
    return () => {}
  }

  subscribeOHLCV(
    _symbols: string[],
    _resolution: Resolution,
    _onCandle: (candle: Candle) => void
  ): () => void {
    logger.warn('OpenBBProvider: realtime OHLCV not supported')
    return () => {}
  }

  private ensureConnected(): void {
    if (!this.connected) throw new ProviderNotConnectedError(this.name, '')
  }

  private async fetchTickerFromAPI(symbol: string): Promise<Ticker> {
    const resp = await fetch(
      `${this.baseUrl}/market/quote/${encodeURIComponent(symbol)}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    )
    if (!resp.ok) throw new Error(`OpenBB API error: ${resp.status}`)

    const data: OpenBBTickerResponse = await resp.json() as OpenBBTickerResponse
    return {
      symbol,
      price: data.price,
      bid: data.price,
      ask: data.price,
      change: data.change,
      changePercent: data.changePercent,
      high24h: data.high || 0,
      low24h: data.low || 0,
      volume: data.volume || 0,
      quoteVolume: data.volume || 0,
      timestamp: data.timestamp || Date.now(),
      provider: this.name,
      marketType: this.inferMarketType(symbol),
    }
  }

  private async fetchTickerFromYahoo(symbol: string): Promise<Ticker> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!resp.ok) throw new MarketDataError(this.name, symbol, `Yahoo error: ${resp.status}`, true)

    const data = await resp.json() as any
    const result = data?.chart?.result?.[0]
    if (!result) throw new MarketDataError(this.name, symbol, 'No data from Yahoo', true)

    const meta = result.meta
    const quotes = result.indicators?.quote?.[0]

    return {
      symbol,
      price: meta.regularMarketPrice || meta.previousClose || 0,
      bid: meta.regularMarketPrice || 0,
      ask: meta.regularMarketPrice || 0,
      change: (meta.regularMarketPrice || 0) - (meta.previousClose || 0),
      changePercent: meta.previousClose
        ? (((meta.regularMarketPrice || 0) - meta.previousClose) / meta.previousClose) * 100
        : 0,
      high24h: meta.regularMarketDayHigh || meta.regularMarketPrice || 0,
      low24h: meta.regularMarketDayLow || meta.regularMarketPrice || 0,
      volume: quotes?.volume?.[0] || 0,
      quoteVolume: quotes?.volume?.[0] || 0,
      timestamp: Math.floor((result.timestamp?.[0] || Date.now() / 1000)) * 1000,
      provider: this.name,
      marketType: this.inferMarketType(symbol),
    }
  }

  private async fetchOHLCVFromAPI(
    symbol: string,
    resolution: Resolution,
    from?: number,
    to?: number,
    limit?: number
  ): Promise<Candle[]> {
    const params = new URLSearchParams({
      symbol,
      interval: resolution,
      ...(from ? { from: String(from) } : {}),
      ...(to ? { to: String(to) } : {}),
      ...(limit ? { limit: String(limit) } : {}),
    })

    const resp = await fetch(
      `${this.baseUrl}/market/history?${params}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    )
    if (!resp.ok) throw new Error(`OpenBB API error: ${resp.status}`)

    const data = await resp.json() as OpenBBOHLCVResponse
    return data.data.map(d => ({
      symbol,
      resolution,
      timestamp: new Date(d.date).getTime(),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }))
  }

  private async fetchOHLCVFromYahoo(
    symbol: string,
    resolution: Resolution,
    from?: number,
    to?: number,
    limit?: number
  ): Promise<Candle[]> {
    const seconds = RESOLUTION_SECONDS[resolution]
    const range = from && to ? Math.min((to - from) / seconds, 1000) : (limit || 200)
    const period1 = from || Math.floor(Date.now() / 1000) - range * seconds
    const period2 = to || Math.floor(Date.now() / 1000)

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=${this.yahooInterval(resolution)}`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!resp.ok) throw new MarketDataError(this.name, symbol, `Yahoo error: ${resp.status}`, true)

    const data = await resp.json() as any
    const result = data?.chart?.result?.[0]
    if (!result) throw new MarketDataError(this.name, symbol, 'No data from Yahoo', true)

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

  private async searchYahooFinance(query: string, marketType?: MarketType): Promise<SymbolDefinition[]> {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!resp.ok) return []

    const data = await resp.json() as any
    return (data.quotes || [])
      .filter((q: { symbol: string; quoteType: string }) => {
        if (!marketType) return true
        return this.yahooTypeToMarket(q.quoteType) === marketType
      })
      .map((q: { symbol: string; shortname?: string; longname?: string; quoteType: string; exchange?: string }) => ({
        id: q.symbol,
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        description: `${q.longname || q.shortname || q.symbol} [${q.exchange || ''}]`,
        marketType: this.yahooTypeToMarket(q.quoteType),
        baseCurrency: q.symbol,
        quoteCurrency: 'USD',
        precision: 2,
        minLot: 1,
        lotStep: 1,
        pipValue: 0.01,
        contractSize: 1,
        providerSymbols: { [ProviderName.YAHOO]: q.symbol, [ProviderName.OPENBB]: q.symbol },
        isActive: true,
      }))
  }

  private yahooInterval(resolution: Resolution): string {
    const map: Partial<Record<Resolution, string>> = {
      [Resolution.M1]: '1m',
      [Resolution.M5]: '5m',
      [Resolution.M15]: '15m',
      [Resolution.M30]: '30m',
      [Resolution.H1]: '60m',
      [Resolution.H4]: '4h',
      [Resolution.D1]: '1d',
      [Resolution.W1]: '1wk',
      [Resolution.MN1]: '1mo',
    }
    return map[resolution] || '1d'
  }

  private yahooTypeToMarket(quoteType: string): MarketType {
    const map: Record<string, MarketType> = {
      EQUITY: MarketType.STOCKS,
      ETF: MarketType.ETFs,
      FUTURE: MarketType.COMMODITIES,
      INDEX: MarketType.INDICES,
      CURRENCY: MarketType.FOREX,
      CRYPTOCURRENCY: MarketType.CRYPTO,
      MUTUALFUND: MarketType.ETFs,
      BOND: MarketType.BONDS,
    }
    return map[quoteType] || MarketType.STOCKS
  }

  private inferMarketType(symbol: string): MarketType {
    const upper = symbol.toUpperCase()
    if (upper.endsWith('=X')) return MarketType.FOREX
    if (upper.includes('GOLD') || upper.includes('SILVER') || upper.includes('XAU') || upper.includes('XAG')) return MarketType.METALS
    if (upper.startsWith('^')) return MarketType.INDICES
    if (upper.endsWith('.US') || upper.length <= 5) return MarketType.STOCKS
    return MarketType.STOCKS
  }
}
