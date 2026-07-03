import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  order: { findMany: vi.fn(), update: vi.fn() },
  position: { findMany: vi.fn(), update: vi.fn() },
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
}))

vi.mock('../index.js', () => ({
  prisma: mockPrisma,
}))

const mockFetchUrl = vi.hoisted(() => vi.fn())
vi.stubGlobal('fetch', vi.fn((url: string) => mockFetchUrl(url)))

const mockPlaceOrder = vi.hoisted(() => vi.fn())
vi.mock('../services/trading.js', () => ({
  TradingService: class {
    placeOrder = mockPlaceOrder
  },
}))

import { MatchingEngine } from '../services/MatchingEngine.js'

describe('MatchingEngine', () => {
  let engine: MatchingEngine

  beforeEach(() => {
    vi.clearAllMocks()
    engine = new MatchingEngine()
  })

  describe('processOrders', () => {
    it('does nothing if no pending orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([])
      await engine.processOrders()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('executes buy limit when price drops to target', async () => {
      mockPrisma.order.findMany.mockResolvedValue([{
        id: 'ord1',
        accountId: 'acc1',
        symbol: 'EURUSD',
        type: 'limit',
        side: 'buy',
        volume: 1,
        price: 1.10000,
        stopLoss: null,
        takeProfit: null,
        trailingStop: null,
        breakEven: false,
      }])

      mockFetchUrl.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 1.09900,
                chartPreviousClose: 1.10500,
              },
            }],
          },
        }),
      })

      mockPlaceOrder.mockResolvedValue({ order: { id: 'ord1', status: 'filled' }, position: null })

      await engine.processOrders()
      expect(mockPlaceOrder).toHaveBeenCalled()
    })

    it('executes sell limit when price rises to target', async () => {
      mockPrisma.order.findMany.mockResolvedValue([{
        id: 'ord2',
        accountId: 'acc1',
        symbol: 'EURUSD',
        type: 'limit',
        side: 'sell',
        volume: 1,
        price: 1.11000,
        stopLoss: null,
        takeProfit: null,
        trailingStop: null,
        breakEven: false,
      }])

      mockFetchUrl.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 1.11100,
                chartPreviousClose: 1.10500,
              },
            }],
          },
        }),
      })

      mockPlaceOrder.mockResolvedValue({ order: { id: 'ord2', status: 'filled' }, position: null })

      await engine.processOrders()
      expect(mockPlaceOrder).toHaveBeenCalled()
    })

    it('executes buy stop when price rises to target', async () => {
      mockPrisma.order.findMany.mockResolvedValue([{
        id: 'ord3',
        accountId: 'acc1',
        symbol: 'XAUUSD',
        type: 'stop',
        side: 'buy',
        volume: 1,
        price: 1920.00,
        stopLoss: null,
        takeProfit: null,
        trailingStop: null,
        breakEven: false,
      }])

      mockFetchUrl.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 1925.00,
                chartPreviousClose: 1910.00,
              },
            }],
          },
        }),
      })

      mockPlaceOrder.mockResolvedValue({ order: { id: 'ord3', status: 'filled' }, position: null })

      await engine.processOrders()
      expect(mockPlaceOrder).toHaveBeenCalled()
    })

    it('does not execute if price condition not met', async () => {
      mockPrisma.order.findMany.mockResolvedValue([{
        id: 'ord4',
        accountId: 'acc1',
        symbol: 'EURUSD',
        type: 'limit',
        side: 'buy',
        volume: 1,
        price: 1.10000,
        stopLoss: null,
        takeProfit: null,
        trailingStop: null,
        breakEven: false,
      }])

      mockFetchUrl.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 1.10500,
                chartPreviousClose: 1.10500,
              },
            }],
          },
        }),
      })

      await engine.processOrders()
      expect(mockPlaceOrder).not.toHaveBeenCalled()
    })

    it('marks order as failed if trading service throws', async () => {
      mockPrisma.order.findMany.mockResolvedValue([{
        id: 'ord5',
        accountId: 'acc1',
        symbol: 'BTCUSDT',
        type: 'limit',
        side: 'buy',
        volume: 1,
        price: 30000,
        stopLoss: null,
        takeProfit: null,
        trailingStop: null,
        breakEven: false,
      }])

      mockFetchUrl.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 29500,
                chartPreviousClose: 30000,
              },
            }],
          },
        }),
      })

      mockPlaceOrder.mockRejectedValue(new Error('Insufficient margin'))

      await engine.processOrders()
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord5' },
          data: expect.objectContaining({ status: 'failed' }),
        })
      )
    })
  })

  describe('processTrailingStops', () => {
    it('updates trailing stop for buy position when price rises', async () => {
      mockPrisma.position.findMany.mockResolvedValue([{
        id: 'pos1',
        symbol: 'EURUSD',
        side: 'buy',
        volume: 1,
        openPrice: 1.10000,
        stopLoss: 1.09500,
        trailingStop: 0.00200,
      }])

      mockFetchUrl.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 1.10800,
                chartPreviousClose: 1.10000,
              },
            }],
          },
        }),
      })

      await engine.processTrailingStops()
      expect(mockPrisma.position.update).toHaveBeenCalled()
    })

    it('does not update trailing stop if price did not improve', async () => {
      mockPrisma.position.findMany.mockResolvedValue([{
        id: 'pos1',
        symbol: 'EURUSD',
        side: 'buy',
        volume: 1,
        openPrice: 1.10000,
        stopLoss: 1.09500,
        trailingStop: 0.00200,
      }])

      mockFetchUrl.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 1.09700,
                chartPreviousClose: 1.10000,
              },
            }],
          },
        }),
      })

      await engine.processTrailingStops()
      expect(mockPrisma.position.update).not.toHaveBeenCalled()
    })
  })

  describe('processBreakEven', () => {
    it('moves SL to entry when price moves in favor', async () => {
      mockPrisma.position.findMany.mockResolvedValue([{
        id: 'pos1',
        symbol: 'EURUSD',
        side: 'buy',
        volume: 1,
        openPrice: 1.10000,
        stopLoss: 1.09000,
        breakEven: true,
      }])

      mockFetchUrl.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 1.11000,
                chartPreviousClose: 1.10000,
              },
            }],
          },
        }),
      })

      await engine.processBreakEven()
      expect(mockPrisma.position.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pos1' },
          data: expect.objectContaining({ stopLoss: 1.10000 }),
        })
      )
    })

    it('does not move SL if price not far enough', async () => {
      mockPrisma.position.findMany.mockResolvedValue([{
        id: 'pos1',
        symbol: 'EURUSD',
        side: 'buy',
        volume: 1,
        openPrice: 1.10000,
        stopLoss: 1.09000,
        breakEven: true,
      }])

      mockFetchUrl.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 1.10200,
                chartPreviousClose: 1.10000,
              },
            }],
          },
        }),
      })

      await engine.processBreakEven()
      expect(mockPrisma.position.update).not.toHaveBeenCalled()
    })
  })
})
