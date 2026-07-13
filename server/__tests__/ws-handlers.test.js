// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  },
}))

vi.mock('../data-sources/binance.js', () => ({
  subscribeBinance: vi.fn(),
  unsubscribeBinance: vi.fn(),
  fetchBinanceKlines: vi.fn(() => Promise.resolve([])),
  connectBinance: vi.fn(),
  startBinanceWatchdog: vi.fn(),
}))

vi.mock('../data-sources/twelvedata.js', () => ({
  subscribeTwelveData: vi.fn(),
  unsubscribeTwelveData: vi.fn(),
  connectTwelveData: vi.fn(),
  fetchTwelveDataKlines: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('../data-sources/yahoo.js', () => ({
  subscribeYahooWs: vi.fn(),
  unsubscribeYahooWs: vi.fn(),
  fetchYahooKlines: vi.fn(() => Promise.resolve([])),
  fetchYahooKlines1m: vi.fn(() => Promise.resolve([])),
  fetchYahooQuote: vi.fn(() => Promise.resolve({ price: 1.1050, change: 0.15 })),
  connectYahooWs: vi.fn(),
  startYahooWsWatchdog: vi.fn(),
  fetchTDQuote: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('../data-sources/coingecko.js', () => ({
  fetchCoinGeckoPrices: vi.fn(() => Promise.resolve()),
}))

// Prevent module-level setInterval from running
vi.useFakeTimers()

// ── SUT ──────────────────────────────────────────────────────────

import { handleSubscribe, handleUnsubscribe } from '../lib/ws-handlers.js'
import { subscribers, activeIntervals, tickBuffers, candleStates } from '../lib/engine.js'

// ── Helpers ──────────────────────────────────────────────────────

function createMockWs() {
  return {
    readyState: 1,
    send: vi.fn(),
    on: vi.fn(),
    terminate: vi.fn(),
  }
}

function clearState() {
  subscribers.clear()
  activeIntervals.clear()
  tickBuffers.clear()
  candleStates.clear()
}

// ── Tests ────────────────────────────────────────────────────────

describe('ws-handlers', () => {
  beforeEach(() => {
    clearState()
  })

  describe('handleSubscribe', () => {
    it('adds subscriber for the given symbol', async () => {
      const ws = createMockWs()
      const msg = { symbols: 'EURUSD', interval: '60' }
      await handleSubscribe(ws, msg)
      expect(subscribers.has('EURUSD')).toBe(true)
      expect(subscribers.get('EURUSD').has(ws)).toBe(true)
    })

    it('adds active interval', async () => {
      const ws = createMockWs()
      const msg = { symbols: 'EURUSD', interval: '60' }
      await handleSubscribe(ws, msg)
      expect(activeIntervals.has('EURUSD')).toBe(true)
      expect(activeIntervals.get('EURUSD').has('60')).toBe(true)
    })

    it('handles array of symbols', async () => {
      const ws = createMockWs()
      const msg = { symbols: ['EURUSD', 'BTCUSD'], interval: '300' }
      await handleSubscribe(ws, msg)
      expect(subscribers.has('EURUSD')).toBe(true)
      expect(subscribers.has('BTCUSD')).toBe(true)
    })

    it('calls subscribeBinance for each symbol', async () => {
      const ws = createMockWs()
      const msg = { symbols: 'EURUSD', interval: '60' }
      await handleSubscribe(ws, msg)
      expect(subscribers.has('EURUSD')).toBe(true)
    })

    it('broadcasts error for unknown symbol', async () => {
      const ws = createMockWs()
      const msg = { symbols: 'UNKNOWN', interval: '60' }
      await handleSubscribe(ws, msg)
      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('Unknown symbol'),
      )
      // Should not add to subscribers
      expect(subscribers.has('UNKNOWN')).toBe(false)
    })

    it('sends initial klines when needsInitial is true', async () => {
      const ws = createMockWs()
      const msg = { symbols: 'EURUSD', interval: '60', needsInitial: true }
      await handleSubscribe(ws, msg)
      expect(ws.send).toHaveBeenCalled()
      const sent = JSON.parse(ws.send.mock.calls[0])
      expect(sent.type).toBe('initial')
      expect(sent.symbol).toBe('EURUSD')
      expect(sent.interval).toBe('60')
    })
  })

  describe('handleUnsubscribe', () => {
    it('removes subscriber for the given symbol', async () => {
      const ws = createMockWs()
      const msg = { symbols: 'EURUSD', interval: '60' }
      await handleSubscribe(ws, msg)
      expect(subscribers.get('EURUSD').has(ws)).toBe(true)

      handleUnsubscribe(ws, { symbols: 'EURUSD', interval: '60' })
      expect(subscribers.get('EURUSD').has(ws)).toBe(false)
    })

    it('stops polling when last subscriber removed', async () => {
      const ws = createMockWs()
      const msg = { symbols: 'EURUSD', interval: '60' }
      await handleSubscribe(ws, msg)
      handleUnsubscribe(ws, { symbols: 'EURUSD', interval: '60' })
      const clients = subscribers.get('EURUSD')
      expect(clients.size).toBe(0)
    })

    it('handles unsubscribe for non-existent symbol', () => {
      const ws = createMockWs()
      expect(() => {
        handleUnsubscribe(ws, { symbols: 'EURUSD', interval: '60' })
      }).not.toThrow()
    })

    it('handles array of symbols for unsubscribe', async () => {
      const ws = createMockWs()
      const msg = { symbols: ['EURUSD', 'BTCUSD'], interval: '60' }
      await handleSubscribe(ws, msg)
      handleUnsubscribe(ws, { symbols: ['EURUSD', 'BTCUSD'], interval: '60' })
      expect(subscribers.get('EURUSD').has(ws)).toBe(false)
      expect(subscribers.get('BTCUSD').has(ws)).toBe(false)
    })
  })
})
