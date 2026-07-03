import { prisma } from '../index.js'
import { AppError } from '../middleware/errorHandler.js'
import { calculatePnL, calculateMargin } from '../utils/helpers.js'

export class RuleEngine {
  async checkOrder(accountId: string, orderData: {
    symbol: string
    side: string
    volume: number
    price?: number
  }): Promise<{ allowed: boolean; reason?: string }> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { positions: { where: { status: 'open' } } },
    })
    if (!account) return { allowed: false, reason: 'Account not found' }
    if (account.status !== 'active') return { allowed: false, reason: 'Account is not active' }

    if (account.maxOpenTrades && account.positions.length >= account.maxOpenTrades) {
      return { allowed: false, reason: `Maximum open trades reached (${account.maxOpenTrades})` }
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
    const overallLossLimit = Number(account.accountSize) * (Number(account.maxOverallLoss || 10) / 100)
    if (overallPnL < -overallLossLimit) {
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
    const overallPnL = (Number(account.balance) + floatingPnl) - Number(account.accountSize)

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
        await this.closePosition(pos.id, 'rule_breach')
      }
    })
  }

  async closePosition(positionId: string, reason: string) {
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: { account: true },
    })
    if (!position) return

    const exitPrice = Number(position.currentPrice || position.openPrice)
    const pnl = calculatePnL(position.side, Number(position.openPrice), exitPrice, Number(position.volume), position.symbol)

    await prisma.$transaction(async (tx) => {
      await tx.position.update({
        where: { id: positionId },
        data: {
          status: 'closed',
          closeTime: new Date(),
          closePrice: exitPrice,
          closeReason: reason,
          profit: pnl,
        },
      })

      await tx.trade.create({
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
      await tx.account.update({
        where: { id: position.accountId },
        data: { balance: newBalance, equity: newBalance },
      })
    })
  }

  private async markAccountPassed(accountId: string) {
    await prisma.account.update({
      where: { id: accountId },
      data: {
        status: 'passed',
        passedAt: new Date(),
        phase: 'funded',
        profitTarget: undefined,
        minTradingDays: undefined,
        maxTradingDays: undefined,
      },
    })
  }

  async checkAllAccounts(): Promise<void> {
    const activeAccounts = await prisma.account.findMany({
      where: { status: 'active' },
      include: { positions: { where: { status: 'open' } } },
    })

    for (const account of activeAccounts) {
      const floatingPnl = account.positions.reduce((sum: number, p: any) => sum + Number(p.profit), 0)
      const overallPnL = (Number(account.balance) + floatingPnl) - Number(account.accountSize)
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

      if (account.phase !== 'funded' && account.profitTarget && overallPnL > 0) {
        const targetAmount = Number(account.accountSize) * (Number(account.profitTarget) / 100)
        if (overallPnL >= targetAmount) {
          await this.markAccountPassed(account.id)
        }
      }
    }
  }

  async checkMarginLevels() {
    const activeAccounts = await prisma.account.findMany({
      where: { status: 'active' },
      include: { positions: { where: { status: 'open' } } },
    })

    for (const account of activeAccounts) {
      if (account.positions.length === 0) continue

      const usedMargin = account.positions.reduce((sum, p) => sum + Number(p.margin), 0)
      if (usedMargin <= 0) continue

      // Calculate floating PnL using position currentPrice
      const floatingPnl = account.positions.reduce((sum, p) => {
        if (!p.currentPrice) return sum
        return sum + calculatePnL(p.side, Number(p.openPrice), Number(p.currentPrice), Number(p.volume), p.symbol)
      }, 0)

      const equity = Number(account.balance) + floatingPnl
      if (equity <= 0) {
        await this.triggerMarginStopOut(account, 'equity_exhausted')
        continue
      }

      const marginLevel = (equity / usedMargin) * 100

      // Stop Out: margin level < 50%
      if (marginLevel < 50) {
        await this.triggerMarginStopOut(account, 'stop_out')
        continue
      }

      // Margin Call: margin level < 100%
      if (marginLevel < 100) {
        await this.triggerMarginCall(account, marginLevel, floatingPnl)
      }
    }
  }

  private async triggerMarginCall(account: any, marginLevel: number, floatingPnl: number) {
    await prisma.ruleViolation.create({
      data: {
        accountId: account.id,
        ruleType: 'margin_call',
        description: `Margin call: level=${marginLevel.toFixed(1)}%, floating=${floatingPnl.toFixed(2)}`,
        violationData: { marginLevel, floatingPnl },
      },
    }).catch(() => {})
    console.log(`[MarginCall] Account ${account.id}: margin level ${marginLevel.toFixed(1)}%`)
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
        const exitPrice = Number(pos.currentPrice || pos.openPrice)
        const pnl = calculatePnL(pos.side, Number(pos.openPrice), exitPrice, Number(pos.volume), pos.symbol)

        await tx.position.update({
          where: { id: pos.id },
          data: {
            status: 'closed',
            closeTime: new Date(),
            closePrice: exitPrice,
            closeReason: reason,
            profit: pnl,
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

      const newBalance = Number(account.balance) + account.positions.reduce((sum: number, pos: any) => {
        const exitPrice = Number(pos.currentPrice || pos.openPrice)
        return sum + calculatePnL(pos.side, Number(pos.openPrice), exitPrice, Number(pos.volume), pos.symbol)
      }, 0)
      await tx.account.update({
        where: { id: account.id },
        data: { balance: newBalance, equity: newBalance },
      })
    })
    console.log(`[StopOut] Account ${account.id}: ${reason} – all positions closed`)
  }
}
