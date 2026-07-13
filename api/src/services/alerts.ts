import { prisma } from '../index.js'

export const AlertService = {
  async create(data: {
    userId: string
    symbol: string
    condition: 'above' | 'below'
    price: number
    message?: string
  }) {
    return prisma.alert.create({ data })
  },

  async list(userId: string) {
    return prisma.alert.findMany({
      where: { userId, status: { not: 'deleted' } },
      orderBy: { createdAt: 'desc' },
    })
  },

  async getById(id: string, userId: string) {
    return prisma.alert.findFirst({ where: { id, userId } })
  },

  async delete(id: string, userId: string) {
    return prisma.alert.update({
      where: { id },
      data: { status: 'deleted' },
    })
  },

  async trigger(id: string) {
    return prisma.alert.update({
      where: { id },
      data: { status: 'triggered', triggeredAt: new Date() },
    })
  },

  async getActiveAlerts() {
    return prisma.alert.findMany({ where: { status: 'active' } })
  },
}

export const NotificationService = {
  async create(data: {
    userId: string
    type: string
    title: string
    message?: string
    data?: unknown
    link?: string
  }) {
    return prisma.notification.create({ data: data as any })
  },

  async list(userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  },

  async markRead(id: string, userId: string) {
    return prisma.notification.update({
      where: { id },
      data: { read: true },
    })
  },

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })
  },

  async getUnreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, read: false } })
  },
}
