import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  alert: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  notification: { create: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
}))

vi.mock('../index.js', () => ({ prisma: mockPrisma }))

import { AlertService, NotificationService } from '../services/alerts.js'

describe('AlertService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('creates an alert', async () => {
    mockPrisma.alert.create.mockResolvedValue({ id: 'a1', userId: 'u1', symbol: 'EURUSD', condition: 'above', price: 1.1, message: 'Test' })
    const result = await AlertService.create({ userId: 'u1', symbol: 'EURUSD', condition: 'above', price: 1.1, message: 'Test' })
    expect(result.id).toBe('a1')
  })

  it('gets active alerts', async () => {
    mockPrisma.alert.findMany.mockResolvedValue([{ id: 'a1' }])
    const alerts = await AlertService.getActiveAlerts()
    expect(alerts).toHaveLength(1)
    expect(mockPrisma.alert.findMany).toHaveBeenCalledWith({ where: { status: 'active' } })
  })

  it('triggers an alert', async () => {
    mockPrisma.alert.update.mockResolvedValue({ id: 'a1' })
    await AlertService.trigger('a1')
    expect(mockPrisma.alert.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { status: 'triggered', triggeredAt: expect.any(Date) },
    })
  })
})

describe('NotificationService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('creates a notification', async () => {
    mockPrisma.notification.create.mockResolvedValue({ id: 'n1' })
    const n = await NotificationService.create({ userId: 'u1', type: 'alert_triggered', title: 'Alert!' })
    expect(n.id).toBe('n1')
  })

  it('marks notification as read', async () => {
    mockPrisma.notification.update.mockResolvedValue({ id: 'n1', read: true })
    await NotificationService.markRead('n1', 'u1')
    expect(mockPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { read: true },
    })
  })
})
