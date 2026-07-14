import { prisma } from '../index.js'
import type { Prisma } from '@prisma/client'

type BadgeCriteria = { type: string; value: number }
type DefaultBadgeDef = { key: string; category: string; tier: number; name: string; description: string; icon: string; criteria: BadgeCriteria }

const DEFAULT_BADGES: DefaultBadgeDef[] = [
  // ── Progression ──
  { key: 'passed_evaluation', category: 'progression', tier: 2, name: 'Passed Evaluation', description: 'Successfully passed an evaluation phase', icon: '📜', criteria: { type: 'passed_evaluation', value: 1 } },
  { key: 'funded', category: 'progression', tier: 3, name: 'Funded Trader', description: 'Achieved funded trader status', icon: '💰', criteria: { type: 'funded', value: 1 } },
  { key: 'first_payout', category: 'progression', tier: 3, name: 'First Payout', description: 'Received your first profit payout', icon: '💸', criteria: { type: 'payout', value: 1 } },
  // ── Volume ──
  { key: 'first_trade', category: 'volume', tier: 1, name: 'First Trade', description: 'Placed your first trade', icon: '🎯', criteria: { type: 'trades_count', value: 1 } },
  { key: 'trades_10', category: 'volume', tier: 1, name: '10 Trades', description: 'Executed 10 trades', icon: '📊', criteria: { type: 'trades_count', value: 10 } },
  { key: 'trades_100', category: 'volume', tier: 2, name: '100 Trades', description: 'Executed 100 trades', icon: '📈', criteria: { type: 'trades_count', value: 100 } },
  { key: 'trades_1000', category: 'volume', tier: 3, name: '1,000 Trades', description: 'Executed 1,000 trades', icon: '🚀', criteria: { type: 'trades_count', value: 1000 } },
  // ── Profit ──
  { key: 'profit_1k', category: 'profit', tier: 1, name: '$1K Profit', description: 'Reached $1,000 in total profit', icon: '🪙', criteria: { type: 'profit', value: 1000 } },
  { key: 'profit_10k', category: 'profit', tier: 2, name: '$10K Profit', description: 'Reached $10,000 in total profit', icon: '🥇', criteria: { type: 'profit', value: 10000 } },
  { key: 'profit_100k', category: 'profit', tier: 4, name: '$100K Profit', description: 'Reached $100,000 in total profit', icon: '👑', criteria: { type: 'profit', value: 100000 } },
  // ── Streak ──
  { key: 'win_streak_3', category: 'streak', tier: 1, name: '3 Wins', description: 'Achieved 3 consecutive winning trades', icon: '🔥', criteria: { type: 'win_streak', value: 3 } },
  { key: 'win_streak_5', category: 'streak', tier: 2, name: '5 Wins', description: 'Achieved 5 consecutive winning trades', icon: '🔥', criteria: { type: 'win_streak', value: 5 } },
  { key: 'win_streak_10', category: 'streak', tier: 3, name: '10 Wins', description: 'Achieved 10 consecutive winning trades', icon: '💎', criteria: { type: 'win_streak', value: 10 } },
  // ── Risk ──
  { key: 'perfect_day', category: 'risk', tier: 1, name: 'Perfect Day', description: 'Completed a trading day with no violations', icon: '✅', criteria: { type: 'no_violations', value: 1 } },
  { key: 'risk_master_30', category: 'risk', tier: 3, name: '30 Days Clean', description: '30 consecutive days with no rule violations', icon: '🛡️', criteria: { type: 'no_violations', value: 30 } },
  // ── Consistency ──
  { key: 'week_warrior', category: 'consistency', tier: 1, name: 'Week Warrior', description: 'Traded for 7 days', icon: '📅', criteria: { type: 'trading_days', value: 7 } },
  { key: 'month_trader', category: 'consistency', tier: 2, name: 'Monthly Trader', description: 'Traded for 30 days', icon: '📅', criteria: { type: 'trading_days', value: 30 } },
  { key: 'veteran', category: 'consistency', tier: 4, name: 'Veteran', description: 'Traded for 90 days', icon: '🏅', criteria: { type: 'trading_days', value: 90 } },
]

export class BadgeService {
  async seedDefaultBadges(): Promise<void> {
    for (const badge of DEFAULT_BADGES) {
      await prisma.badge.upsert({
        where: { key: badge.key },
        update: { name: badge.name, description: badge.description, icon: badge.icon, tier: badge.tier, category: badge.category, criteria: badge.criteria as Prisma.InputJsonValue },
        create: badge as Prisma.BadgeCreateInput,
      })
    }
  }

  async getAllBadges(userId?: string): Promise<any[]> {
    const badges = await prisma.badge.findMany({ orderBy: [{ category: 'asc' }, { tier: 'asc' }] })
    if (!userId) return badges
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    })
    const ubMap = new Map(userBadges.map((ub) => [ub.badgeId, ub]))
    return badges.map((b) => ({
      ...b,
      progress: ubMap.get(b.id)?.progress ?? 0,
      unlocked: ubMap.get(b.id)?.unlocked ?? false,
      unlockedAt: ubMap.get(b.id)?.unlockedAt ?? null,
      userBadge: ubMap.get(b.id) ?? null,
    }))
  }

  async getUserBadges(userId: string): Promise<any[]> {
    return prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { unlockedAt: 'desc' },
    })
  }

  async checkAndAward(userId: string, stats: {
    totalTrades: number
    totalProfit: number
    winStreak: number
    tradingDays: number
    passedEvaluation: boolean
    funded: boolean
    payoutCount: number
    cleanDays: number
  }): Promise<string[]> {
    const awarded: string[] = []
    const checks: Array<{ key: string; current: number }> = [
      ...DEFAULT_BADGES
        .filter((b) => b.criteria.type === 'trades_count')
        .map((b) => ({ key: b.key, current: stats.totalTrades })),
      ...DEFAULT_BADGES
        .filter((b) => b.criteria.type === 'profit')
        .map((b) => ({ key: b.key, current: stats.totalProfit })),
      ...DEFAULT_BADGES
        .filter((b) => b.criteria.type === 'win_streak')
        .map((b) => ({ key: b.key, current: stats.winStreak })),
      ...DEFAULT_BADGES
        .filter((b) => b.criteria.type === 'trading_days')
        .map((b) => ({ key: b.key, current: stats.tradingDays })),
      ...DEFAULT_BADGES
        .filter((b) => b.criteria.type === 'no_violations')
        .map((b) => ({ key: b.key, current: stats.cleanDays })),
    ]
    if (stats.passedEvaluation) {
      const b = DEFAULT_BADGES.find((b) => b.key === 'passed_evaluation')
      if (b) checks.push({ key: b.key, current: 1 })
    }
    if (stats.funded) {
      const b = DEFAULT_BADGES.find((b) => b.key === 'funded')
      if (b) checks.push({ key: b.key, current: 1 })
    }
    if (stats.payoutCount > 0) {
      const b = DEFAULT_BADGES.find((b) => b.key === 'first_payout')
      if (b) checks.push({ key: b.key, current: stats.payoutCount })
    }

    for (const check of checks) {
      const badgeDef = DEFAULT_BADGES.find((b) => b.key === check.key)
      if (!badgeDef) continue
      const badge = await prisma.badge.findUnique({ where: { key: check.key } })
      if (!badge) continue
      const target = badgeDef.criteria.value
      const progress = Math.min(check.current / target, 1)
      const unlocked = progress >= 1
      const existing = await prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
      })
      if (existing) {
        if (existing.unlocked) continue
        if (existing.progress !== progress || existing.unlocked !== unlocked) {
          await prisma.userBadge.update({
            where: { id: existing.id },
            data: { progress, unlocked, unlockedAt: unlocked ? new Date() : null, metadata: { currentValue: check.current, targetValue: target } },
          })
          if (unlocked) awarded.push(badge.key)
        }
      } else {
        await prisma.userBadge.create({
          data: { userId, badgeId: badge.id, progress, unlocked, unlockedAt: unlocked ? new Date() : null, metadata: { currentValue: check.current, targetValue: target } },
        })
        if (unlocked) awarded.push(badge.key)
      }
    }
    return awarded
  }

  async createBadge(data: DefaultBadgeDef): Promise<Prisma.BadgeGetPayload<{}>> {
    return prisma.badge.create({ data: data as Prisma.BadgeCreateInput })
  }

  async updateBadge(id: string, data: Partial<DefaultBadgeDef>): Promise<Prisma.BadgeGetPayload<{}>> {
    return prisma.badge.update({ where: { id }, data: data as Prisma.BadgeUpdateInput })
  }

  async deleteBadge(id: string): Promise<void> {
    await prisma.userBadge.deleteMany({ where: { badgeId: id } })
    await prisma.badge.delete({ where: { id } })
  }
}
