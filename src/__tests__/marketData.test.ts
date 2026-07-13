import { describe, expect, it } from 'vitest'
import { ALL_SYMBOLS, getMarketInfo } from '../utils/marketData'

describe('marketData crypto-only mode', () => {
  it('exposes only crypto market symbols', () => {
    expect(ALL_SYMBOLS.length).toBeGreaterThan(0)
    expect(ALL_SYMBOLS.every((symbol) => symbol.type === 'crypto')).toBe(true)
  })

  it('does not expose non-crypto symbols like RWA assets', () => {
    expect(ALL_SYMBOLS.some((symbol) => symbol.symbol === 'ONDOUSDT')).toBe(false)
    expect(getMarketInfo('BTCUSDT')?.type).toBe('crypto')
    expect(getMarketInfo('ONDOUSDT')).toBeUndefined()
  })
})
