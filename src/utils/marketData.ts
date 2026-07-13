import type { MarketType, MarketSymbol } from '../../shared/types'
import { dataClient } from './wsClient'
import { generateMockKlines } from './mockData'
import symbols from '../../shared/symbols.json'

const CRYPTO_ONLY_SYMBOLS = Object.entries(symbols)
  .filter(([, info]) => info.type === 'crypto')
  .map(([sym, info]) => ({
    symbol: sym,
    name: info.name,
    type: info.type as MarketType,
    digits: info.digits,
    group: 'Crypto',
  }))

export const ALL_SYMBOLS: MarketSymbol[] = CRYPTO_ONLY_SYMBOLS
export const SYMBOL_MAP: Map<string, MarketSymbol> = new Map(ALL_SYMBOLS.map((s) => [s.symbol, s]))

export function getMarketInfo(symbol: string): MarketSymbol | undefined {
  return SYMBOL_MAP.get(symbol)
}

const CRYPTO_MULTIPLIER = 1

export function getMultiplier(symbol: string): number {
  return CRYPTO_MULTIPLIER
}

export function getLookbackDays(resolution: string): number {
  if (resolution === '1s') return 0.02
  if (resolution === '5s') return 0.05
  if (resolution === '15s') return 0.1
  if (resolution === '30s') return 0.3
  const n = parseInt(resolution)
  if (isNaN(n)) {
    if (resolution === 'D') return 730
    if (resolution === 'W') return 1460
    if (resolution === 'M') return 3650
    return 1
  }
  if (n <= 5) return 0.03
  if (n <= 15) return 0.07
  if (n <= 30) return 0.3
  if (n <= 60) return 30
  if (n <= 300) return 90
  if (n <= 900) return 180
  if (n <= 1800) return 365
  if (n <= 3600) return 365
  if (n <= 14400) return 730
  if (n <= 43200) return 1460
  return 3650
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

export function subscribeTicker(
  symbol: string,
  callback: (price: number, change: number) => void,
): () => void {
  return dataClient.subscribeTicker(symbol, callback)
}
