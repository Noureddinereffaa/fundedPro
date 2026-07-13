import { describe, it, expect } from 'vitest'
import { formatPrice, getContractSize, calcPnl } from '../utils/trading.ts'

describe('formatPrice', () => {
  it('formats BTC pairs to 2 decimal places', () => {
    expect(formatPrice(67500.1234, 'BTCUSDT')).toBe('67500.12')
  })
  it('formats ETH pairs to 2 decimal places', () => {
    expect(formatPrice(1.23456, 'ETHUSDT')).toBe('1.23')
  })
  it('formats DOGE/XRP/ADA to 5 decimal places', () => {
    expect(formatPrice(0.12345, 'XRPUSDT')).toBe('0.12345')
    expect(formatPrice(0.45678, 'ADAUSDT')).toBe('0.45678')
  })
  it('formats SOL/DOT/LINK to 3 decimal places', () => {
    expect(formatPrice(123.45678, 'SOLUSDT')).toBe('123.457')
    expect(formatPrice(12.34567, 'DOTUSDT')).toBe('12.346')
  })
})

describe('getContractSize', () => {
  it('returns 1 for all crypto symbols', () => {
    expect(getContractSize('BTCUSDT')).toBe(1)
    expect(getContractSize('ETHUSDT')).toBe(1)
    expect(getContractSize('SOLUSDT')).toBe(1)
    expect(getContractSize('XRPUSDT')).toBe(1)
    expect(getContractSize('DOGEUSDT')).toBe(1)
  })
})

describe('calcPnl', () => {
  it('calculates profit for buy trade', () => {
    const pnl = calcPnl('buy', 67000, 68000, 0.5, 'BTCUSDT')
    expect(pnl).toBeCloseTo(500, 0)
  })
  it('calculates loss for buy trade', () => {
    const pnl = calcPnl('buy', 67000, 66000, 0.5, 'BTCUSDT')
    expect(pnl).toBeCloseTo(-500, 0)
  })
  it('calculates profit for sell trade', () => {
    const pnl = calcPnl('sell', 67000, 66000, 0.5, 'BTCUSDT')
    expect(pnl).toBeCloseTo(500, 0)
  })
  it('calculates loss for sell trade', () => {
    const pnl = calcPnl('sell', 67000, 68000, 0.5, 'BTCUSDT')
    expect(pnl).toBeCloseTo(-500, 0)
  })
  it('calculates PnL for ETH pairs (contract size 1)', () => {
    const pnl = calcPnl('buy', 3000, 3100, 2, 'ETHUSDT')
    expect(pnl).toBeCloseTo(200, 0)
  })
  it('returns 0 when price is unchanged', () => {
    const pnl = calcPnl('buy', 67000, 67000, 0.5, 'BTCUSDT')
    expect(pnl).toBeCloseTo(0, 0)
  })
  it('handles USDT quote pairs (direct pnl)', () => {
    const pnl = calcPnl('buy', 150.0, 151.0, 1, 'SOLUSDT')
    expect(pnl).toBeCloseTo(1, 0)
  })
})
