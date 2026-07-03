import { prisma } from '../index.js'
import { AppError } from '../middleware/errorHandler.js'
import { generateAccountLogin, generateAccountPassword, paginate, getPaginationMeta } from '../utils/helpers.js'
import { ACCOUNT_PRICES, DEFAULT_RULES } from '../utils/constants.js'
import { Phase, AccountStatus } from '../types/index.js'

export class AccountService {
  async getAccounts(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit)
    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip, take,
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

    const rules = DEFAULT_RULES[phase]
    if (!rules) throw new AppError('Invalid phase', 400)

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
        startDate: new Date(),
        login: generateAccountLogin(),
        password: generateAccountPassword(),
      },
    })

    return { account, price }
  }

  async updateBalance(accountId: string, pnl: number) {
    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) throw new AppError('Account not found', 404)

    const newBalance = Number(account.balance) + pnl
    const newEquity = Number(account.equity) + pnl

    return prisma.account.update({
      where: { id: accountId },
      data: { balance: newBalance, equity: newEquity },
    })
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
    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) return
    return prisma.account.update({
      where: { id: accountId },
      data: { tradingDaysCount: account.tradingDaysCount + 1 },
    })
  }

  async getDailySnapshots(accountId: string, days: number = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    return prisma.dailySnapshot.findMany({
      where: { accountId, date: { gte: since } },
      orderBy: { date: 'asc' },
    })
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
