import bcrypt from 'bcryptjs'
import { prisma } from '../index.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  generateAccountLogin,
  generateAccountPassword,
  paginate,
  getPaginationMeta,
} from '../utils/helpers.js'
import { ACCOUNT_PRICES, DEFAULT_RULES, DEFAULT_RULES_BY_SIZE } from '../utils/constants.js'
import { Phase, AccountStatus } from '../types/index.js'

export class AccountService {
  async getAccounts(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit)
    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.account.count({ where: { userId } }),
    ])
    return { data: accounts, pagination: getPaginationMeta(total, page, limit) }
  }

  async getAccount(accountId: string, userId: string) {
    const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
    if (!account) throw new AppError('Account not found', 404)
    return account
  }

  async purchaseAccount(userId: string, accountSize: number, phase: Phase) {
    const price = ACCOUNT_PRICES[accountSize]?.[phase === 'funded' ? 'instant' : 'evaluation']
    if (!price) throw new AppError('Invalid account size', 400)

    let rules = await prisma.tradingRuleConfig.findUnique({
      where: { accountSize_phase: { accountSize, phase } }
    })

    if (!rules) {
      const defaultRules = DEFAULT_RULES_BY_SIZE[accountSize]?.[phase] || DEFAULT_RULES[phase]
      if (!defaultRules) throw new AppError('Invalid phase', 400)
      rules = await prisma.tradingRuleConfig.create({
        data: {
          accountSize,
          phase,
          profitTarget: defaultRules.profitTarget ?? 8,
          maxDailyLoss: defaultRules.maxDailyLoss ?? 5,
          maxOverallLoss: defaultRules.maxOverallLoss ?? 10,
          maxPositionSize: defaultRules.maxPositionSize ?? 5,
          maxLeverage: defaultRules.maxLeverage ?? 100,
          maxOpenTrades: defaultRules.maxOpenTrades ?? 10,
          minTradingDays: defaultRules.minTradingDays ?? 5,
          maxTradingDays: defaultRules.maxTradingDays ?? 30,
        }
      })
    }

    const plainPassword = generateAccountPassword()
    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    const account = await prisma.account.create({
      data: {
        userId,
        accountType: phase,
        accountSize,
        balance: accountSize,
        equity: accountSize,
        phase,
        profitTarget: rules.profitTarget,
        maxDailyLoss: rules.maxDailyLoss,
        maxOverallLoss: rules.maxOverallLoss,
        maxPositionSize: rules.maxPositionSize,
        maxOpenTrades: rules.maxOpenTrades,
        minTradingDays: rules.minTradingDays,
        maxTradingDays: rules.maxTradingDays,
        leverage: rules.maxLeverage,
        startDate: new Date(),
        login: generateAccountLogin(),
        password: hashedPassword,
      },
    })

    return { account, price, plainPassword }
  }

  async updateBalance(accountId: string, pnl: number) {
    try {
      return await prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: pnl }, equity: { increment: pnl } },
      })
    } catch {
      throw new AppError('Account not found', 404)
    }
  }

  async updateEquity(accountId: string, equity: number) {
    return prisma.account.update({
      where: { id: accountId },
      data: { equity },
    })
  }

  async updateStatus(accountId: string, status: AccountStatus) {
    const data: any = { status }
    if (status === 'passed') data.passedAt = new Date()
    if (status === 'failed') data.failedAt = new Date()
    return prisma.account.update({ where: { id: accountId }, data })
  }

  async incrementTradingDays(accountId: string) {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { lastTradingDay: true },
      })
      const now = new Date()
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      if (account?.lastTradingDay) {
        const lastDay = new Date(account.lastTradingDay)
        const lastDayUTC = new Date(Date.UTC(lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate()))
        if (lastDayUTC.getTime() === today.getTime()) return
      }
      return await prisma.account.update({
        where: { id: accountId },
        data: {
          tradingDaysCount: { increment: 1 },
          lastTradingDay: now,
        },
      })
    } catch {
      return
    }
  }

  async getDailySnapshots(accountId: string, days: number = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    return prisma.dailySnapshot.findMany({
      where: { accountId, date: { gte: since } },
      orderBy: { date: 'asc' },
    })
  }

  async getPortfolioSummary(userId: string) {
    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        positions: {
          where: { status: 'open' },
          select: { margin: true, profit: true, volume: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    let totalBalance = 0
    let totalEquity = 0
    let totalMarginUsed = 0
    let totalFloatingPnl = 0
    let totalOpenPositions = 0
    let fundedAccounts = 0

    for (const acc of accounts) {
      totalBalance += Number(acc.balance)
      totalEquity += Number(acc.equity)
      for (const pos of acc.positions) {
        totalMarginUsed += Number(pos.margin)
        totalFloatingPnl += Number(pos.profit)
        totalOpenPositions++
      }
      if (acc.phase === 'funded') fundedAccounts++
    }

    return {
      totalBalance,
      totalEquity,
      totalFloatingPnl,
      totalMarginUsed,
      totalFreeMargin: totalEquity - totalMarginUsed,
      totalOpenPositions,
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((a) => a.status === 'active').length,
      fundedAccounts,
      accounts,
    }
  }

  async getPortfolioEquityHistory(userId: string, days: number = 90) {
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { id: true },
    })

    const since = new Date()
    since.setDate(since.getDate() - days)

    const snapshots = await prisma.dailySnapshot.findMany({
      where: {
        accountId: { in: accounts.map((a) => a.id) },
        date: { gte: since },
      },
      orderBy: { date: 'asc' },
    })

    const aggregated: Record<string, { balance: number; equity: number; margin: number }> = {}
    for (const s of snapshots) {
      const key = s.date.toISOString().slice(0, 10)
      if (!aggregated[key]) aggregated[key] = { balance: 0, equity: 0, margin: 0 }
      aggregated[key].balance += Number(s.balance)
      aggregated[key].equity += Number(s.equity)
      aggregated[key].margin += Number(s.margin || 0)
    }

    return Object.entries(aggregated)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }))
  }

  async takeSnapshot(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { positions: { where: { status: 'open' } } },
    })
    if (!account) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const floatingPnl = account.positions.reduce((sum: number, p: any) => sum + Number(p.profit), 0)
    const usedMargin = account.positions.reduce((sum: number, p: any) => sum + Number(p.margin), 0)

    return prisma.dailySnapshot.upsert({
      where: { accountId_date: { accountId, date: today } },
      update: {
        balance: account.balance,
        equity: account.equity,
        openPositions: account.positions.length,
        margin: usedMargin,
        freeMargin: Number(account.equity) - usedMargin,
      },
      create: {
        accountId,
        date: today,
        balance: account.balance,
        equity: account.equity,
        dailyPnl: floatingPnl,
        totalPnl: Number(account.balance) - Number(account.accountSize),
        openPositions: account.positions.length,
        margin: usedMargin,
        freeMargin: Number(account.equity) - usedMargin,
      },
    })
  }
}
