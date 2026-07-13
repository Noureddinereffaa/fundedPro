import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  auditLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  user: { count: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  account: { count: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  payoutRequest: { count: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  payment: { count: vi.fn(), findMany: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  tradingRuleConfig: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  ruleViolation: { findMany: vi.fn() },
}))

vi.mock('../index.js', () => ({ prisma: mockPrisma }))

import { AuditService } from '../services/audit.js'

describe('AuditService', () => {
  let audit: AuditService

  beforeEach(() => {
    vi.clearAllMocks()
    audit = new AuditService()
  })

  it('logs an action', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log1' })
    await audit.log('admin1', 'approve_payment', 'pay1', { accountSize: 10000 })
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: { adminId: 'admin1', action: 'approve_payment', target: 'pay1', details: { accountSize: 10000 } },
    })
  })

  it('logs without details', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log2' })
    await audit.log('admin1', 'reject_payout', 'payout1')
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: { adminId: 'admin1', action: 'reject_payout', target: 'payout1', details: undefined },
    })
  })
})
