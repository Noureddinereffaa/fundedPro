import { MarketDataProvider } from '../provider.js'
import {
  Ticker, Candle, OrderBook, SymbolDefinition,
  ProviderCapabilities, ProviderConfig,
  MarketType, Resolution, ProviderName,
} from '../types.js'
import { MarketDataError, ProviderNotConnectedError } from '../errors.js'

async function fetchWithRetry(url: string, retries: number = 3): Promise<Response> {
  const providerName = ProviderName.STOOQ
  for (let attempt = 1; attempt <= retries; attempt++) {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (resp.ok) return resp
    if (resp.status === 429 || resp.status >= 500) {
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
    }
    throw new MarketDataError(providerName, url, `HTTP ${resp.status}`, true)
  }
  throw new MarketDataError(providerName, url, 'All retries exhausted', true)
}

export class StooqProvider implements MarketDataProvider {
  readonly name = ProviderName.STOOQ
  readonly capabilities: ProviderCapabilities
  readonly config: ProviderConfig
  private connected: boolean

  constructor(config: ProviderConfig) {
    this.config = config
    this.connected = false
    this.capabilities = {
      spotTrading: false, futuresTrading: false, marginTrading: false,
      ohlcv: [Resolution.D1, Resolution.W1, Resolution.MN1],
      ticker: true, orderBook: false, fundingRate: false, openInterest: false,
      news: false, economicData: false, fundamentalData: false,
      technicalIndicators: false, historicalData: true,
      realtimeStream: false, search: false,
    }
  }

  async connect(): Promise<void> {
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  isConnected(): boolean { return this.connected }

  async getTicker(symbol: string): Promise<Ticker> {
    this.ensureConnected()
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcvn&h&e=json`
    const resp = await fetchWithRetry(url)

    const data = await resp.json() as any
    const quote = data?.symbols?.[0]
    if (!quote || !quote.last) throw new MarketDataError(this.name, symbol, 'No data', true)

    return {
      symbol,
      price: quote.last,
      bid: quote.bid || quote.last,
      ask: quote.ask || quote.last,
      change: quote.change || 0,
      changePercent: quote.percent || 0,
      high24h: quote.high || quote.last,
      low24h: quote.low || quote.last,
      volume: quote.volume || 0,
      quoteVolume: quote.volume || 0,
      timestamp: new Date(quote.date + ' ' + quote.time).getTime() || Date.now(),
      provider: this.name,
      marketType: MarketType.STOCKS,
    }
  }

  async getTickers(symbols: string[]): Promise<Map<string, Ticker>> {
    const result = new Map<string, Ticker>()
    for (const s of symbols) {
      try {
        const t = await this.getTicker(s)
        result.set(s, t)
      } catch { continue }
    }
    return result
  }

  async getOHLCV(symbol: string, resolution: Resolution, from?: number, to?: number, _limit?: number): Promise<Candle[]> {
    this.ensureConnected()
    if (resolution === Resolution.D1 || resolution === Resolution.W1 || resolution === Resolution.MN1) {
      const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=${this.stooqInterval(resolution)}&d1=${this.dateParam(from)}&d2=${this.dateParam(to)}`
      const resp = await fetchWithRetry(url)

      const text = await resp.text()
      const lines = text.trim().split('\n').slice(1)
      return lines.map(line => {
        const [date, open, high, low, close, volume] = line.split(',')
        return {
          symbol,
          resolution,
          timestamp: new Date(date).getTime(),
          open: Number(open),
          high: Number(high),
          low: Number(low),
          close: Number(close),
          volume: Number(volume || 0),
        }
      }).filter(c => c.open > 0)
    }

    throw new MarketDataError(this.name, symbol, `${resolution} not supported by Stooq`, false)
  }

  async getOrderBook(_symbol: string, _limit?: number): Promise<OrderBook> {
    throw new MarketDataError(this.name, '', 'Stooq does not support order books', false)
  }

  async searchSymbols(_query: string, _marketType?: MarketType): Promise<SymbolDefinition[]> {
    return []
  }

  subscribeTicker(): () => void { return () => {} }
  subscribeOHLCV(): () => void { return () => {} }

  private ensureConnected(): void {
    if (!this.connected) throw new ProviderNotConnectedError(this.name, '')
  }

  private stooqInterval(resolution: Resolution): string {
    const map: Partial<Record<Resolution, string>> = {
      [Resolution.D1]: 'd', [Resolution.W1]: 'w', [Resolution.MN1]: 'm',
    }
    return map[resolution] || 'd'
  }

  private dateParam(ts?: number): string {
    if (!ts) return ''
    const d = new Date(ts * 1000)
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  }
}
