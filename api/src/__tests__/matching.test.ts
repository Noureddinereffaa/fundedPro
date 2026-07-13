import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  order: { findMany: vi.fn(), update: vi.fn() },
  position: { findMany: vi.fn(), update: vi.fn() },
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
}))

vi.mock('../index.js', () => ({
  prisma: mockPrisma,
}))

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
      expect(mockPlaceOrder).not.toHaveBeenCalled()
      expect(mockPrisma.order.update).not.toHaveBeenCalled()
    })

    const mockPrices: Record<string, { price: number; change: number }> = {
      EURUSD: { price: 0, change: 0 },
      XAUUSD: { price: 0, change: 0 },
      BTCUSDT: { price: 0, change: 0 },
    }

    it('executes buy limit when price drops to target', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord1',
          accountId: 'acc1',
          symbol: 'EURUSD',
          type: 'limit',
          side: 'buy',
          volume: 1,
          price: 1.1,
          stopLoss: null,
          takeProfit: null,
          trailingStop: null,
          breakEven: false,
        },
      ])

      mockPlaceOrder.mockResolvedValue({ order: { id: 'ord1', status: 'filled' }, position: null })

      await engine.processOrders({ ...mockPrices, EURUSD: { price: 1.099, change: -0.0055 } })
      expect(mockPlaceOrder).toHaveBeenCalled()
    })

    it('executes sell limit when price rises to target', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord2',
          accountId: 'acc1',
          symbol: 'EURUSD',
          type: 'limit',
          side: 'sell',
          volume: 1,
          price: 1.11,
          stopLoss: null,
          takeProfit: null,
          trailingStop: null,
          breakEven: false,
        },
      ])

      mockPlaceOrder.mockResolvedValue({ order: { id: 'ord2', status: 'filled' }, position: null })

      await engine.processOrders({ ...mockPrices, EURUSD: { price: 1.111, change: 0.0055 } })
      expect(mockPlaceOrder).toHaveBeenCalled()
    })

    it('executes buy stop when price rises to target', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord3',
          accountId: 'acc1',
          symbol: 'XAUUSD',
          type: 'stop',
          side: 'buy',
          volume: 1,
          price: 1920.0,
          stopLoss: null,
          takeProfit: null,
          trailingStop: null,
          breakEven: false,
        },
      ])

      mockPlaceOrder.mockResolvedValue({ order: { id: 'ord3', status: 'filled' }, position: null })

      await engine.processOrders({ ...mockPrices, XAUUSD: { price: 1925.0, change: 5.0 } })
      expect(mockPlaceOrder).toHaveBeenCalled()
    })

    it('does not execute if price condition not met', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord4',
          accountId: 'acc1',
          symbol: 'EURUSD',
          type: 'limit',
          side: 'buy',
          volume: 1,
          price: 1.1,
          stopLoss: null,
          takeProfit: null,
          trailingStop: null,
          breakEven: false,
        },
      ])

      await engine.processOrders({ ...mockPrices, EURUSD: { price: 1.105, change: 0.005 } })
      expect(mockPlaceOrder).not.toHaveBeenCalled()
    })

    it('marks order as failed if trading service throws', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
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
        },
      ])

      mockPlaceOrder.mockRejectedValue(new Error('Insufficient margin'))

      await engine.processOrders({ ...mockPrices, BTCUSDT: { price: 29500, change: -500 } })
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord5' },
          data: expect.objectContaining({ status: 'failed' }),
        }),
      )
    })
  })

  describe('processTrailingStops', () => {
    const mockPrices = { EURUSD: { price: 0, change: 0 } }

    it('updates trailing stop for buy position when price rises', async () => {
      mockPrisma.position.findMany.mockResolvedValue([
        {
          id: 'pos1',
          symbol: 'EURUSD',
          side: 'buy',
          volume: 1,
          openPrice: 1.1,
          stopLoss: 1.095,
          trailingStop: 0.002,
        },
      ])

      await engine.processTrailingStops({ ...mockPrices, EURUSD: { price: 1.108, change: 0.008 } })
      expect(mockPrisma.position.update).toHaveBeenCalled()
    })

    it('does not update trailing stop if price did not improve', async () => {
      mockPrisma.position.findMany.mockResolvedValue([
        {
          id: 'pos1',
          symbol: 'EURUSD',
          side: 'buy',
          volume: 1,
          openPrice: 1.1,
          stopLoss: 1.095,
          trailingStop: 0.002,
        },
      ])

      await engine.processTrailingStops({ ...mockPrices, EURUSD: { price: 1.097, change: -0.003 } })
      expect(mockPrisma.position.update).not.toHaveBeenCalled()
    })
  })

  describe('processBreakEven', () => {
    const mockPrices = { EURUSD: { price: 0, change: 0 } }

    it('moves SL to entry when price moves in favor', async () => {
      mockPrisma.position.findMany.mockResolvedValue([
        {
          id: 'pos1',
          symbol: 'EURUSD',
          side: 'buy',
          volume: 1,
          openPrice: 1.1,
          stopLoss: 1.09,
          breakEven: true,
        },
      ])

      await engine.processBreakEven({ ...mockPrices, EURUSD: { price: 1.11, change: 0.01 } })
      expect(mockPrisma.position.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pos1' },
          data: expect.objectContaining({ stopLoss: 1.1 }),
        }),
      )
    })

    it('does not move SL if price not far enough', async () => {
      mockPrisma.position.findMany.mockResolvedValue([
        {
          id: 'pos1',
          symbol: 'EURUSD',
          side: 'buy',
          volume: 1,
          openPrice: 1.1,
          stopLoss: 1.09,
          breakEven: true,
        },
      ])

      await engine.processBreakEven({ ...mockPrices, EURUSD: { price: 1.102, change: 0.002 } })
      expect(mockPrisma.position.update).not.toHaveBeenCalled()
    })
  })
})
