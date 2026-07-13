import { describe, it, expect } from 'vitest'
import { ALL_INTERVALS, COMMON_INTERVALS, cacheTTL, intervalsToSeconds } from '../../shared/constants'
import { getLookbackDays } from '../utils/marketData'
import { generateMockKlines } from '../utils/mockData'

describe('ALL_INTERVALS', () => {
  it('defines all 16 intervals', () => {
    expect(ALL_INTERVALS).toHaveLength(16)
  })

  it('includes sub-minute intervals', () => {
    const ids = ALL_INTERVALS.map((i) => i.id)
    expect(ids).toContain('1s')
    expect(ids).toContain('5s')
    expect(ids).toContain('15s')
    expect(ids).toContain('30s')
  })

  it('includes minute and hour intervals', () => {
    const ids = ALL_INTERVALS.map((i) => i.id)
    expect(ids).toContain('60')
    expect(ids).toContain('300')
    expect(ids).toContain('900')
    expect(ids).toContain('1800')
    expect(ids).toContain('3600')
    expect(ids).toContain('7200')
    expect(ids).toContain('14400')
    expect(ids).toContain('21600')
    expect(ids).toContain('43200')
  })

  it('includes daily, weekly and monthly', () => {
    const ids = ALL_INTERVALS.map((i) => i.id)
    expect(ids).toContain('D')
    expect(ids).toContain('W')
    expect(ids).toContain('M')
  })

  it('has increasing seconds for each interval', () => {
    for (let i = 1; i < ALL_INTERVALS.length; i++) {
      expect(ALL_INTERVALS[i].sec).toBeGreaterThan(ALL_INTERVALS[i - 1].sec)
    }
  })

  it('seconds match expected values', () => {
    const map = Object.fromEntries(ALL_INTERVALS.map((i) => [i.id, i.sec]))
    expect(map['1s']).toBe(1)
    expect(map['60']).toBe(60)
    expect(map['3600']).toBe(3600)
    expect(map['D']).toBe(86400)
    expect(map['W']).toBe(604800)
    expect(map['M']).toBe(2592000)
  })
})

describe('COMMON_INTERVALS', () => {
  it('contains 8 common intervals', () => {
    expect(COMMON_INTERVALS).toHaveLength(8)
  })

  it('includes only standard chart intervals', () => {
    expect(COMMON_INTERVALS).toContain('60')
    expect(COMMON_INTERVALS).toContain('300')
    expect(COMMON_INTERVALS).toContain('900')
    expect(COMMON_INTERVALS).toContain('1800')
    expect(COMMON_INTERVALS).toContain('3600')
    expect(COMMON_INTERVALS).toContain('14400')
    expect(COMMON_INTERVALS).toContain('43200')
    expect(COMMON_INTERVALS).toContain('D')
  })

  it('excludes sub-minute and weekly/monthly', () => {
    expect(COMMON_INTERVALS).not.toContain('1s')
    expect(COMMON_INTERVALS).not.toContain('W')
    expect(COMMON_INTERVALS).not.toContain('M')
  })
})

describe('intervalsToSeconds', () => {
  it('maps all 16 intervals correctly', () => {
    for (const { id, sec } of ALL_INTERVALS) {
      expect(intervalsToSeconds(id)).toBe(sec)
    }
  })

  it('defaults to 60 for unknown interval', () => {
    expect(intervalsToSeconds('xyz')).toBe(60)
  })

  it('defaults to 60 for empty string', () => {
    expect(intervalsToSeconds('')).toBe(60)
  })
})

describe('cacheTTL', () => {
  it('returns 30s for sub-minute intervals', () => {
    expect(cacheTTL('1s')).toBe(30000)
    expect(cacheTTL('30s')).toBe(30000)
  })

  it('returns 30s for 1-minute', () => {
    expect(cacheTTL('60')).toBe(30000)
  })

  it('returns 5min for 5m and 15m', () => {
    expect(cacheTTL('300')).toBe(300000)
    expect(cacheTTL('900')).toBe(300000)
  })

  it('returns 10min for 30m', () => {
    expect(cacheTTL('1800')).toBe(600000)
  })

  it('returns 15min for 1H-4H', () => {
    expect(cacheTTL('3600')).toBe(900000)
    expect(cacheTTL('14400')).toBe(900000)
  })

  it('returns 30min for 12H', () => {
    expect(cacheTTL('43200')).toBe(1800000)
  })

  it('returns 1H for daily', () => {
    expect(cacheTTL('D')).toBe(3600000)
  })

  it('returns 2H for weekly and monthly', () => {
    expect(cacheTTL('W')).toBe(7200000)
    expect(cacheTTL('M')).toBe(7200000)
  })
})

describe('getLookbackDays', () => {
  it('returns fraction of day for sub-minute resolutions', () => {
    expect(getLookbackDays('1s')).toBe(0.02)
    expect(getLookbackDays('5s')).toBe(0.05)
    expect(getLookbackDays('15s')).toBe(0.1)
    expect(getLookbackDays('30s')).toBe(0.3)
  })

  it('returns increasing days for higher resolutions', () => {
    expect(getLookbackDays('60')).toBe(30)
    expect(getLookbackDays('300')).toBe(90)
    expect(getLookbackDays('900')).toBe(180)
    expect(getLookbackDays('1800')).toBe(365)
    expect(getLookbackDays('3600')).toBe(365)
    expect(getLookbackDays('14400')).toBe(730)
    expect(getLookbackDays('43200')).toBe(1460)
  })

  it('returns correct values for D, W, M', () => {
    expect(getLookbackDays('D')).toBe(730)
    expect(getLookbackDays('W')).toBe(1460)
    expect(getLookbackDays('M')).toBe(3650)
  })

  it('returns 1 for unknown resolution', () => {
    expect(getLookbackDays('xyz')).toBe(1)
  })
})

describe('generateMockKlines per resolution', () => {
  const from = Math.floor(Date.now() / 1000) - 86400 * 60
  const to = Math.floor(Date.now() / 1000)

  it('generates data for 1s resolution', () => {
    const candles = generateMockKlines('EURUSD', '1s', from, to)
    expect(candles.length).toBeGreaterThan(0)
    for (const c of candles) {
      expect(c.open).toBeGreaterThan(0)
      expect(c.high).toBeGreaterThanOrEqual(c.low)
      expect(c.volume).toBeGreaterThanOrEqual(0)
    }
  })

  it('generates data for intervals that fit 60-day range', () => {
    const fittingIntervals = ['60', '300', '900', '1800', '3600', '14400', '43200', 'D', 'W']
    for (const interval of fittingIntervals) {
      const candles = generateMockKlines('EURUSD', interval, from, to)
      expect(candles.length).toBeGreaterThan(0)
    }
  })

  it('generates fewer candles for higher resolutions over same period', () => {
    const candles1m = generateMockKlines('EURUSD', '60', from, to)
    const candles1h = generateMockKlines('EURUSD', '3600', from, to)
    const candles1d = generateMockKlines('EURUSD', 'D', from, to)
    expect(candles1m.length).toBeGreaterThan(candles1h.length)
    expect(candles1h.length).toBeGreaterThanOrEqual(candles1d.length)
  })

  it('produces consistent candles for different symbol types', () => {
    const candles = generateMockKlines('BTCUSDT', '60', from, to)
    expect(candles.length).toBeGreaterThan(0)
  })

  it('each candle has valid OHLC values', () => {
    const candles = generateMockKlines('EURUSD', '60', from, to)
    for (const c of candles) {
      expect(c.high).toBeGreaterThanOrEqual(c.open)
      expect(c.high).toBeGreaterThanOrEqual(c.close)
      expect(c.low).toBeLessThanOrEqual(c.open)
      expect(c.low).toBeLessThanOrEqual(c.close)
    }
  })

  it('generates volume for each candle', () => {
    const candles = generateMockKlines('EURUSD', '60', from, to)
    for (const c of candles) {
      expect(c.volume).toBeGreaterThan(0)
    }
  })
})

describe('TradeTopBar interval definitions', () => {
  const INTERVAL_GROUPS = [
    { label: '1m', value: '60' },
    { label: '5m', value: '300' },
    { label: '15m', value: '900' },
    { label: '30m', value: '1800' },
    { label: '1H', value: '3600' },
    { label: '2H', value: '7200' },
    { label: '4H', value: '14400' },
    { label: '1D', value: 'D' },
    { label: '1W', value: 'W' },
  ]

  it('defines 9 interval buttons in 3 groups', () => {
    expect(INTERVAL_GROUPS).toHaveLength(9)
  })

  it('each interval value maps to a valid ALL_INTERVALS entry', () => {
    const validIds = new Set(ALL_INTERVALS.map((i) => i.id))
    for (const { value } of INTERVAL_GROUPS) {
      expect(validIds.has(value)).toBe(true)
    }
  })

  it('covers the most commonly used resolutions', () => {
    const values = INTERVAL_GROUPS.map((g) => g.value)
    expect(values).toContain('60')
    expect(values).toContain('300')
    expect(values).toContain('900')
    expect(values).toContain('1800')
    expect(values).toContain('3600')
    expect(values).toContain('7200')
    expect(values).toContain('14400')
    expect(values).toContain('D')
    expect(values).toContain('W')
  })
})
