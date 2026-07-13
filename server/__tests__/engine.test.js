// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('ws', () => ({
  WebSocketServer: vi.fn(function () {
    this.on = vi.fn()
    this.close = vi.fn()
    this.clients = new Set()
  }),
  WebSocket: { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 },
}))

vi.mock('http', () => ({
  createServer: vi.fn(() => ({
    listen: vi.fn(),
    on: vi.fn(),
    address: vi.fn(() => ({ port: 3002 })),
  })),
}))

vi.mock('fs', () => {
  const mockFs = {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(),
    promises: { writeFile: vi.fn(() => Promise.resolve()) },
    writeFileSync: vi.fn(),
  }
  return { ...mockFs, default: mockFs }
})

vi.mock('../marketHours.js', () => ({
  isMarketOpen: vi.fn(() => true),
  marketStatus: vi.fn(() => ({ open: true, text: 'Open', nextOpen: null, nextClose: null })),
}))

vi.mock('../redis.js', () => ({
  default: {
    addActiveSymbol: vi.fn(),
    removeActiveSymbol: vi.fn(),
    getActiveSymbols: vi.fn(() => Promise.resolve([])),
    saveCandleState: vi.fn(),
    getCandleState: vi.fn(),
    connect: vi.fn(() => Promise.resolve(false)),
    isEnabled: vi.fn(() => false),
    publish: vi.fn(),
    onMessage: vi.fn(),
    setState: vi.fn(),
    getState: vi.fn(),
    delState: vi.fn(),
    heartbeat: vi.fn(),
    getInstances: vi.fn(() => Promise.resolve([])),
    ping: vi.fn(() => Promise.resolve(false)),
    getStatus: vi.fn(() => ({ mode: 'memory' })),
    disconnect: vi.fn(),
  },
}))

vi.mock('../../shared/symbols.json', () => ({
  default: {
    EURUSD: { name: 'Euro / US Dollar', type: 'forex', digits: 5, group: 'Majors', yahoo: 'EURUSD=X', td: 'EUR/USD' },
    BTCUSD: { name: 'Bitcoin / US Dollar', type: 'crypto', digits: 2, group: 'Crypto', yahoo: 'BTC-USD', td: 'BTC/USD', binance: 'btcusdt' },
    SPX: { name: 'S&P 500', type: 'index', digits: 2, group: 'Indices', yahoo: '^GSPC', td: 'SPX' },
    XAUUSD: { name: 'Gold / US Dollar', type: 'commodity', digits: 2, group: 'Commodities', yahoo: 'GC=F', td: 'XAU/USD' },
  },
}))

// Prevent module-level setInterval from running
vi.useFakeTimers()

// ── SUT ──────────────────────────────────────────────────────────

import {
  toSecTimestamp,
  processTick,
  getRecentCandles,
  interpolateCandles,
  aggregateCandles,
  enhanceCandles,
  seedTickBuffer,
  addActiveInterval,
  removeActiveInterval,
  saveState,
  saveStateSync,
  tickBuffers,
  candleStates,
  subscribers,
  activeIntervals,
  priceCache,
  symbolTimers,
  SYMBOL_MAP,
  SYMBOL_TYPE,
  PORT,
  HEARTBEAT_MS,
  HEARTBEAT_TIMEOUT_MS,
  MAX_FAILS,
  ALL_INTERVALS,
} from '../lib/engine.js'

import { startPolling, stopPolling } from '../lib/polling.js'

// ── Helpers ──────────────────────────────────────────────────────

function clearState() {
  tickBuffers.clear()
  candleStates.clear()
  subscribers.clear()
  activeIntervals.clear()
  priceCache.clear()
}

// ── Tests ────────────────────────────────────────────────────────

describe('engine', () => {
  beforeEach(() => {
    clearState()
  })

  describe('polling lifecycle', () => {
    it('registers polling only once per symbol and clears it on stop', () => {
      subscribers.set('EURUSD', new Set([{}]))

      const first = startPolling('EURUSD')
      const second = startPolling('EURUSD')

      expect(first).toBe(second)
      expect(symbolTimers.has('EURUSD')).toBe(true)
      expect(symbolTimers.size).toBe(1)

      stopPolling('EURUSD')

      expect(symbolTimers.has('EURUSD')).toBe(false)
      expect(symbolTimers.size).toBe(0)
    })
  })

  describe('constants', () => {
    it('exports expected constants', () => {
      expect(PORT).toBe(3002)
      expect(HEARTBEAT_MS).toBe(15000)
      expect(HEARTBEAT_TIMEOUT_MS).toBe(30000)
      expect(MAX_FAILS).toBe(5)
    })

    it('builds SYMBOL_MAP from symbols.json', () => {
      expect(SYMBOL_MAP.EURUSD).toBeDefined()
      expect(SYMBOL_MAP.EURUSD.digits).toBe(5)
      expect(SYMBOL_MAP.BTCUSD.binance).toBe('btcusdt')
    })

    it('builds SYMBOL_TYPE from symbols.json (all crypto)', () => {
      expect(SYMBOL_TYPE.EURUSD).toBe('crypto')
      expect(SYMBOL_TYPE.BTCUSD).toBe('crypto')
      expect(SYMBOL_TYPE.SPX).toBe('crypto')
      expect(SYMBOL_TYPE.XAUUSD).toBe('crypto')
    })
  })

  describe('toSecTimestamp', () => {
    it('returns seconds as-is', () => {
      expect(toSecTimestamp(1000000)).toBe(1000000)
    })

    it('converts milliseconds to seconds', () => {
      const ms = Date.now()
      expect(toSecTimestamp(ms)).toBe(Math.floor(ms / 1000))
    })

    it('handles string numbers', () => {
      expect(toSecTimestamp('1000000')).toBe(1000000)
    })

    it('falls back to current time for 0', () => {
      const now = Math.floor(Date.now() / 1000)
      const result = toSecTimestamp(0)
      expect(result).toBeGreaterThanOrEqual(now - 1)
      expect(result).toBeLessThanOrEqual(now + 1)
    })

    it('falls back for NaN', () => {
      const now = Math.floor(Date.now() / 1000)
      const result = toSecTimestamp(NaN)
      expect(result).toBeGreaterThanOrEqual(now - 1)
      expect(result).toBeLessThanOrEqual(now + 1)
    })
  })

  describe('processTick', () => {
    const mockWs = { readyState: 1, send: vi.fn() }

    it('creates a new candle on first tick', () => {
      subscribers.set('EURUSD', new Set([mockWs]))
      processTick('EURUSD', 1.1050, 1000000)
      const sc = candleStates.get('EURUSD')
      expect(sc).toBeDefined()
      const candle = sc.get('60')
      expect(candle).toBeDefined()
      expect(candle.open).toBe(1.1050)
      expect(candle.high).toBe(1.1050)
      expect(candle.low).toBe(1.1050)
      expect(candle.close).toBe(1.1050)
    })

    it('updates existing candle on subsequent same-interval ticks', () => {
      subscribers.set('EURUSD', new Set([mockWs]))
      processTick('EURUSD', 1.1050, 1000000)
      processTick('EURUSD', 1.1060, 1000005)
      const candle = candleStates.get('EURUSD').get('60')
      expect(candle.open).toBe(1.1050)
      expect(candle.high).toBe(1.1060)
      expect(candle.low).toBe(1.1050)
      expect(candle.close).toBe(1.1060)
    })

    it('creates new candle at interval boundary', () => {
      subscribers.set('EURUSD', new Set([mockWs]))
      processTick('EURUSD', 1.1050, 60)
      processTick('EURUSD', 1.1070, 120)
      const sc = candleStates.get('EURUSD')
      const c1 = sc.get('60')
      // Interval key is overwritten with new candle at boundary
      expect(c1.open).toBe(1.1070)
      expect(c1.time).toBe(120)
    })

    it('generates market-appropriate tick volume', () => {
      subscribers.set('EURUSD', new Set([mockWs]))
      processTick('EURUSD', 1.1050, 1000000)
      const candle = candleStates.get('EURUSD').get('60')
      expect(candle.volume).toBeGreaterThan(0)
    })

    it('broadcasts candle when subscribers exist', () => {
      subscribers.set('EURUSD', new Set([mockWs]))
      activeIntervals.set('EURUSD', new Set(['60']))
      processTick('EURUSD', 1.1050, 60)
      processTick('EURUSD', 1.1060, 120)

      const sc = candleStates.get('EURUSD')
      const c1 = sc.get('60')
      expect(c1).toBeDefined()
      const c2 = [...sc.values()].find((c) => c.time === 120)
      expect(c2).toBeDefined()
    })

    it('processes all intervals when no active intervals set', () => {
      subscribers.set('EURUSD', new Set([mockWs]))
      processTick('EURUSD', 1.1050, 1000000)
      const sc = candleStates.get('EURUSD')
      expect(sc.has('60')).toBe(true)
      expect(sc.has('300')).toBe(true)
      expect(sc.has('D')).toBe(true)
    })

    it('skips duplicate tick (same price, close time)', () => {
      processTick('EURUSD', 1.1050, 1000000)
      processTick('EURUSD', 1.1050, 1000000)
      const ticks = tickBuffers.get('EURUSD')
      expect(ticks.length).toBe(1)
    })
  })

  describe('getRecentCandles', () => {
    it('returns empty array when no ticks', () => {
      const candles = getRecentCandles('EURUSD', '60')
      expect(candles).toEqual([])
    })

    it('builds candles from tick buffer', () => {
      processTick('EURUSD', 1.1050, 60)
      processTick('EURUSD', 1.1060, 61)
      processTick('EURUSD', 1.1040, 62)
      const candles = getRecentCandles('EURUSD', '60')
      expect(candles.length).toBeGreaterThanOrEqual(1)
      expect(candles[0].open).toBe(1.1050)
      expect(candles[0].close).toBe(1.1040)
      expect(candles[0].high).toBe(1.1060)
      expect(candles[0].low).toBe(1.1040)
    })

    it('returns candles in time order', () => {
      processTick('EURUSD', 1.1050, 60)
      processTick('EURUSD', 1.1060, 120)
      const candles = getRecentCandles('EURUSD', '60')
      for (let i = 1; i < candles.length; i++) {
        expect(candles[i].time).toBeGreaterThanOrEqual(candles[i - 1].time)
      }
    })
  })

  describe('interpolateCandles', () => {
    it('returns source when ratio < 2', () => {
      const src = [{ time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105, volume: 100 }]
      const result = interpolateCandles(src, 60, 60)
      expect(result).toEqual(src)
    })

    it('interpolates 1m into 5s candles', () => {
      const src = [{ time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105, volume: 120 }]
      const result = interpolateCandles(src, 60, 5)
      expect(result.length).toBe(12)
      expect(result[0].time).toBe(60)
      expect(result[11].time).toBe(115)
      expect(result[0].open).toBe(1.10)
      expect(result[11].close).toBe(1.105)
      // Volume should be split
      expect(result[0].volume).toBe(10)
    })

    it('handles multiple source candles', () => {
      const src = [
        { time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105, volume: 100 },
        { time: 120, open: 1.105, high: 1.115, low: 1.10, close: 1.112, volume: 100 },
      ]
      const result = interpolateCandles(src, 60, 5)
      expect(result.length).toBe(24)
    })
  })

  describe('aggregateCandles', () => {
    it('returns empty for empty input', () => {
      expect(aggregateCandles([], 60, 300)).toEqual([])
    })

    it('returns source when toSec <= fromSec', () => {
      const src = [{ time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105, volume: 100 }]
      expect(aggregateCandles(src, 300, 60)).toEqual(src)
    })

    it('aggregates 1m into 5m candles', () => {
      const src = []
      for (let i = 0; i < 5; i++) {
        src.push({ time: (i + 1) * 60, open: 1.10 + i * 0.001, high: 1.11 + i * 0.001, low: 1.09 + i * 0.001, close: 1.105 + i * 0.001, volume: 100 })
      }
      const result = aggregateCandles(src, 60, 300)
      expect(result.length).toBe(1)
      expect(result[0].time).toBe(0)
      expect(result[0].open).toBe(1.10)
      expect(result[0].close).toBe(1.109)
      expect(result[0].volume).toBe(500)
    })

    it('handles partial groups at the end', () => {
      const src = [
        { time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105, volume: 100 },
        { time: 360, open: 1.12, high: 1.13, low: 1.11, close: 1.125, volume: 100 },
      ]
      const result = aggregateCandles(src, 60, 300)
      expect(result.length).toBe(1)
    })
  })

  describe('enhanceCandles', () => {
    it('passes well-formed candles through', () => {
      const src = [{ time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105, volume: 100 }]
      const result = enhanceCandles(src)
      expect(result[0].time).toBe(60)
      expect(result[0].open).toBe(1.10)
    })

    it('fixes missing open/high/low', () => {
      const src = [{ time: 60, close: 1.105, volume: 100 }]
      const result = enhanceCandles(src)
      expect(result[0].open).toBe(1.105)
      expect(result[0].high).toBe(1.105)
      expect(result[0].low).toBe(1.105)
    })

    it('adds volume when missing', () => {
      const src = [{ time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105 }]
      const result = enhanceCandles(src)
      expect(result[0].volume).toBeGreaterThan(0)
    })

    it('filters out NaN candles', () => {
      const src = [
        { time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105, volume: 100 },
        { time: 120, open: 1.11, high: 1.12, low: 1.10, close: NaN, volume: 100 },
      ]
      const result = enhanceCandles(src)
      expect(result.length).toBe(1)
    })

    it('truncates to 8 decimal places', () => {
      const src = [{ time: 60, open: 1.123456789, high: 1.123456789, low: 1.123456789, close: 1.123456789, volume: 100 }]
      const result = enhanceCandles(src)
      expect(result[0].open.toString().length).toBeLessThanOrEqual(10) // 1.12345678 = 10 chars
    })

    it('converts ms timestamps to seconds', () => {
      const src = [{ time: 1700000000000, open: 1.10, high: 1.11, low: 1.09, close: 1.105, volume: 100 }]
      const result = enhanceCandles(src)
      expect(result[0].time).toBe(1700000000) // 1700000000000 / 1000
    })
  })

  describe('seedTickBuffer', () => {
    it('populates buffer from candle OHLC data', () => {
      const candles = [
        { time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105 },
        { time: 120, open: 1.105, high: 1.115, low: 1.10, close: 1.112 },
      ]
      seedTickBuffer('EURUSD', candles, 60)
      const ticks = tickBuffers.get('EURUSD')
      expect(ticks.length).toBe(8) // 4 per candle
      expect(ticks[0].price).toBe(1.10)
      expect(ticks[0].time).toBe(60)
      expect(ticks[1].price).toBe(1.11)
      expect(ticks[1].time).toBe(61)
    })

    it('does not add if buffer already has data', () => {
      tickBuffers.set('EURUSD', [{ price: 1.10, time: 60 }])
      const candles = [{ time: 120, open: 1.11, high: 1.12, low: 1.10, close: 1.115 }]
      seedTickBuffer('EURUSD', candles, 60)
      expect(tickBuffers.get('EURUSD').length).toBe(1)
    })
  })

  describe('addActiveInterval / removeActiveInterval', () => {
    it('adds interval to tracking', () => {
      addActiveInterval('EURUSD', '60')
      expect(activeIntervals.has('EURUSD')).toBe(true)
      expect(activeIntervals.get('EURUSD').has('60')).toBe(true)
    })

    it('adds multiple intervals for same symbol', () => {
      addActiveInterval('EURUSD', '60')
      addActiveInterval('EURUSD', '300')
      expect(activeIntervals.get('EURUSD').size).toBe(2)
    })

    it('removes interval from tracking', () => {
      addActiveInterval('EURUSD', '60')
      addActiveInterval('EURUSD', '300')
      removeActiveInterval('EURUSD', '60')
      expect(activeIntervals.get('EURUSD').has('60')).toBe(false)
      expect(activeIntervals.get('EURUSD').has('300')).toBe(true)
    })

    it('removes symbol when last interval removed', () => {
      addActiveInterval('EURUSD', '60')
      removeActiveInterval('EURUSD', '60')
      expect(activeIntervals.has('EURUSD')).toBe(false)
    })

    it('handles removing from non-existent symbol', () => {
      removeActiveInterval('NONEXISTENT', '60')
      // no error
    })
  })

  describe('saveState / saveStateSync', () => {
    it('saveState does not throw', () => {
      processTick('EURUSD', 1.1050, 1000000)
      expect(() => saveState()).not.toThrow()
    })

    it('saveStateSync does not throw', () => {
      processTick('EURUSD', 1.1050, 1000000)
      expect(() => saveStateSync()).not.toThrow()
    })

    it('saveState handles empty tick buffers', () => {
      expect(() => saveState()).not.toThrow()
    })

    it('saveStateSync handles empty tick buffers', () => {
      expect(() => saveStateSync()).not.toThrow()
    })
  })

  describe('processTick — comprehensive edge cases', () => {
    const mockWs = { readyState: 1, send: vi.fn() }

    beforeEach(() => {
      mockWs.send.mockClear()
    })

    it('early returns when no subscribers and no candle state', () => {
      const initialSize = tickBuffers.size
      processTick('EURUSD', 1.1050, 1000000)
      expect(tickBuffers.size).toBeGreaterThan(initialSize)
    })

    it('does not create candle state when no subscribers', () => {
      processTick('BTCUSD', 50000, 1000000)
      expect(candleStates.has('BTCUSD')).toBe(false)
    })

    it('processes all 16 intervals for subscribed symbol', () => {
      subscribers.set('EURUSD', new Set([mockWs]))
      processTick('EURUSD', 1.1050, 1000000)
      const sc = candleStates.get('EURUSD')
      for (const interval of ALL_INTERVALS) {
        expect(sc.has(interval.id)).toBe(true)
      }
    })

    it('accumulates volume across multiple ticks', () => {
      subscribers.set('EURUSD', new Set([mockWs]))
      processTick('EURUSD', 1.1050, 1000000)
      processTick('EURUSD', 1.1060, 1000001)
      processTick('EURUSD', 1.1070, 1000002)
      const candle = candleStates.get('EURUSD').get('60')
      expect(candle.volume).toBeGreaterThan(0)
    })

    it('handles multiple symbols independently', () => {
      subscribers.set('EURUSD', new Set([mockWs]))
      subscribers.set('BTCUSD', new Set([mockWs]))
      processTick('EURUSD', 1.1050, 1000000)
      processTick('BTCUSD', 50000, 1000000)
      expect(candleStates.has('EURUSD')).toBe(true)
      expect(candleStates.has('BTCUSD')).toBe(true)
      expect(candleStates.get('EURUSD').get('60').open).toBe(1.1050)
      expect(candleStates.get('BTCUSD').get('60').open).toBe(50000)
    })

    it('tick buffer overflow truncates correctly', () => {
      const ticks = tickBuffers.get('EURUSD') || []
      for (let i = 0; i < 100001; i++) {
        ticks.push({ price: 1.10 + Math.random() * 0.01, time: 1000000 + i })
      }
      tickBuffers.set('EURUSD', ticks)
      expect(tickBuffers.get('EURUSD').length).toBe(100001)
      processTick('EURUSD', 1.1050, 1000000 + 100001)
      // splice(0,20000) leaves 80001, then push adds 1 → 80002
      expect(tickBuffers.get('EURUSD').length).toBe(80002)
    })

    it('de-duplicates ticks with same price within 2 seconds', () => {
      processTick('EURUSD', 1.1050, 1000000)
      processTick('EURUSD', 1.1050, 1000001)
      const ticks = tickBuffers.get('EURUSD')
      expect(ticks.length).toBe(1)
    })

    it('allows different price at same time (not a duplicate)', () => {
      processTick('EURUSD', 1.1050, 1000000)
      processTick('EURUSD', 1.1060, 1000000)
      const ticks = tickBuffers.get('EURUSD')
      expect(ticks.length).toBe(2)
    })

    it('allows same price after 2 seconds (beyond dedup window)', () => {
      processTick('EURUSD', 1.1050, 1000000)
      processTick('EURUSD', 1.1050, 1000003)
      const ticks = tickBuffers.get('EURUSD')
      expect(ticks.length).toBe(2)
    })

    it('broadcasts candle when crossing interval boundary', () => {
      subscribers.set('EURUSD', new Set([mockWs]))
      activeIntervals.set('EURUSD', new Set(['60']))
      processTick('EURUSD', 1.1050, 60)
      processTick('EURUSD', 1.1070, 120)

      const sendCalls = mockWs.send.mock.calls
      const candleBroadcasts = sendCalls.filter((call) => {
        try {
          const msg = JSON.parse(call[0])
          return msg.type === 'candle' && msg.symbol === 'EURUSD'
        } catch { return false }
      })
      expect(candleBroadcasts.length).toBeGreaterThanOrEqual(1)
    })

    it('broadcasts candle_update during same interval', () => {
      subscribers.set('EURUSD', new Set([mockWs]))
      activeIntervals.set('EURUSD', new Set(['60']))
      processTick('EURUSD', 1.1050, 60)
      processTick('EURUSD', 1.1060, 61)

      const sendCalls = mockWs.send.mock.calls
      const updateBroadcasts = sendCalls.filter((call) => {
        try {
          const msg = JSON.parse(call[0])
          return msg.type === 'candle_update' && msg.symbol === 'EURUSD'
        } catch { return false }
      })
      expect(updateBroadcasts.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getRecentCandles — edge cases', () => {
    it('returns empty array for unknown interval', () => {
      const result = getRecentCandles('EURUSD', 'UNKNOWN_INTERVAL')
      expect(result).toEqual([])
    })

    it('returns empty array with insufficient ticks', () => {
      processTick('EURUSD', 1.1050, 1000000)
      const result = getRecentCandles('EURUSD', '60')
      expect(result.length).toBeLessThanOrEqual(1)
    })

    it('builds correct candle from multiple ticks', () => {
      for (let t = 0; t < 10; t++) {
        processTick('EURUSD', 1.1050 + t * 0.001, 60 + t)
      }
      const candles = getRecentCandles('EURUSD', '60')
      expect(candles.length).toBeGreaterThanOrEqual(1)
      expect(candles[0].open).toBe(1.1050)
      // t=9 → 1.1050 + 0.009 = 1.114 (floating precision)
      expect(candles[0].close).toBeCloseTo(1.114, 3)
      expect(candles[0].high).toBeGreaterThanOrEqual(candles[0].low)
    })
  })

  describe('interpolateCandles — edge cases', () => {
    it('returns source for non-integer ratio', () => {
      const src = [{ time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105, volume: 100 }]
      const result = interpolateCandles(src, 60, 40)
      expect(result).toEqual(src)
    })

    it('returns source when ratio is exactly 1', () => {
      const src = [{ time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105, volume: 100 }]
      const result = interpolateCandles(src, 60, 60)
      expect(result).toEqual(src)
    })

    it('handles empty source array', () => {
      const result = interpolateCandles([], 60, 5)
      expect(result).toEqual([])
    })

    it('interpolates at ratio 12 (60s to 5s)', () => {
      const src = [{ time: 60, open: 1.10, high: 1.12, low: 1.08, close: 1.11, volume: 120 }]
      const result = interpolateCandles(src, 60, 5)
      expect(result).toHaveLength(12)
      expect(result[0].time).toBe(60)
      expect(result[11].time).toBe(115)
      expect(result[11].close).toBe(1.11)
      expect(result[0].volume + result[11].volume).toBeGreaterThan(0)
    })
  })

  describe('aggregateCandles — edge cases', () => {
    it('returns empty for null input', () => {
      expect(aggregateCandles(null, 60, 300)).toEqual([])
    })

    it('returns empty for undefined input', () => {
      expect(aggregateCandles(undefined, 60, 300)).toEqual([])
    })

    it('handles single candle source', () => {
      const src = [{ time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105, volume: 100 }]
      const result = aggregateCandles(src, 60, 300)
      expect(result).toHaveLength(1)
      expect(result[0].open).toBe(1.10)
      expect(result[0].close).toBe(1.105)
    })

    it('aggregates with exact ratio multiple', () => {
      const src = []
      for (let i = 0; i < 10; i++) {
        src.push({ time: (i + 1) * 60, open: 1.10 + i * 0.001, high: 1.11 + i * 0.001, low: 1.09 + i * 0.001, close: 1.105 + i * 0.001, volume: 100 })
      }
      const result = aggregateCandles(src, 60, 300)
      expect(result).toHaveLength(2)
      expect(result[0].volume).toBe(500)
      expect(result[1].volume).toBe(500)
    })
  })

  describe('seedTickBuffer — edge cases', () => {
    it('seedTickBuffer returns early if buffer already has data', () => {
      const ticks = []
      for (let i = 0; i < 100; i++) {
        ticks.push({ price: 1.10, time: 1000000 + i })
      }
      tickBuffers.set('EURUSD', ticks)

      const candles = [{ time: 2000000, open: 1.11, high: 1.12, low: 1.10, close: 1.115 }]
      seedTickBuffer('EURUSD', candles, 60)
      // seedTickBuffer returns early because ticks.length > 0
      expect(tickBuffers.get('EURUSD').length).toBe(100)
    })
  })

  describe('enhanceCandles — edge cases', () => {
    it('handles undefined open', () => {
      const src = [{ time: 60, high: 1.11, low: 1.09, close: 1.105, volume: 100 }]
      const result = enhanceCandles(src)
      expect(result[0].open).toBe(1.105)
    })

    it('handles undefined volume', () => {
      const src = [{ time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105 }]
      const result = enhanceCandles(src)
      expect(result[0].volume).toBeGreaterThan(0)
    })

    it('filters out entries where close is null', () => {
      const src = [
        { time: 60, open: 1.10, high: 1.11, low: 1.09, close: 1.105, volume: 100 },
        { time: 120, open: 1.11, high: 1.12, low: 1.10, close: null, volume: 100 },
      ]
      const result = enhanceCandles(src)
      expect(result).toHaveLength(1)
    })

    it('preserves all fields after enhancement', () => {
      const src = [{ time: 60, close: 1.105 }]
      const result = enhanceCandles(src)
      expect(result[0]).toHaveProperty('time')
      expect(result[0]).toHaveProperty('open')
      expect(result[0]).toHaveProperty('high')
      expect(result[0]).toHaveProperty('low')
      expect(result[0]).toHaveProperty('close')
      expect(result[0]).toHaveProperty('volume')
    })
  })

  describe('addActiveInterval — idempotency', () => {
    it('adding same interval twice does not duplicate', () => {
      addActiveInterval('EURUSD', '60')
      addActiveInterval('EURUSD', '60')
      expect(activeIntervals.get('EURUSD').size).toBe(1)
    })
  })
})
