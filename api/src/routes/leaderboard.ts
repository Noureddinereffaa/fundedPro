import { Router } from 'express'
import { prisma } from '../index.js'

const router = Router()

// GET /api/leaderboard — public, no auth required
router.get('/', async (_req, res) => {
  try {
    // Top traders by profit (accounts that passed or are funded)
    const topTraders = await prisma.trade.groupBy({
      by: ['accountId'],
      _sum: { profit: true },
      _count: { id: true },
      orderBy: { _sum: { profit: 'desc' } },
      take: 20,
    })

    // Get account + user info for each
    const accountIds = topTraders.map((t) => t.accountId)
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: {
        id: true,
        accountSize: true,
        balance: true,
        status: true,
        phase: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            country: true,
          },
        },
      },
    })

    const accountMap = new Map(accounts.map((a) => [a.id, a]))

    // Top payouts
    const topPayouts = await prisma.payoutRequest.findMany({
      where: { status: 'approved' },
      orderBy: { amount: 'desc' },
      take: 10,
      select: {
        amount: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            country: true,
          },
        },
      },
    })

    // Build leaderboard
    const leaderboard = topTraders
      .map((t) => {
        const account = accountMap.get(t.accountId)
        if (!account) return null

        const totalProfit = Number(t._sum.profit || 0)
        const accountSize = Number(account.accountSize)
        const profitPct = accountSize > 0 ? (totalProfit / accountSize) * 100 : 0

        // Mask names for privacy: "John D."
        const firstName = account.user?.firstName || 'Trader'
        const lastName = account.user?.lastName
        const displayName = lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName

        return {
          displayName,
          country: account.user?.country || null,
          totalProfit: Math.round(totalProfit * 100) / 100,
          profitPct: Math.round(profitPct * 100) / 100,
          totalTrades: t._count.id,
          accountSize,
          status: account.status,
          phase: account.phase,
        }
      })
      .filter(Boolean)
      .filter((t: any) => t.totalProfit > 0) // only show profitable traders

    // Platform stats
    const [totalTraders, totalPayouts, totalFunded] = await Promise.all([
      prisma.user.count(),
      prisma.payoutRequest.aggregate({
        where: { status: 'approved' },
        _sum: { amount: true },
      }),
      prisma.account.count({ where: { status: 'funded' } }),
    ])

    res.json({
      leaderboard,
      topPayouts: topPayouts.map((p) => ({
        displayName: p.user?.firstName
          ? `${p.user.firstName} ${p.user.lastName ? p.user.lastName.charAt(0) + '.' : ''}`
          : 'Trader',
        country: p.user?.country || null,
        amount: Number(p.amount),
        date: p.createdAt,
      })),
      stats: {
        totalTraders,
        totalPayouts: Number(totalPayouts._sum.amount || 0),
        totalFunded,
      },
    })
  } catch (error: any) {
    console.error('[Leaderboard] Error:', error.message)
    res.status(500).json({ error: 'Failed to load leaderboard' })
  }
})

export default router
