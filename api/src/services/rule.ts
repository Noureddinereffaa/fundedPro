import { prisma } from '../index.js'
import { AppError } from '../middleware/errorHandler.js'
import { calculatePnL, calculateMargin, isMarketOpen } from '../utils/helpers.js'
import { PriceSnapshotClient } from '../utils/priceClient.js'

const priceClient = new PriceSnapshotClient()
// EmailService loaded lazily to avoid config validation at import time in tests
const TZ_OFFSET = Number(process.env.SERVER_TIMEZONE_OFFSET) || 3
let _EmailService: any = null
async function getEmailService() {
  if (!_EmailService) {
    const mod = await import('./email.js')
    _EmailService = mod.EmailService
  }
  return new _EmailService()
}

export class RuleEngine {
  async checkOrder(
    accountId: string,
    orderData: {
      symbol: string
      side: string
      volume: number
      price?: number
    },
  ): Promise<{ allowed: boolean; reason?: string }> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { positions: { where: { status: 'open' } } },
    })
    if (!account) return { allowed: false, reason: 'Account not found' }
    if (account.status !== 'active' && account.status !== 'passed') return { allowed: false, reason: 'Account is not active' }

    if (account.maxOpenTrades && account.positions.length >= account.maxOpenTrades) {
      return { allowed: false, reason: `Maximum open trades reached (${account.maxOpenTrades})` }
    }

    if (!isMarketOpen(orderData.symbol)) {
      return { allowed: false, reason: 'Market is currently closed' }
    }

    if (account.maxTradingDays && account.tradingDaysCount >= account.maxTradingDays) {
      return { allowed: false, reason: `Maximum trading days reached (${account.maxTradingDays})` }
    }

    const executionPrice = orderData.price ?? 0
    if (executionPrice <= 0) return { allowed: false, reason: 'Invalid price' }

    const margin = calculateMargin(orderData.volume, executionPrice, account.leverage, orderData.symbol)
    const maxSize = Number(account.accountSize) * (Number(account.maxPositionSize || 5) / 100)
    if (margin > maxSize) {
      return { allowed: false, reason: `Position size exceeds maximum (${account.maxPositionSize}%)` }
    }

    const dailyPnL = await this.calculateDailyPnL(accountId)
    const dailyLossLimit = Number(account.accountSize) * (Number(account.maxDailyLoss || 6) / 100)
    if (dailyPnL < -dailyLossLimit) {
      return { allowed: false, reason: 'Daily loss limit reached' }
    }

    const overallPnL = Number(account.balance) - Number(account.accountSize)
    let floatingPnl = 0
    for (const p of account.positions) {
      try {
        const snapshot = await priceClient.getSinglePrice(p.symbol)
        const livePrice = snapshot?.price ?? Number(p.currentPrice) ?? Number(p.openPrice)
        floatingPnl += calculatePnL(p.side, Number(p.openPrice), livePrice, Number(p.volume), p.symbol)
      } catch {
        floatingPnl += Number(p.profit) || 0
      }
    }
    const totalEquity = Number(account.balance) + floatingPnl
    const overallWithFloating = totalEquity - Number(account.accountSize)
    const overallLossLimit = Number(account.accountSize) * (Number(account.maxOverallLoss || 10) / 100)
    if (overallWithFloating < -overallLossLimit) {
      return { allowed: false, reason: 'Overall loss limit reached' }
    }

    const usedMargin = account.positions.reduce((sum: number, p: any) => sum + Number(p.margin), 0) + margin
    const freeMargin = Number(account.equity) - usedMargin
    if (freeMargin < 0) {
      return { allowed: false, reason: 'Insufficient margin' }
    }

    return { allowed: true }
  }

  async checkPosition(accountId: string, positionId: string): Promise<void> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { positions: { where: { status: 'open' } } },
    })
    if (!account || account.status !== 'active') return

    const dailyPnL = await this.calculateDailyPnL(accountId)
    const floatingPnl = account.positions.reduce((sum: number, p: any) => sum + Number(p.profit), 0)
    const overallPnL = Number(account.balance) + floatingPnl - Number(account.accountSize)

    const dailyLossLimit = Number(account.accountSize) * (Number(account.maxDailyLoss || 6) / 100)
    if (dailyPnL < -dailyLossLimit) {
      await this.triggerViolation(accountId, 'max_daily_loss', { dailyPnL, limit: dailyLossLimit })
      return
    }

    const overallLossLimit = Number(account.accountSize) * (Number(account.maxOverallLoss || 10) / 100)
    if (overallPnL < -overallLossLimit) {
      await this.triggerViolation(accountId, 'max_overall_loss', { overallPnL, limit: overallLossLimit })
      return
    }

    if (account.phase !== 'funded' && account.profitTarget && overallPnL > 0) {
      if (account.minTradingDays && (account.tradingDaysCount ?? 0) < account.minTradingDays) return
      const targetAmount = Number(account.accountSize) * (Number(account.profitTarget) / 100)
      if (overallPnL >= targetAmount) {
        await this.markAccountPassed(accountId)
      }
    }
  }

  async calculateDailyPnL(accountId: string): Promise<number> {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const trades = await prisma.trade.findMany({
      where: {
        accountId,
        closeTime: { gte: today },
      },
    })

    const closedPnL = trades.reduce((sum: number, t: any) => sum + Number(t.profit), 0)

    const positions = await prisma.position.findMany({
      where: { accountId, status: 'open' },
    })
    const floatingPnl = positions.reduce((sum: number, p: any) => sum + Number(p.profit), 0)

    return closedPnL + floatingPnl
  }

  private async getUserEmail(accountId: string): Promise<string | null> {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { userId: true },
      })
      if (!account) return null
      const user = await prisma.user.findUnique({
        where: { id: account.userId },
        select: { email: true },
      })
      return user?.email ?? null
    } catch {
      return null
    }
  }

  private async triggerViolation(accountId: string, ruleType: string, data: any) {
    await prisma.$transaction(async (tx) => {
      await tx.ruleViolation.create({
        data: {
          accountId,
          ruleType,
          description: `Rule violation: ${ruleType}`,
          violationData: data,
        },
      })

      await tx.account.update({
        where: { id: accountId },
        data: { status: 'failed', failedAt: new Date() },
      })

      const positions = await tx.position.findMany({
        where: { accountId, status: 'open' },
      })
      for (const pos of positions) {
        await this.closePosition(pos.id, 'rule_breach', tx)
      }
    })

    const email = await this.getUserEmail(accountId)
    if (email) {
      const emailService = await getEmailService()
      emailService.sendViolation(email, accountId, ruleType).catch(() => {})
    }
    const acc = await prisma.account.findUnique({ where: { id: accountId }, select: { userId: true } })
    if (acc) {
      await prisma.notification.create({
        data: {
          userId: acc.userId,
          type: 'rule_violation',
          title: `Trading Violation: ${ruleType}`,
          message: `Your account has been flagged for violating trading rules: ${ruleType}`,
        },
      }).catch(() => {})
    }
  }

  async closePosition(positionId: string, reason: string, tx?: any) {
    const position = await (tx || prisma).position.findUnique({
      where: { id: positionId },
      include: { account: true },
    })
    if (!position) return

    let exitPrice = Number(position.currentPrice || position.openPrice)
    try {
      const snapshot = await priceClient.getSinglePrice(position.symbol)
      if (snapshot?.price && snapshot.price > 0) {
        exitPrice = snapshot.price
      }
    } catch { /* keep fallback price */ }
    const pnl = calculatePnL(
      position.side,
      Number(position.openPrice),
      exitPrice,
      Number(position.volume),
      position.symbol,
    )

    const exec = tx || prisma
    if (tx) {
      // Called from within an existing transaction — reuse it
      await exec.position.update({
        where: { id: positionId },
        data: {
          status: 'closed',
          closeTime: new Date(),
          closePrice: exitPrice,
          closeReason: reason,
          profit: pnl,
        },
      })

      await exec.trade.create({
        data: {
          accountId: position.accountId,
          positionId: position.id,
          symbol: position.symbol,
          side: position.side,
          volume: position.volume,
          openPrice: position.openPrice,
          closePrice: exitPrice,
          profit: pnl,
          swap: position.swap,
          commission: position.commission,
          duration: Math.floor((Date.now() - position.openTime.getTime()) / 1000),
          openTime: position.openTime,
          closeTime: new Date(),
          closeReason: reason,
        },
      })

      const newBalance = Number(position.account.balance) + pnl
      await exec.account.update({
        where: { id: position.accountId },
        data: { balance: newBalance, equity: newBalance },
      })
    } else {
      // Standalone call — wrap in a fresh transaction
      await prisma.$transaction(async (innerTx) => {
        await innerTx.position.update({
          where: { id: positionId },
          data: {
            status: 'closed',
            closeTime: new Date(),
            closePrice: exitPrice,
            closeReason: reason,
            profit: pnl,
          },
        })

        await innerTx.trade.create({
          data: {
            accountId: position.accountId,
            positionId: position.id,
            symbol: position.symbol,
            side: position.side,
            volume: position.volume,
            openPrice: position.openPrice,
            closePrice: exitPrice,
            profit: pnl,
            swap: position.swap,
            commission: position.commission,
            duration: Math.floor((Date.now() - position.openTime.getTime()) / 1000),
            openTime: position.openTime,
            closeTime: new Date(),
            closeReason: reason,
          },
        })

        const newBalance = Number(position.account.balance) + pnl
        await innerTx.account.update({
          where: { id: position.accountId },
          data: { balance: newBalance, equity: newBalance },
        })
      })
    }
  }

  private async getEval2Rules(accountSize: number) {
    let rules = await prisma.tradingRuleConfig.findUnique({
      where: { accountSize_phase: { accountSize, phase: 'evaluation_2' } }
    })
    
    if (!rules) {
      const { DEFAULT_RULES_BY_SIZE, DEFAULT_RULES } = await import('../utils/constants.js')
      const defaultRules = DEFAULT_RULES_BY_SIZE[accountSize as keyof typeof DEFAULT_RULES_BY_SIZE]?.evaluation_2 || DEFAULT_RULES['evaluation_2']
      if (defaultRules) {
        rules = await prisma.tradingRuleConfig.create({
          data: {
            accountSize,
            phase: 'evaluation_2',
            profitTarget: defaultRules.profitTarget ?? 5,
            maxDailyLoss: defaultRules.maxDailyLoss ?? 5,
            maxOverallLoss: defaultRules.maxOverallLoss ?? 10,
            maxPositionSize: defaultRules.maxPositionSize ?? 5,
            maxLeverage: defaultRules.maxLeverage ?? 100,
            maxOpenTrades: defaultRules.maxOpenTrades ?? 10,
            minTradingDays: defaultRules.minTradingDays ?? 5,
            maxTradingDays: defaultRules.maxTradingDays ?? 60,
          }
        })
      }
    }
    return rules
  }

  private async getFundedRules(accountSize: number) {
    let rules = await prisma.tradingRuleConfig.findUnique({
      where: { accountSize_phase: { accountSize, phase: 'funded' } }
    })
    
    if (!rules) {
      const { DEFAULT_RULES_BY_SIZE, DEFAULT_RULES } = await import('../utils/constants.js')
      const defaultRules = DEFAULT_RULES_BY_SIZE[accountSize as keyof typeof DEFAULT_RULES_BY_SIZE]?.funded || DEFAULT_RULES['funded']
      if (defaultRules) {
        rules = await prisma.tradingRuleConfig.create({
          data: {
            accountSize,
            phase: 'funded',
            profitTarget: defaultRules.profitTarget ?? 0,
            maxDailyLoss: defaultRules.maxDailyLoss ?? 5,
            maxOverallLoss: defaultRules.maxOverallLoss ?? 10,
            maxPositionSize: defaultRules.maxPositionSize ?? 10,
            maxLeverage: defaultRules.maxLeverage ?? 100,
            maxOpenTrades: defaultRules.maxOpenTrades ?? 15,
            minTradingDays: defaultRules.minTradingDays ?? 0,
            maxTradingDays: defaultRules.maxTradingDays ?? 0,
          }
        })
      }
    }
    return rules
  }

  private async markAccountPassed(accountId: string) {
    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) return

    if (account.minTradingDays && (account.tradingDaysCount ?? 0) < account.minTradingDays) return

    if (account.phase === 'evaluation_1') {
      const eval2 = await this.getEval2Rules(Number(account.accountSize))
      await prisma.account.update({
        where: { id: accountId },
        data: {
          phase: 'evaluation_2',
          profitTarget: eval2?.profitTarget ?? 5,
          maxDailyLoss: eval2?.maxDailyLoss ?? 6,
          maxOverallLoss: eval2?.maxOverallLoss ?? 10,
          maxPositionSize: eval2?.maxPositionSize ?? 5,
          maxOpenTrades: eval2?.maxOpenTrades ?? 10,
          minTradingDays: eval2?.minTradingDays ?? 5,
          maxTradingDays: eval2?.maxTradingDays ?? 60,
          leverage: eval2?.maxLeverage ?? 100,
        },
      })
    } else {
      const funded = await this.getFundedRules(Number(account.accountSize))
      await prisma.account.update({
        where: { id: accountId },
        data: {
          status: 'passed',
          passedAt: new Date(),
          phase: 'funded',
          profitTarget: null,
          maxDailyLoss: funded?.maxDailyLoss ?? 5,
          maxOverallLoss: funded?.maxOverallLoss ?? 10,
          maxPositionSize: funded?.maxPositionSize ?? 10,
          maxOpenTrades: funded?.maxOpenTrades ?? 15,
          minTradingDays: null,
          maxTradingDays: null,
          leverage: funded?.maxLeverage ?? 100,
        },
      })
    }
  }

  async checkAllAccounts(): Promise<void> {
    const activeAccounts = await prisma.account.findMany({
      where: { status: { in: ['active', 'passed'] } },
      include: { positions: { where: { status: 'open' } } },
    })

    for (const account of activeAccounts) {
      const floatingPnl = account.positions.reduce((sum: number, p: any) => sum + Number(p.profit), 0)
      const overallPnL = Number(account.balance) + floatingPnl - Number(account.accountSize)
      const overallLossLimit = Number(account.accountSize) * (Number(account.maxOverallLoss || 10) / 100)

      if (overallPnL < -overallLossLimit) {
        await prisma.$transaction(async (tx) => {
          await tx.account.update({
            where: { id: account.id },
            data: { status: 'failed', failedAt: new Date() },
          })
          for (const pos of account.positions) {
            await this.closePosition(pos.id, 'rule_breach')
          }
        })
        continue
      }

      const dailyPnL = await this.calculateDailyPnL(account.id)
      const dailyLossLimit = Number(account.accountSize) * (Number(account.maxDailyLoss || 6) / 100)
      if (dailyPnL < -dailyLossLimit) {
        await this.triggerViolation(account.id, 'max_daily_loss', { dailyPnL, limit: dailyLossLimit })
        continue
      }

      if (account.phase !== 'funded' && account.profitTarget && overallPnL > 0) {
        const targetAmount = Number(account.accountSize) * (Number(account.profitTarget) / 100)
        if (overallPnL >= targetAmount) {
          if (!account.minTradingDays || (account.tradingDaysCount ?? 0) >= account.minTradingDays) {
            await this.markAccountPassed(account.id)
          }
        }
      }
    }
  }

  async checkMarginLevels() {
    const activeAccounts = await prisma.account.findMany({
      where: { status: { in: ['active', 'passed'] } },
      include: { positions: { where: { status: 'open' } } },
    })

    for (const account of activeAccounts) {
      if (account.positions.length === 0) continue

      const usedMargin = account.positions.reduce((sum, p) => sum + Number(p.margin), 0)
      if (usedMargin <= 0) continue

      // Use the pre-calculated profit which already includes the correct quoteToUsdRate from the MatchingEngine
      const floatingPnl = account.positions.reduce((sum, p) => sum + Number(p.profit || 0), 0)

      const equity = Number(account.balance) + floatingPnl
      if (equity <= 0) {
        await this.triggerMarginStopOut(account, 'equity_exhausted')
        continue
      }

      const marginLevel = (equity / usedMargin) * 100

      // Stop Out: margin level < 50%
      if (marginLevel < 50) {
        await this.triggerPartialStopOut(account)
        continue
      }

      // Margin Call: margin level < 100%
      if (marginLevel < 100) {
        await this.triggerMarginCall(account, marginLevel, floatingPnl)
      }
    }
  }

  private async triggerMarginCall(account: any, marginLevel: number, floatingPnl: number) {
    await prisma.ruleViolation
      .create({
        data: {
          accountId: account.id,
          ruleType: 'margin_call',
          description: `Margin call: level=${marginLevel.toFixed(1)}%, floating=${floatingPnl.toFixed(2)}`,
          violationData: { marginLevel, floatingPnl },
        },
      })
      .catch(() => {})
    console.log(`[MarginCall] Account ${account.id}: margin level ${marginLevel.toFixed(1)}%`)

    const email = await this.getUserEmail(account.id)
    if (email) {
      const emailService = await getEmailService()
      emailService.sendMarginCall(email, account.id, marginLevel).catch(() => {})
    }
    await prisma.notification.create({
      data: {
        userId: account.userId,
        type: 'margin_call',
        title: '⚠️ Margin Call',
        message: `Margin level at ${marginLevel.toFixed(1)}%. Please add funds or close positions.`,
      },
    }).catch(() => {})
  }

  private async triggerPartialStopOut(account: any) {
    if (!account.positions || account.positions.length === 0) return

    // Find the position with the largest loss
    let largestLoser = account.positions[0]
    let maxLoss = Number(largestLoser.profit || 0)

    for (const pos of account.positions) {
      const profit = Number(pos.profit || 0)
      if (profit < maxLoss) {
        maxLoss = profit
        largestLoser = pos
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.ruleViolation.create({
        data: {
          accountId: account.id,
          ruleType: 'partial_stop_out',
          description: `Partial Stop Out: closed largest loser ${largestLoser.symbol}`,
          violationData: { positionId: largestLoser.id, loss: maxLoss },
        },
      })

      let exitPrice = Number(largestLoser.currentPrice || largestLoser.openPrice)
      try {
        const snapshot = await priceClient.getSinglePrice(largestLoser.symbol)
        if (snapshot?.price && snapshot.price > 0) {
          exitPrice = snapshot.price
        }
      } catch { /* keep fallback */ }

      await tx.position.update({
        where: { id: largestLoser.id },
        data: {
          status: 'closed',
          closeTime: new Date(),
          closePrice: exitPrice,
          closeReason: 'margin_stop_out',
        },
      })

      await tx.trade.create({
        data: {
          accountId: account.id,
          positionId: largestLoser.id,
          symbol: largestLoser.symbol,
          side: largestLoser.side,
          volume: largestLoser.volume,
          openPrice: largestLoser.openPrice,
          closePrice: exitPrice,
          profit: maxLoss, // Use the already calculated PnL
          swap: largestLoser.swap,
          commission: largestLoser.commission,
          duration: Math.floor((Date.now() - largestLoser.openTime.getTime()) / 1000),
          openTime: largestLoser.openTime,
          closeTime: new Date(),
          closeReason: 'margin_stop_out',
        },
      })

      const newBalance = Number(account.balance) + maxLoss
      await tx.account.update({
        where: { id: account.id },
        data: { balance: newBalance }, // Equity is dynamic
      })
    })
    console.log(
      `[StopOut] Account ${account.id}: Partial Stop Out – closed ${largestLoser.symbol} with ${maxLoss} loss`,
    )

    const email = await this.getUserEmail(account.id)
    if (email) {
      const emailService = await getEmailService()
      emailService.sendViolation(email, account.id, 'partial_stop_out').catch(() => {})
    }
    await prisma.notification.create({
      data: {
        userId: account.userId,
        type: 'partial_stop_out',
        title: '⚠️ Partial Stop Out',
        message: `Position ${largestLoser.symbol} closed due to margin stop out. Loss: ${maxLoss.toFixed(2)}`,
      },
    }).catch(() => {})
  }

  private async triggerMarginStopOut(account: any, reason: string) {
    await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: account.id },
        data: { status: 'failed', failedAt: new Date() },
      })

      await tx.ruleViolation.create({
        data: {
          accountId: account.id,
          ruleType: 'stop_out',
          description: `Stop out triggered: ${reason}`,
          violationData: { reason },
        },
      })

      const positions = await tx.position.findMany({
        where: { accountId: account.id, status: 'open' },
      })
      for (const pos of positions) {
        let exitPrice = Number(pos.currentPrice || pos.openPrice)
        try {
          const snapshot = await priceClient.getSinglePrice(pos.symbol)
          if (snapshot?.price && snapshot.price > 0) {
            exitPrice = snapshot.price
          }
        } catch { /* keep fallback */ }
        const pnl = Number(pos.profit || 0)

        await tx.position.update({
          where: { id: pos.id },
          data: {
            status: 'closed',
            closeTime: new Date(),
            closePrice: exitPrice,
            closeReason: reason,
          },
        })

        await tx.trade.create({
          data: {
            accountId: account.id,
            positionId: pos.id,
            symbol: pos.symbol,
            side: pos.side,
            volume: pos.volume,
            openPrice: pos.openPrice,
            closePrice: exitPrice,
            profit: pnl,
            swap: pos.swap,
            commission: pos.commission,
            duration: Math.floor((Date.now() - pos.openTime.getTime()) / 1000),
            openTime: pos.openTime,
            closeTime: new Date(),
            closeReason: reason,
          },
        })
      }

      const newBalance =
        Number(account.balance) +
        account.positions.reduce((sum: number, pos: any) => sum + Number(pos.profit || 0), 0)
      await tx.account.update({
        where: { id: account.id },
        data: { balance: newBalance },
      })
    })
    console.log(`[StopOut] Account ${account.id}: ${reason} – all positions closed`)

    const email = await this.getUserEmail(account.id)
    if (email) {
      const emailService = await getEmailService()
      emailService.sendViolation(email, account.id, `stop_out:${reason}`).catch(() => {})
    }
    await prisma.notification.create({
      data: {
        userId: account.userId,
        type: 'stop_out',
        title: '🚫 Stop Out',
        message: `All positions closed due to stop out: ${reason}`,
      },
    }).catch(() => {})
  }
}
