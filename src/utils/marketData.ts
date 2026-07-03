import { dataClient } from './wsClient'
import { generateMockKlines } from './mockData'

// ── Types ───────────────────────────────────────────────────

export interface Kline {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type MarketType = 'crypto' | 'forex' | 'commodity' | 'index'

export interface MarketSymbol {
  symbol: string
  name: string
  type: MarketType
  digits: number
  group: string
}

// ── All Symbols ─────────────────────────────────────────────

export const ALL_SYMBOLS: MarketSymbol[] = [
  // ── Forex Majors ──
  { symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'forex', digits: 5, group: 'Majors' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', type: 'forex', digits: 5, group: 'Majors' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', type: 'forex', digits: 3, group: 'Majors' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', type: 'forex', digits: 5, group: 'Majors' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', type: 'forex', digits: 5, group: 'Majors' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', type: 'forex', digits: 5, group: 'Majors' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', type: 'forex', digits: 5, group: 'Majors' },
  // ── Forex Crosses ──
  { symbol: 'EURGBP', name: 'Euro / British Pound', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'EURJPY', name: 'Euro / Japanese Yen', type: 'forex', digits: 3, group: 'Crosses' },
  { symbol: 'EURAUD', name: 'Euro / Australian Dollar', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'EURCAD', name: 'Euro / Canadian Dollar', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'EURCHF', name: 'Euro / Swiss Franc', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'EURNZD', name: 'Euro / New Zealand Dollar', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', type: 'forex', digits: 3, group: 'Crosses' },
  { symbol: 'GBPAUD', name: 'British Pound / Australian Dollar', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'GBPCAD', name: 'British Pound / Canadian Dollar', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'GBPCHF', name: 'British Pound / Swiss Franc', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'GBPNZD', name: 'British Pound / New Zealand Dollar', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen', type: 'forex', digits: 3, group: 'Crosses' },
  { symbol: 'AUDCAD', name: 'Australian Dollar / Canadian Dollar', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'AUDCHF', name: 'Australian Dollar / Swiss Franc', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'AUDNZD', name: 'Australian Dollar / New Zealand Dollar', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'NZDJPY', name: 'New Zealand Dollar / Japanese Yen', type: 'forex', digits: 3, group: 'Crosses' },
  { symbol: 'NZDCAD', name: 'New Zealand Dollar / Canadian Dollar', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'NZDCHF', name: 'New Zealand Dollar / Swiss Franc', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'CADJPY', name: 'Canadian Dollar / Japanese Yen', type: 'forex', digits: 3, group: 'Crosses' },
  { symbol: 'CADCHF', name: 'Canadian Dollar / Swiss Franc', type: 'forex', digits: 5, group: 'Crosses' },
  { symbol: 'CHFJPY', name: 'Swiss Franc / Japanese Yen', type: 'forex', digits: 3, group: 'Crosses' },
  // ── Forex Exotics ──
  { symbol: 'USDSGD', name: 'US Dollar / Singapore Dollar', type: 'forex', digits: 5, group: 'Exotics' },
  { symbol: 'USDHKD', name: 'US Dollar / Hong Kong Dollar', type: 'forex', digits: 5, group: 'Exotics' },
  { symbol: 'USDKRW', name: 'US Dollar / South Korean Won', type: 'forex', digits: 2, group: 'Exotics' },
  { symbol: 'USDZAR', name: 'US Dollar / South African Rand', type: 'forex', digits: 4, group: 'Exotics' },
  { symbol: 'USDINR', name: 'US Dollar / Indian Rupee', type: 'forex', digits: 2, group: 'Exotics' },
  { symbol: 'USDBRL', name: 'US Dollar / Brazilian Real', type: 'forex', digits: 4, group: 'Exotics' },
  { symbol: 'USDMXN', name: 'US Dollar / Mexican Peso', type: 'forex', digits: 4, group: 'Exotics' },
  { symbol: 'USDTRY', name: 'US Dollar / Turkish Lira', type: 'forex', digits: 4, group: 'Exotics' },
  { symbol: 'USDSEK', name: 'US Dollar / Swedish Krona', type: 'forex', digits: 4, group: 'Exotics' },
  { symbol: 'USDNOK', name: 'US Dollar / Norwegian Krone', type: 'forex', digits: 4, group: 'Exotics' },
  { symbol: 'USDCNH', name: 'US Dollar / Chinese Yuan Offshore', type: 'forex', digits: 4, group: 'Exotics' },
  { symbol: 'USDDKK', name: 'US Dollar / Danish Krone', type: 'forex', digits: 4, group: 'Exotics' },
  { symbol: 'USDPLN', name: 'US Dollar / Polish Zloty', type: 'forex', digits: 4, group: 'Exotics' },
  { symbol: 'EURTRY', name: 'Euro / Turkish Lira', type: 'forex', digits: 4, group: 'Exotics' },
  { symbol: 'EURSEK', name: 'Euro / Swedish Krona', type: 'forex', digits: 4, group: 'Exotics' },
  { symbol: 'EURNOK', name: 'Euro / Norwegian Krone', type: 'forex', digits: 4, group: 'Exotics' },
  // ── Commodities / Metals ──
  { symbol: 'XAUUSD', name: 'Gold / US Dollar', type: 'commodity', digits: 2, group: 'Metals' },
  { symbol: 'XAGUSD', name: 'Silver / US Dollar', type: 'commodity', digits: 3, group: 'Metals' },
  { symbol: 'XPTUSD', name: 'Platinum / US Dollar', type: 'commodity', digits: 2, group: 'Metals' },
  { symbol: 'XPDUSD', name: 'Palladium / US Dollar', type: 'commodity', digits: 2, group: 'Metals' },
  { symbol: 'XCUUSD', name: 'Copper / US Dollar', type: 'commodity', digits: 4, group: 'Metals' },
  // ── Commodities / Energy ──
  { symbol: 'USOIL', name: 'Crude Oil WTI / US Dollar', type: 'commodity', digits: 2, group: 'Energy' },
  { symbol: 'UKOIL', name: 'Brent Crude Oil / US Dollar', type: 'commodity', digits: 2, group: 'Energy' },
  { symbol: 'NGAS', name: 'Natural Gas / US Dollar', type: 'commodity', digits: 3, group: 'Energy' },
  // ── Indices ──
  { symbol: 'SPX', name: 'S&P 500 Index', type: 'index', digits: 2, group: 'Indices' },
  { symbol: 'NDX', name: 'Nasdaq 100 Index', type: 'index', digits: 2, group: 'Indices' },
  { symbol: 'DJI', name: 'Dow Jones Industrial Average', type: 'index', digits: 2, group: 'Indices' },
  { symbol: 'RUT', name: 'Russell 2000 Index', type: 'index', digits: 2, group: 'Indices' },
  { symbol: 'VIX', name: 'CBOE Volatility Index', type: 'index', digits: 2, group: 'Indices' },
  { symbol: 'DAX', name: 'DAX 40 (Germany)', type: 'index', digits: 2, group: 'Indices' },
  { symbol: 'FTSE', name: 'FTSE 100 (UK)', type: 'index', digits: 2, group: 'Indices' },
  { symbol: 'CAC', name: 'CAC 40 (France)', type: 'index', digits: 2, group: 'Indices' },
  { symbol: 'SX5E', name: 'Euro Stoxx 50', type: 'index', digits: 2, group: 'Indices' },
  { symbol: 'N225', name: 'Nikkei 225 (Japan)', type: 'index', digits: 2, group: 'Indices' },
  { symbol: 'HSI', name: 'Hang Seng Index (HK)', type: 'index', digits: 2, group: 'Indices' },
  { symbol: 'AXJO', name: 'S&P/ASX 200 (Australia)', type: 'index', digits: 2, group: 'Indices' },
  // ── Crypto ──
  { symbol: 'BTCUSDT', name: 'Bitcoin', type: 'crypto', digits: 2, group: 'Crypto' },
  { symbol: 'ETHUSDT', name: 'Ethereum', type: 'crypto', digits: 2, group: 'Crypto' },
  { symbol: 'SOLUSDT', name: 'Solana', type: 'crypto', digits: 2, group: 'Crypto' },
  { symbol: 'XRPUSDT', name: 'Ripple', type: 'crypto', digits: 4, group: 'Crypto' },
  { symbol: 'BNBUSDT', name: 'BNB', type: 'crypto', digits: 2, group: 'Crypto' },
  { symbol: 'ADAUSDT', name: 'Cardano', type: 'crypto', digits: 4, group: 'Crypto' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', type: 'crypto', digits: 5, group: 'Crypto' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', type: 'crypto', digits: 2, group: 'Crypto' },
  { symbol: 'DOTUSDT', name: 'Polkadot', type: 'crypto', digits: 3, group: 'Crypto' },
  { symbol: 'LINKUSDT', name: 'Chainlink', type: 'crypto', digits: 3, group: 'Crypto' },
  { symbol: 'MATICUSDT', name: 'Polygon', type: 'crypto', digits: 4, group: 'Crypto' },
  { symbol: 'UNIUSDT', name: 'Uniswap', type: 'crypto', digits: 3, group: 'Crypto' },
  { symbol: 'LTCUSDT', name: 'Litecoin', type: 'crypto', digits: 2, group: 'Crypto' },
  { symbol: 'ARBUSDT', name: 'Arbitrum', type: 'crypto', digits: 3, group: 'Crypto' },
  { symbol: 'OPUSDT', name: 'Optimism', type: 'crypto', digits: 3, group: 'Crypto' },
  { symbol: 'APTUSDT', name: 'Aptos', type: 'crypto', digits: 3, group: 'Crypto' },
  { symbol: 'SUIUSDT', name: 'Sui', type: 'crypto', digits: 3, group: 'Crypto' },
]

export function getMarketInfo(symbol: string): MarketSymbol | undefined {
  return ALL_SYMBOLS.find(s => s.symbol === symbol)
}

export function getMultiplier(symbol: string): number {
  const forex = 100000
  const metals: Record<string, number> = { XAUUSD: 100, XAGUSD: 5000, XPTUSD: 50, XPDUSD: 50, XCUUSD: 25000 }
  const oil: Record<string, number> = { USOIL: 1000, UKOIL: 1000, NGAS: 10000 }
  const indices: Record<string, number> = { SPX: 50, NDX: 20, DJI: 5, RUT: 10, VIX: 1000, DAX: 25, FTSE: 10, CAC: 10, SX5E: 10, N225: 500, HSI: 50, AXJO: 25 }
  const crypto = 1
  if (metals[symbol]) return metals[symbol]
  if (oil[symbol]) return oil[symbol]
  if (indices[symbol]) return indices[symbol]
  const info = ALL_SYMBOLS.find(s => s.symbol === symbol)
  if (!info) return forex
  if (info.type === 'crypto') return crypto
  if (info.type === 'commodity') { if (metals[symbol] || oil[symbol]) return metals[symbol] || oil[symbol] }
  return forex
}

function getLookbackDays(resolution: string): number {
  if (resolution === '1s' || resolution === '5s') return 0.02
  if (resolution === '15s') return 0.05
  if (resolution === '30s') return 0.1
  const n = parseInt(resolution)
  if (isNaN(n)) {
    if (resolution === 'D') return 90
    if (resolution === 'W') return 365
    if (resolution === 'M') return 730
    return 1
  }
  if (n <= 5) return 0.03
  if (n <= 15) return 0.07
  if (n <= 30) return 0.3
  if (n <= 60) return 1
  if (n <= 300) return 7
  if (n <= 900) return 14
  if (n <= 1800) return 30
  if (n <= 3600) return 60
  if (n <= 14400) return 180
  if (n <= 43200) return 365
  return 730
}

// ── Public API ──────────────────────────────────────────────

export async function fetchKlines(symbol: string, resolution: string, _from: number, _to: number) {
  const wsData = await dataClient.fetchKlines(symbol, resolution)
  if (wsData && wsData.klines && wsData.klines.length > 0) return wsData.klines

  // Final fallback: generate mock for development
  const to = Math.floor(Date.now() / 1000)
  const days = getLookbackDays(resolution)
  return generateMockKlines(symbol, resolution, to - days * 86400, to)
}

export function subscribeTicker(symbol: string, callback: (price: number, change: number) => void): () => void {
  return dataClient.subscribeTicker(symbol, callback)
}
