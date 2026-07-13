import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  account: { findFirst: vi.fn(), findUnique: vi.fn() },
  trade: { findMany: vi.fn() },
  payoutRequest: { aggregate: vi.fn(), findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  payment: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn() },
}))

vi.mock('../index.js', () => ({ prisma: mockPrisma }))
vi.mock('../config/index.js', () => ({ config: { BTC_WALLET: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' } }))

import { PaymentService } from '../services/payment.js'
import { PROFIT_SPLIT } from '../utils/constants.js'

describe('PaymentService', () => {
  let svc: PaymentService

  beforeEach(() => {
    vi.clearAllMocks()
    svc = new PaymentService()
  })

  describe('getMaxPayout', () => {
    it('subtracts previous payouts from max payout', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1', status: 'funded' })
      mockPrisma.trade.findMany.mockResolvedValue([
        { profit: 10000 }, { profit: 2000 }, { profit: -3000 },
      ])
      mockPrisma.payoutRequest.aggregate.mockResolvedValue({ _sum: { amount: 2000 } })

      const result = await svc.getMaxPayout('u1', 'a1')
      // netProfit = 10000+2000-3000 = 9000, totalPaidOut = 2000, available = 7000, maxPayout = 7000 * 0.8 = 5600
      expect(result.maxPayout).toBe(5600)
      expect(result.totalPaidOut).toBe(2000)
      expect(result.netProfit).toBe(9000)
    })

    it('returns 0 when payouts exceed net profit', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1', status: 'funded' })
      mockPrisma.trade.findMany.mockResolvedValue([{ profit: 1000 }, { profit: -500 }])
      mockPrisma.payoutRequest.aggregate.mockResolvedValue({ _sum: { amount: 3000 } })

      const result = await svc.getMaxPayout('u1', 'a1')
      expect(result.maxPayout).toBe(0)
      expect(result.totalPaidOut).toBe(3000)
    })

    it('throws for non-funded account', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null)
      await expect(svc.getMaxPayout('u1', 'a1')).rejects.toThrow('Account not found or not funded')
    })
  })

  describe('requestPayout', () => {
    it('rejects if pending payout exists', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1', status: 'funded' })
      mockPrisma.payoutRequest.findFirst.mockResolvedValue({ id: 'pending1' })
      await expect(svc.requestPayout('u1', 'a1', 100)).rejects.toThrow('already pending')
    })
  })
})
