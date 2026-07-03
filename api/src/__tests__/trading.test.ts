import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  account: { findUnique: vi.fn(), update: vi.fn() },
  order: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  position: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  trade: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  ruleViolation: { create: vi.fn() },
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
}))

vi.mock('../index.js', () => ({
  prisma: mockPrisma,
}))

import { TradingService } from '../services/trading.js'
import { AppError } from '../middleware/errorHandler.js'

describe('TradingService', () => {
  let service: TradingService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TradingService()
  })

  describe('placeOrder', () => {
    const baseOrder = {
      symbol: 'EURUSD',
      type: 'market',
      side: 'buy',
      volume: 0.01,
      price: 1.10000,
    }

    it('throws error for invalid symbol', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, symbol: 'INVALID' }))
        .rejects.toThrow(AppError)
    })

    it('throws error for invalid order type', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, type: 'invalid' }))
        .rejects.toThrow('Invalid order type')
    })

    it('throws error for invalid side', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, side: 'invalid' }))
        .rejects.toThrow('Invalid order side')
    })

    it('throws error for zero volume', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, volume: 0 }))
        .rejects.toThrow('Volume must be greater than 0')
    })

    it('throws error for market order without price', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, price: undefined }))
        .rejects.toThrow('Market price is required')
    })

    it('throws error for negative price', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, price: -1 }))
        .rejects.toThrow('Invalid price')
    })

    it('validates buy SL must be below entry', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, stopLoss: 1.10100 }))
        .rejects.toThrow('Stop loss must be below entry price for buy')
    })

    it('validates sell SL must be above entry', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, side: 'sell', stopLoss: 1.09900 }))
        .rejects.toThrow('Stop loss must be above entry price for sell')
    })

    it('validates buy TP must be above entry', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, takeProfit: 1.09900 }))
        .rejects.toThrow('Take profit must be above entry price for buy')
    })

    it('validates sell TP must be below entry', async () => {
      await expect(service.placeOrder('acc1', { ...baseOrder, side: 'sell', takeProfit: 1.10100 }))
        .rejects.toThrow('Take profit must be below entry price for sell')
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
      mockPrisma.order.create.mockResolvedValue({ id: 'order2', ...baseOrder, type: 'limit', status: 'pending' })
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
      symbol: 'EURUSD',
      side: 'buy',
      volume: 1,
      openPrice: 1.10000,
      currentPrice: 1.10500,
      commission: 3.5,
      margin: 1000,
      openTime: new Date(),
      status: 'open',
    }

    it('closes a full position', async () => {
      mockPrisma.position.findFirst.mockResolvedValue(mockPosition)
      mockPrisma.account.findUnique.mockResolvedValue({ id: 'acc1', balance: 10000 })

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

      const result = await service.closePosition('pos1', 'acc1', undefined, 1.11000)
      expect(result.pnl).toBe(1000)
    })
  })

  describe('modifyOrder', () => {
    it('modifies pending order SL/TP', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'ord1', accountId: 'acc1', status: 'pending' })
      mockPrisma.order.update.mockResolvedValue({ id: 'ord1' })

      const result = await service.modifyOrder('ord1', 'acc1', { stopLoss: 1.09000, takeProfit: 1.11000 })
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
      mockPrisma.position.findFirst.mockResolvedValue({ id: 'pos1', accountId: 'acc1', status: 'open', side: 'buy', openPrice: 1.10000 })
      mockPrisma.position.update.mockResolvedValue({ id: 'pos1' })

      const result = await service.modifyPosition('pos1', 'acc1', { stopLoss: 1.09000, takeProfit: 1.11000 })
      expect(result).toBeDefined()
    })

    it('validates buy SL below open', async () => {
      mockPrisma.position.findFirst.mockResolvedValue({ id: 'pos1', accountId: 'acc1', status: 'open', side: 'buy', openPrice: 1.10000 })
      await expect(service.modifyPosition('pos1', 'acc1', { stopLoss: 1.11000 })).rejects.toThrow('Stop loss must be below open price')
    })

    it('validates sell SL above open', async () => {
      mockPrisma.position.findFirst.mockResolvedValue({ id: 'pos1', accountId: 'acc1', status: 'open', side: 'sell', openPrice: 1.10000 })
      await expect(service.modifyPosition('pos1', 'acc1', { stopLoss: 1.09000 })).rejects.toThrow('Stop loss must be above open price')
    })
  })

  describe('getStatistics', () => {
    it('returns empty stats for no trades', async () => {
      mockPrisma.trade.findMany.mockResolvedValue([])

      const stats = await service.getStatistics('acc1')
      expect(stats.totalTrades).toBe(0)
      expect(stats.winRate).toBe(0)
    })

    it('calculates win rate correctly', async () => {
      mockPrisma.trade.findMany.mockResolvedValue([
        { profit: 100 }, { profit: -50 }, { profit: 200 }, { profit: -30 },
      ])

      const stats = await service.getStatistics('acc1')
      expect(stats.totalTrades).toBe(4)
      expect(stats.winRate).toBe(50)
    })

    it('calculates profit factor', async () => {
      mockPrisma.trade.findMany.mockResolvedValue([
        { profit: 200 }, { profit: 300 }, { profit: -100 },
      ])

      const stats = await service.getStatistics('acc1')
      expect(stats.profitFactor).toBe(5)
      expect(stats.averageWin).toBe(250)
      expect(stats.averageLoss).toBe(100)
    })
  })
})
