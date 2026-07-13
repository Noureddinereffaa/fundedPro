import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatPrice, getContractSize, calcPnl } from '../utils/trading'

describe('formatPrice — edge cases', () => {
  it('formats negative prices', () => {
    expect(formatPrice(-151.234, 'BTCUSDT')).toBe('-151.23')
  })

  it('formats zero price', () => {
    expect(formatPrice(0, 'BTCUSDT')).toBe('0.00')
  })

  it('formats very small price for low-value coins', () => {
    expect(formatPrice(0.00001, 'XRPUSDT')).toBe('0.00001')
  })

  it('formats very large price for BTC', () => {
    expect(formatPrice(250000.123, 'BTCUSDT')).toBe('250000.12')
  })

  it('formats SOL to 3 decimals', () => {
    expect(formatPrice(123.456, 'SOLUSDT')).toBe('123.456')
  })

  it('formats DOGE to 5 decimals', () => {
    expect(formatPrice(0.12345, 'DOGEUSDT')).toBe('0.12345')
  })

  it('handles NaN price gracefully', () => {
    expect(formatPrice(NaN, 'BTCUSDT')).toBe('NaN')
  })

  it('handles Infinity gracefully', () => {
    expect(formatPrice(Infinity, 'BTCUSDT')).toBe('Infinity')
  })
})

describe('getContractSize — all symbols', () => {
  it('returns 1 for all crypto symbols', () => {
    expect(getContractSize('BTCUSDT')).toBe(1)
    expect(getContractSize('ETHUSDT')).toBe(1)
    expect(getContractSize('SOLUSDT')).toBe(1)
    expect(getContractSize('BNBUSDT')).toBe(1)
    expect(getContractSize('XRPUSDT')).toBe(1)
    expect(getContractSize('DOGEUSDT')).toBe(1)
    expect(getContractSize('ADAUSDT')).toBe(1)
  })
})

describe('calcPnl — comprehensive', () => {
  describe('crypto (contract size 1)', () => {
    it('calculates BTC buy profit correctly', () => {
      expect(calcPnl('buy', 67000, 68000, 1, 'BTCUSDT')).toBeCloseTo(1000, 0)
    })

    it('calculates BTC buy loss correctly', () => {
      expect(calcPnl('buy', 67000, 66000, 0.5, 'BTCUSDT')).toBeCloseTo(-500, 0)
    })

    it('calculates BTC sell profit correctly', () => {
      expect(calcPnl('sell', 67000, 66000, 0.5, 'BTCUSDT')).toBeCloseTo(500, 0)
    })

    it('calculates BTC sell loss correctly', () => {
      expect(calcPnl('sell', 67000, 68000, 0.5, 'BTCUSDT')).toBeCloseTo(-500, 0)
    })

    it('handles ETH profit', () => {
      expect(calcPnl('buy', 3000, 3100, 2, 'ETHUSDT')).toBeCloseTo(200, 0)
    })

    it('handles zero volume', () => {
      expect(calcPnl('buy', 3000, 3100, 0, 'ETHUSDT')).toBeCloseTo(0, 0)
    })

    it('calculates profit with SOL', () => {
      expect(calcPnl('buy', 150, 155, 10, 'SOLUSDT')).toBeCloseTo(50, 0)
    })
  })

  describe('edge cases', () => {
    it('returns 0 when price is unchanged', () => {
      expect(calcPnl('buy', 67000, 67000, 1, 'BTCUSDT')).toBeCloseTo(0, 0)
      expect(calcPnl('sell', 67000, 67000, 1, 'BTCUSDT')).toBeCloseTo(0, 0)
    })

    it('handles large volume', () => {
      const pnl = calcPnl('buy', 100, 200, 100, 'SOLUSDT')
      expect(pnl).toBe(10000)
    })

    it('handles unknown side (defaults to sell-like behavior)', () => {
      const pnl = calcPnl('unknown', 67000, 66000, 1, 'BTCUSDT')
      expect(pnl).not.toBeNaN()
    })
  })
})

describe('tradingApi', () => {
  let origFetch: typeof globalThis.fetch

  function mockResponse(data: unknown, status = 200): Response {
    const body = JSON.stringify(data)
    const res = new Response(body, { status, statusText: status === 200 ? 'OK' : 'Bad Request' })
    Object.defineProperty(res, 'json', { value: () => Promise.resolve(data) })
    return res
  }

  beforeEach(() => {
    origFetch = globalThis.fetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = origFetch
  })

  it('tradingApi.placeOrder sends POST to /trading/order', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(mockResponse({ id: 'order-123' })))
    globalThis.fetch = fetchMock

    const { tradingApi } = await import('../utils/api')
    const result = await tradingApi.placeOrder({
      accountId: 'acc1',
      symbol: 'EURUSD',
      type: 'market',
      side: 'buy',
      volume: 0.1,
      price: 0,
    })

    expect(result).toEqual({ id: 'order-123' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = fetchMock.mock.calls[0][0] as string
    const opts = fetchMock.mock.calls[0][1] as RequestInit
    expect(url).toContain('/trading/order')
    expect(opts.method).toBe('POST')
  })

  it('tradingApi.cancelOrder sends DELETE', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(mockResponse({ success: true })))
    globalThis.fetch = fetchMock

    const { tradingApi } = await import('../utils/api')
    await tradingApi.cancelOrder('order-1', 'acc1')

    const opts = fetchMock.mock.calls[0][1] as RequestInit
    expect(opts.method).toBe('DELETE')
  })

  it('tradingApi.getOrders sends GET', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(mockResponse([{ id: 'o1' }])))
    globalThis.fetch = fetchMock

    const { tradingApi } = await import('../utils/api')
    const orders = await tradingApi.getOrders('acc1')
    expect(orders).toEqual([{ id: 'o1' }])
  })

  it('tradingApi.getPositions sends GET', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(mockResponse([{ id: 'p1', symbol: 'EURUSD' }])))
    globalThis.fetch = fetchMock

    const { tradingApi } = await import('../utils/api')
    const positions = await tradingApi.getPositions('acc1')
    expect(positions).toEqual([{ id: 'p1', symbol: 'EURUSD' }])
  })

  it('tradingApi.modifyPosition sends PUT', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(mockResponse({ success: true })))
    globalThis.fetch = fetchMock

    const { tradingApi } = await import('../utils/api')
    await tradingApi.modifyPosition('p1', { accountId: 'acc1', stopLoss: 1.09, takeProfit: 1.12 })

    const opts = fetchMock.mock.calls[0][1] as RequestInit
    expect(opts.method).toBe('PUT')
  })

  it('tradingApi.closePosition sends POST', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(mockResponse({ success: true })))
    globalThis.fetch = fetchMock

    const { tradingApi } = await import('../utils/api')
    await tradingApi.closePosition('p1', 'acc1', 0.5, 1.10)

    const opts = fetchMock.mock.calls[0][1] as RequestInit
    expect(opts.method).toBe('POST')
  })

  it('tradingApi.closeAllPositions sends POST', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(mockResponse({ success: true })))
    globalThis.fetch = fetchMock

    const { tradingApi } = await import('../utils/api')
    await tradingApi.closeAllPositions('acc1')

    const opts = fetchMock.mock.calls[0][1] as RequestInit
    expect(opts.method).toBe('POST')
  })

  it('tradingApi.getHistory sends GET with pagination params', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(mockResponse({ data: [], total: 0 })))
    globalThis.fetch = fetchMock

    const { tradingApi } = await import('../utils/api')
    await tradingApi.getHistory('acc1', 2, 25)

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('page=2')
    expect(url).toContain('limit=25')
  })

  it('tradingApi.getStats sends GET', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(mockResponse({ totalTrades: 10 })))
    globalThis.fetch = fetchMock

    const { tradingApi } = await import('../utils/api')
    const stats = await tradingApi.getStats('acc1')
    expect(stats).toEqual({ totalTrades: 10 })
  })

  it('throws on HTTP error', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(mockResponse('Bad request', 400)))
    globalThis.fetch = fetchMock

    const { tradingApi } = await import('../utils/api')
    await expect(tradingApi.getOrders('acc1')).rejects.toThrow()
  })
})
