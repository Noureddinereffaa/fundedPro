export enum MarketType {
  CRYPTO = 'crypto',
  FOREX = 'forex',
  METALS = 'metals',
  COMMODITIES = 'commodities',
  INDICES = 'indices',
  STOCKS = 'stocks',
  BONDS = 'bonds',
  ETFs = 'etfs',
}

export enum ProviderName {
  OPENBB = 'openbb',
  CCXT = 'ccxt',
  YAHOO = 'yahoo',
  STOOQ = 'stooq',
  BINANCE = 'binance',
  POLYGON = 'polygon',
  FINNHUB = 'finnhub',
  ALPHA_VANTAGE = 'alpha_vantage',
}

export enum Resolution {
  S1 = '1s',
  M1 = '1m',
  M3 = '3m',
  M5 = '5m',
  M15 = '15m',
  M30 = '30m',
  H1 = '1h',
  H2 = '2h',
  H4 = '4h',
  H6 = '6h',
  H8 = '8h',
  H12 = '12h',
  D1 = '1d',
  W1 = '1w',
  MN1 = '1M',
}

export interface Ticker {
  symbol: string
  price: number
  bid: number
  ask: number
  change: number
  changePercent: number
  high24h: number
  low24h: number
  volume: number
  quoteVolume: number
  timestamp: number
  provider: ProviderName
  marketType: MarketType
}

export interface Candle {
  symbol: string
  resolution: Resolution
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  trades?: number
}

export interface OrderBookLevel {
  price: number
  size: number
  count?: number
}

export interface OrderBook {
  symbol: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  timestamp: number
  provider: ProviderName
}

export interface FundingRate {
  symbol: string
  fundingRate: number
  nextFundingTime: number
  timestamp: number
}

export interface OpenInterest {
  symbol: string
  openInterest: number
  timestamp: number
}

export interface ProviderCapabilities {
  spotTrading: boolean
  futuresTrading: boolean
  marginTrading: boolean
  ohlcv: Resolution[]
  ticker: boolean
  orderBook: boolean
  fundingRate: boolean
  openInterest: boolean
  news: boolean
  economicData: boolean
  fundamentalData: boolean
  technicalIndicators: boolean
  historicalData: boolean
  realtimeStream: boolean
  search: boolean
}

export interface SymbolDefinition {
  id: string
  symbol: string
  name: string
  description: string
  marketType: MarketType
  baseCurrency: string
  quoteCurrency: string
  precision: number
  minLot: number
  lotStep: number
  pipValue: number
  contractSize: number
  sessionHours?: MarketSession[]
  providerSymbols: Partial<Record<ProviderName, string>>
  isActive: boolean
}

export interface MarketSession {
  open: string
  close: string
  timezone: string
}

export interface ProviderConfig {
  name: ProviderName
  enabled: boolean
  priority: number
  apiKey?: string
  apiSecret?: string
  baseUrl?: string
  wsUrl?: string
  rateLimit: number
  rateLimitInterval: number
  options?: Record<string, unknown>
}

export interface SearchResult {
  symbol: SymbolDefinition
  relevance: number
  provider: ProviderName
}

export interface Subscription {
  id: string
  symbol: string
  type: 'ticker' | 'ohlcv' | 'orderbook'
  resolution?: Resolution
  callback: (data: Ticker | Candle | OrderBook) => void
  provider: ProviderName
}

export const RESOLUTION_SECONDS: Record<Resolution, number> = {
  [Resolution.S1]: 1,
  [Resolution.M1]: 60,
  [Resolution.M3]: 180,
  [Resolution.M5]: 300,
  [Resolution.M15]: 900,
  [Resolution.M30]: 1800,
  [Resolution.H1]: 3600,
  [Resolution.H2]: 7200,
  [Resolution.H4]: 14400,
  [Resolution.H6]: 21600,
  [Resolution.H8]: 28800,
  [Resolution.H12]: 43200,
  [Resolution.D1]: 86400,
  [Resolution.W1]: 604800,
  [Resolution.MN1]: 2592000,
}

export const DEFAULT_PROVIDER_PRIORITY: Record<MarketType, ProviderName[]> = {
  [MarketType.CRYPTO]: [ProviderName.CCXT, ProviderName.OPENBB, ProviderName.YAHOO],
  [MarketType.FOREX]: [ProviderName.OPENBB, ProviderName.STOOQ, ProviderName.YAHOO],
  [MarketType.METALS]: [ProviderName.OPENBB, ProviderName.STOOQ, ProviderName.YAHOO],
  [MarketType.COMMODITIES]: [ProviderName.OPENBB, ProviderName.STOOQ, ProviderName.YAHOO],
  [MarketType.INDICES]: [ProviderName.OPENBB, ProviderName.STOOQ, ProviderName.YAHOO],
  [MarketType.STOCKS]: [ProviderName.OPENBB, ProviderName.YAHOO, ProviderName.STOOQ],
  [MarketType.BONDS]: [ProviderName.OPENBB, ProviderName.YAHOO],
  [MarketType.ETFs]: [ProviderName.OPENBB, ProviderName.YAHOO, ProviderName.STOOQ],
}
