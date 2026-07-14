import {
  Ticker, Candle, OrderBook, FundingRate, OpenInterest,
  SymbolDefinition, ProviderCapabilities, ProviderConfig,
  MarketType, Resolution, ProviderName,
} from './types'

export interface MarketDataProvider {
  readonly name: ProviderName
  readonly capabilities: ProviderCapabilities
  readonly config: ProviderConfig

  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean

  getTicker(symbol: string): Promise<Ticker>
  getTickers(symbols: string[]): Promise<Map<string, Ticker>>

  getOHLCV(
    symbol: string,
    resolution: Resolution,
    from?: number,
    to?: number,
    limit?: number
  ): Promise<Candle[]>

  getOrderBook(symbol: string, limit?: number): Promise<OrderBook>

  getFundingRate?(symbol: string): Promise<FundingRate>
  getOpenInterest?(symbol: string): Promise<OpenInterest>

  searchSymbols(query: string, marketType?: MarketType): Promise<SymbolDefinition[]>

  subscribeTicker(
    symbols: string[],
    onTick: (ticker: Ticker) => void
  ): () => void

  subscribeOHLCV(
    symbols: string[],
    resolution: Resolution,
    onCandle: (candle: Candle) => void
  ): () => void

  subscribeOrderBook?(
    symbol: string,
    onBook: (book: OrderBook) => void
  ): () => void
}
