import { describe, expect, it } from 'vitest'
import { getMaxCandlesForInterval, mergeLiveCandle, trimCandles } from '../utils/cryptoChart'

describe('cryptoChart live candle merging', () => {
  it('updates the latest candle when the timestamp matches', () => {
    const candles = [
      { time: 100, open: 100, high: 101, low: 99, close: 100, volume: 10 },
    ]

    const result = mergeLiveCandle(candles, { time: 100, open: 100, high: 102, low: 98, close: 101, volume: 12 })

    expect(result[0]).toMatchObject({ time: 100, open: 100, high: 102, low: 98, close: 101, volume: 12 })
  })

  it('adds a new candle when the incoming timestamp is newer', () => {
    const candles = [
      { time: 100, open: 100, high: 101, low: 99, close: 100, volume: 10 },
    ]

    const result = mergeLiveCandle(candles, { time: 101, open: 101, high: 103, low: 101, close: 103, volume: 15 })

    expect(result).toHaveLength(2)
    expect(result[1]).toMatchObject({ time: 101, open: 101, close: 103, volume: 15 })
  })

  it('trims old candles to keep the chart responsive', () => {
    const candles = Array.from({ length: 6 }, (_, i) => ({
      time: 100 + i,
      open: 100 + i,
      high: 101 + i,
      low: 99 + i,
      close: 100 + i,
      volume: 1,
    }))

    const trimmed = trimCandles(candles, 4)
    expect(trimmed).toHaveLength(4)
    expect(trimmed[0].time).toBe(102)
  })

  it('uses a smaller chart window for fast intervals', () => {
    expect(getMaxCandlesForInterval('1s')).toBeLessThan(getMaxCandlesForInterval('1h'))
    expect(getMaxCandlesForInterval('1s')).toBeLessThanOrEqual(300)
  })
})
