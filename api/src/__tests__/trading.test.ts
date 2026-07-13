import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  account: { findUnique: vi.fn(), update: vi.fn() },
  order: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  position: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  trade: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
  ruleViolation: { create: vi.fn() },
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
}))

vi.mock('../index.js', () => ({
  prisma: mockPrisma,
}))

vi.mock('../utils/helpers.js', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    isMarketOpen: vi.fn(() => true),
  }
})

// Mock global fetch for server price lookup
vi.stubGlobal('fetch', vi.fn())

import { TradingService } from '../services/trading.js'
import { AppError } from '../middleware/errorHandler.js'

describe('TradingService', () => {
  let service: TradingService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2023-11-15T12:00:00Z')) // Wednesday
    service = new TradingService()
    // Default: fetch server price succeeds, returns BTCUSDT @ 30000
    ;(globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ BTCUSDT: { price: 30000 } }),
    })
  })

  describe('placeOrder', () => {
    const baseOrder = {
      symbol: 'BTCUSDT',
      type: 'market',
      side: 'buy',
      volume: 0.01,
      price: 30000,
    }

    it('throws error for invalid symbol', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, symbol: 'INVALID' })).rejects.toThrow(AppError)
    })

    it('throws error for invalid order type', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, type: 'invalid' })).rejects.toThrow(
        'Invalid order type',
      )
    })

    it('throws error for invalid side', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, side: 'invalid' })).rejects.toThrow(
        'Invalid order side',
      )
    })

    it('throws error for zero volume', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, volume: 0 })).rejects.toThrow(
        'Volume must be greater than 0',
      )
    })

    it('throws error for limit order without price', async () => {
      await expect(
        service.placeOrder('acc1', { ...baseOrder, type: 'limit', price: undefined }),
      ).rejects.toThrow('Price is required for limit/stop orders')
    })

    it('throws error for negative price', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, type: 'limit', price: -1 })).rejects.toThrow(
        'Price is required for limit/stop orders',
      )
    })

    it('validates buy SL must be below entry', async () => {
      await expect(
        service.placeOrder('acc1', { ...baseOrder, type: 'limit', stopLoss: 31000 }),
      ).rejects.toThrow('Stop loss must be below entry price for buy')
    })

    it('validates sell SL must be above entry', async () => {
      await expect(
        service.placeOrder('acc1', { ...baseOrder, type: 'limit', side: 'sell', stopLoss: 29000 }),
      ).rejects.toThrow('Stop loss must be above entry price for sell')
    })

    it('validates buy TP must be above entry', async () => {
      await expect(
        service.placeOrder('acc1', { ...baseOrder, type: 'limit', takeProfit: 29000 }),
      ).rejects.toThrow('Take profit must be above entry price for buy')
    })

    it('validates sell TP must be below entry', async () => {
      await expect(
        service.placeOrder('acc1', { ...baseOrder, type: 'limit', side: 'sell', takeProfit: 31000 }),
      ).rejects.toThrow('Take profit must be below entry price for sell')
    })

    it('creates order and position for market order', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        status: 'active',
        balance: 10000,
        equity: 10000,
        accountSize: 10000,
        leverage: 100,
        maxPositionSize: 5,
        maxOpenTrades: 10,
        maxDailyLoss: 6,
        maxOverallLoss: 10,
        positions: [],
      })
      mockPrisma.trade.findMany.mockResolvedValue([])
      mockPrisma.position.findMany.mockResolvedValue([])
      mockPrisma.order.create.mockResolvedValue({ id: 'order1', ...baseOrder, status: 'filled' })
      mockPrisma.position.create.mockResolvedValue({ id: 'pos1' })
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma))

      const result = await service.placeOrder('acc1', baseOrder)
      expect(result.order).toBeDefined()
      expect(result.position).toBeDefined()
      expect(result.order.status).toBe('filled')
    })

    it('creates only order for limit order (no position)', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        status: 'active',
        balance: 10000,
        equity: 10000,
        accountSize: 10000,
        leverage: 100,
        maxPositionSize: 5,
        maxOpenTrades: 10,
        maxDailyLoss: 6,
        maxOverallLoss: 10,
        positions: [],
      })
      mockPrisma.trade.findMany.mockResolvedValue([])
      mockPrisma.position.findMany.mockResolvedValue([])
      mockPrisma.order.create.mockResolvedValue({
        id: 'order2',
        ...baseOrder,
        type: 'limit',
        status: 'pending',
      })
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma))

      const result = await service.placeOrder('acc1', { ...baseOrder, type: 'limit' })
      expect(result.order).toBeDefined()
      expect(result.position).toBeNull()
      expect(result.order.status).toBe('pending')
    })

    it('throws if account not found', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null)
      await expect(service.placeOrder('acc1', baseOrder)).rejects.toThrow('Account not found')
    })
  })

  describe('closePosition', () => {
    const mockPosition = {
      id: 'pos1',
      accountId: 'acc1',
      symbol: 'BTCUSDT',
      side: 'buy',
      volume: 1,
      openPrice: 30000,
      currentPrice: 31000,
      commission: 0,
      margin: 600,
      openTime: new Date(),
      status: 'open',
    }

    it('closes a full position', async () => {
      mockPrisma.position.findFirst.mockResolvedValue(mockPosition)
      mockPrisma.account.findUnique.mockResolvedValue({ id: 'acc1', balance: 10000 })
      ;(globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ BTCUSDT: { price: 32000 } }),
      })

      const result = await service.closePosition('pos1', 'acc1')
      expect(result.pnl).toBeGreaterThan(0)
      expect(result.isPartial).toBe(false)
    })

    it('partially closes a position', async () => {
      mockPrisma.position.findFirst.mockResolvedValue(mockPosition)

      const result = await service.closePosition('pos1', 'acc1', 0.5)
      expect(result.isPartial).toBe(true)
      expect(result.remainingVolume).toBe(0.5)
    })

    it('throws for non-existent position', async () => {
      mockPrisma.position.findFirst.mockResolvedValue(null)
      await expect(service.closePosition('pos1', 'acc1')).rejects.toThrow('Position not found')
    })

    it('uses custom close price', async () => {
      mockPrisma.position.findFirst.mockResolvedValue(mockPosition)
      mockPrisma.account.findUnique.mockResolvedValue({ id: 'acc1', balance: 10000 })

      const result = await service.closePosition('pos1', 'acc1', undefined, 31000)
      expect(result.pnl).toBe(1000)
    })

    it('fetches live price when no close price is provided', async () => {
      mockPrisma.position.findFirst.mockResolvedValue(mockPosition)
      mockPrisma.account.findUnique.mockResolvedValue({ id: 'acc1', balance: 10000 })
      ;(globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ BTCUSDT: { price: 32000, change: 0.02 } }),
      })

      const result = await service.closePosition('pos1', 'acc1')
      expect(result.pnl).toBeGreaterThan(0)
      expect((globalThis.fetch as any)).toHaveBeenCalled()
    })

    it('falls back to currentPrice when live price lookup fails', async () => {
      vi.useRealTimers()
      mockPrisma.position.findFirst.mockResolvedValue(mockPosition)
      mockPrisma.account.findUnique.mockResolvedValue({ id: 'acc1', balance: 10000 })
      ;(globalThis.fetch as any).mockRejectedValue(new Error('network error'))

      const result = await service.closePosition('pos1', 'acc1')
      expect(result.pnl).toBeGreaterThan(0)
    })
  })

  describe('closeAllPositions', () => {
    it('closes all open positions using snapshot prices', async () => {
      const position = {
        id: 'pos1',
        accountId: 'acc1',
        symbol: 'BTCUSDT',
        side: 'buy',
        volume: 1,
        openPrice: 30000,
        currentPrice: 31000,
        commission: 0,
        margin: 600,
        openTime: new Date(),
        status: 'open',
      }

      mockPrisma.position.findMany.mockResolvedValue([position])
      mockPrisma.position.findFirst.mockResolvedValue(position)
      mockPrisma.account.findUnique.mockResolvedValue({ id: 'acc1', balance: 10000 })
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma))

      const result = await service.closeAllPositions('acc1')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ id: 'pos1', status: 'closed' })
    })
  })

  describe('modifyOrder', () => {
    it('modifies pending order SL/TP', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'ord1', accountId: 'acc1', status: 'pending' })
      mockPrisma.order.update.mockResolvedValue({ id: 'ord1' })

      const result = await service.modifyOrder('ord1', 'acc1', { stopLoss: 1.09, takeProfit: 1.11 })
      expect(result).toBeDefined()
    })

    it('throws if order not found', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null)
      await expect(service.modifyOrder('ord1', 'acc1', {})).rejects.toThrow('Order not found')
    })

    it('throws if order already filled', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'ord1', accountId: 'acc1', status: 'filled' })
      await expect(service.modifyOrder('ord1', 'acc1', {})).rejects.toThrow('Can only modify pending orders')
    })
  })

  describe('cancelOrder', () => {
    it('cancels a pending order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'ord1', accountId: 'acc1', status: 'pending' })
      mockPrisma.order.update.mockResolvedValue({ id: 'ord1', status: 'cancelled' })

      const result = await service.cancelOrder('ord1', 'acc1')
      expect(result.status).toBe('cancelled')
    })

    it('throws if order not found', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null)
      await expect(service.cancelOrder('ord1', 'acc1')).rejects.toThrow('Order not found')
    })
  })

  describe('modifyPosition', () => {
    it('modifies position SL/TP', async () => {
      mockPrisma.position.findFirst.mockResolvedValue({
        id: 'pos1',
        accountId: 'acc1',
        status: 'open',
        side: 'buy',
        openPrice: 1.1,
      })
      mockPrisma.position.update.mockResolvedValue({ id: 'pos1' })

      const result = await service.modifyPosition('pos1', 'acc1', { stopLoss: 1.09, takeProfit: 1.11 })
      expect(result).toBeDefined()
    })

    it('validates buy SL below open', async () => {
      mockPrisma.position.findFirst.mockResolvedValue({
        id: 'pos1',
        accountId: 'acc1',
        status: 'open',
        side: 'buy',
        openPrice: 1.1,
      })
      await expect(service.modifyPosition('pos1', 'acc1', { stopLoss: 1.11 })).rejects.toThrow(
        'Stop loss must be below open price',
      )
    })

    it('validates sell SL above open', async () => {
      mockPrisma.position.findFirst.mockResolvedValue({
        id: 'pos1',
        accountId: 'acc1',
        status: 'open',
        side: 'sell',
        openPrice: 1.1,
      })
      await expect(service.modifyPosition('pos1', 'acc1', { stopLoss: 1.09 })).rejects.toThrow(
        'Stop loss must be above open price',
      )
    })
  })

  describe('getStatistics', () => {
    it('returns empty stats for no trades', async () => {
      mockPrisma.trade.aggregate
        .mockResolvedValueOnce({ _sum: { profit: null }, _count: 0 })
        .mockResolvedValueOnce({
          _sum: { profit: null },
          _max: { profit: null },
          _min: { profit: null },
          _count: 0,
        })

      const stats = await service.getStatistics('acc1')
      expect(stats.totalTrades).toBe(0)
      expect(stats.winRate).toBe(0)
    })

    it('calculates win rate correctly', async () => {
      mockPrisma.trade.aggregate
        .mockResolvedValueOnce({ _sum: { profit: 300 }, _count: 2 })
        .mockResolvedValueOnce({
          _sum: { profit: 220 },
          _max: { profit: 200 },
          _min: { profit: -50 },
          _count: 4,
        })

      const stats = await service.getStatistics('acc1')
      expect(stats.totalTrades).toBe(4)
      expect(stats.winRate).toBe(50)
    })

    it('calculates profit factor', async () => {
      mockPrisma.trade.aggregate
        .mockResolvedValueOnce({ _sum: { profit: 500 }, _count: 2 })
        .mockResolvedValueOnce({
          _sum: { profit: 400 },
          _max: { profit: 300 },
          _min: { profit: -100 },
          _count: 3,
        })

      const stats = await service.getStatistics('acc1')
      expect(stats.profitFactor).toBe(5)
      expect(stats.averageWin).toBe(250)
      expect(stats.averageLoss).toBe(100)
    })
  })
})
