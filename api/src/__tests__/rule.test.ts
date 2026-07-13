import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  account: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  position: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  trade: { findMany: vi.fn(), create: vi.fn() },
  order: { findMany: vi.fn() },
  ruleViolation: { create: vi.fn() },
  notification: { create: vi.fn().mockResolvedValue({}) },
  user: { findUnique: vi.fn() },
  tradingRuleConfig: { findUnique: vi.fn(), create: vi.fn() },
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

// Mock fetch for priceClient lookups
vi.stubGlobal('fetch', vi.fn())

import { RuleEngine } from '../services/rule.js'

describe('RuleEngine', () => {
  let engine: RuleEngine

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2023-11-15T12:00:00Z')) // Wednesday
    engine = new RuleEngine()
  })

  describe('checkOrder', () => {
    it('allows a valid market order', async () => {
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

      const result = await engine.checkOrder('acc1', {
        symbol: 'BTCUSDT',
        side: 'buy',
        volume: 0.1,
        price: 30000,
      })
      expect(result.allowed).toBe(true)
    })

    it('rejects if account not active', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        status: 'failed',
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

      const result = await engine.checkOrder('acc1', {
        symbol: 'BTCUSDT',
        side: 'buy',
        volume: 0.1,
        price: 30000,
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('not active')
    })

    it('rejects if max open trades reached', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        status: 'active',
        balance: 10000,
        equity: 10000,
        accountSize: 10000,
        leverage: 100,
        maxPositionSize: 5,
        maxOpenTrades: 2,
        maxDailyLoss: 6,
        maxOverallLoss: 10,
        positions: [{ id: 'p1' }, { id: 'p2' }],
      })

      const result = await engine.checkOrder('acc1', {
        symbol: 'BTCUSDT',
        side: 'buy',
        volume: 0.1,
        price: 30000,
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Maximum open trades')
    })

    it('rejects if position size exceeds max %', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        status: 'active',
        balance: 10000,
        equity: 10000,
        accountSize: 10000,
        leverage: 100,
        maxPositionSize: 1,
        maxOpenTrades: 10,
        maxDailyLoss: 6,
        maxOverallLoss: 10,
        positions: [],
      })

      const result = await engine.checkOrder('acc1', {
        symbol: 'BTCUSDT',
        side: 'buy',
        volume: 10,
        price: 30000,
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('exceeds maximum')
    })

    it('rejects if insufficient free margin', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        status: 'active',
        balance: 1000,
        equity: 1000,
        accountSize: 10000,
        leverage: 10,
        maxPositionSize: 100,
        maxOpenTrades: 10,
        maxDailyLoss: 6,
        maxOverallLoss: 10,
        positions: [],
      })

      const result = await engine.checkOrder('acc1', {
        symbol: 'BTCUSDT',
        side: 'buy',
        volume: 10,
        price: 30000,
      })
      expect(result.allowed).toBe(false)
    })

    it('rejects if no price provided', async () => {
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

      const result = await engine.checkOrder('acc1', { symbol: 'BTCUSDT', side: 'buy', volume: 0.1, price: 0 })
      expect(result.allowed).toBe(false)
    })
  })

  describe('calculateDailyPnL', () => {
    it('sums closed trades and floating PnL', async () => {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      const later = new Date(today.getTime() + 3600000)

      mockPrisma.trade.findMany.mockResolvedValue([
        { profit: 500, closeTime: later },
        { profit: -200, closeTime: later },
      ])
      mockPrisma.position.findMany.mockResolvedValue([{ profit: 100 }])

      const pnl = await engine.calculateDailyPnL('acc1')
      expect(pnl).toBe(400)
    })
  })

  describe('checkAllAccounts', () => {
    it('marks account as failed when overall loss exceeded', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        {
          id: 'acc1',
          status: 'active',
          balance: 8000,
          accountSize: 10000,
          equity: 8000,
          leverage: 100,
          maxPositionSize: 5,
          maxOpenTrades: 10,
          maxDailyLoss: 6,
          maxOverallLoss: 10,
          profitTarget: 8,
          phase: 'evaluation_1',
          positions: [],
        },
      ])

      await engine.checkAllAccounts()
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('marks account as passed when profit target met', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        {
          id: 'acc1',
          status: 'active',
          balance: 11000,
          accountSize: 10000,
          equity: 11000,
          leverage: 100,
          maxPositionSize: 5,
          maxOpenTrades: 10,
          maxDailyLoss: 6,
          maxOverallLoss: 10,
          profitTarget: 8,
          phase: 'evaluation_1',
          positions: [],
        },
      ])

      await engine.checkAllAccounts()
      expect(mockPrisma.account.update).toHaveBeenCalled()
    })
  })

  describe('checkMarginLevels', () => {
    it('triggers stop out when margin level < 50%', async () => {
      vi.useRealTimers()
      ;(globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ BTCUSDT: { price: 29500, change: -0.5, lastUpdated: Date.now(), age: 100 } }),
      })
      mockPrisma.account.findMany.mockResolvedValue([
        {
          id: 'acc1',
          status: 'active',
          balance: 1000,
          accountSize: 10000,
          equity: 1000,
          leverage: 100,
          maxPositionSize: 5,
          maxOpenTrades: 10,
          maxDailyLoss: 6,
          maxOverallLoss: 10,
          profitTarget: 8,
          phase: 'evaluation_1',
          positions: [
            {
              id: 'pos1',
              symbol: 'BTCUSDT',
              side: 'buy',
              volume: 1,
              openPrice: 30000,
              currentPrice: 29500,
              margin: 2000,
              profit: -500,
              swap: 0,
              commission: 0,
              openTime: new Date(),
            },
          ],
        },
      ])
      mockPrisma.position.findMany.mockResolvedValue([
        {
          id: 'pos1',
          accountId: 'acc1',
          symbol: 'BTCUSDT',
          side: 'buy',
          volume: 1,
          openPrice: 30000,
          currentPrice: 29500,
          margin: 2000,
          profit: -500,
          swap: 0,
          commission: 0,
          status: 'open',
          openTime: new Date(),
        },
      ])

      await engine.checkMarginLevels()
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('does nothing if no open positions', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        {
          id: 'acc1',
          status: 'active',
          balance: 10000,
          accountSize: 10000,
          equity: 10000,
          positions: [],
        },
      ])

      await engine.checkMarginLevels()
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })
  })
})
