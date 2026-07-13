import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRealtimeCandles } from '../utils/useRealtime'
import { dataClient } from '../utils/wsClient'
import { getCachedKlines } from '../utils/klineCache'
import { getMarketStatus } from '../utils/marketHours'
import { getMarketInfo } from '../utils/marketData'
import { generateMockKlines as _generateMockKlines } from '../utils/mockData'

vi.mock('../utils/wsClient', () => ({
  dataClient: {
    connectionStatus: 'disconnected' as const,
    connect: vi.fn(() => Promise.resolve()),
    fetchKlines: vi.fn(() => new Promise(() => {})),
    subscribeCandle: vi.fn(() => vi.fn()),
    onStatusChange: vi.fn(() => vi.fn()),
    getMarketStatus: vi.fn(() => undefined),
    onMarketStatus: vi.fn(() => vi.fn()),
  },
}))

vi.mock('../utils/mockData', () => ({
  generateMockKlines: vi.fn(() => [
    { time: 1000, open: 1.08, high: 1.09, low: 1.07, close: 1.085, volume: 100 },
    { time: 2000, open: 1.085, high: 1.095, low: 1.08, close: 1.09, volume: 200 },
  ]),
}))

vi.mock('../utils/klineCache', () => ({
  getCachedKlines: vi.fn(() => null),
  setCachedKlines: vi.fn(),
}))

vi.mock('../utils/marketData', () => ({
  getMarketInfo: vi.fn(() => ({ type: 'forex', digits: 5, name: 'EUR/USD' })),
}))

vi.mock('../utils/marketHours', () => ({
  getMarketStatus: vi.fn(() => ({ open: true, text: 'Open', nextOpen: null, nextClose: null })),
}))

describe('useRealtimeCandles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading initially', () => {
    const { result } = renderHook(() => useRealtimeCandles('EURUSD', '60', vi.fn(), vi.fn()))
    expect(result.current.isLoading).toBe(true)
  })

  it('calls onInitial when cache is available', () => {
    const cachedData = [{ time: 1000, open: 1.08, high: 1.09, low: 1.07, close: 1.085, volume: 100 }]
    vi.mocked(getCachedKlines).mockReturnValue(cachedData)

    const onInitial = vi.fn()
    renderHook(() => useRealtimeCandles('EURUSD', '60', onInitial, vi.fn()))

    expect(onInitial).toHaveBeenCalledWith(cachedData)
  })

  it('uses generateMockKlines when market is closed and no cache', () => {
    vi.mocked(getMarketStatus).mockReturnValue({
      open: false,
      text: 'Market Closed',
      nextOpen: null,
      nextClose: null,
    })

    const onInitial = vi.fn()
    const { result } = renderHook(() => useRealtimeCandles('EURUSD', '60', onInitial, vi.fn()))

    expect(onInitial).toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it('skips WS fetch when market is closed', () => {
    vi.mocked(getMarketStatus).mockReturnValue({
      open: false,
      text: 'Market Closed',
      nextOpen: null,
      nextClose: null,
    })

    renderHook(() => useRealtimeCandles('EURUSD', '60', vi.fn(), vi.fn()))

    expect(dataClient.fetchKlines).not.toHaveBeenCalled()
    expect(dataClient.subscribeCandle).not.toHaveBeenCalled()
  })

  it('ignores stale WS response after symbol change', async () => {
    let resolveFirst: (v: any) => void = () => {}
    vi.mocked(dataClient.fetchKlines).mockReturnValue(
      new Promise((resolve) => {
        resolveFirst = resolve
      }),
    )

    const onInitial = vi.fn()
    const { rerender } = renderHook(
      ({ symbol, interval }) => useRealtimeCandles(symbol, interval, onInitial, vi.fn()),
      { initialProps: { symbol: 'EURUSD', interval: '60' } },
    )

    vi.mocked(getMarketInfo).mockReturnValue({
      symbol: 'GBPUSD',
      type: 'forex',
      digits: 5,
      name: 'GBP/USD',
      group: 'forex',
    })
    rerender({ symbol: 'GBPUSD', interval: '60' })

    await act(async () => {
      resolveFirst({
        klines: [{ time: 1000, open: 1.2, high: 1.21, low: 1.19, close: 1.205, volume: 50 }],
        price: 1.205,
        change: 0.01,
      })
    })

    const staleCalls = onInitial.mock.calls.filter((call: any[]) => {
      const data = call[0]
      return Array.isArray(data) && data.length > 0 && data[0]?.open === 1.2
    })
    expect(staleCalls).toHaveLength(0)
  })
})
