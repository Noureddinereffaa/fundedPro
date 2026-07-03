import { Router } from 'express'
import { RuleEngine } from '../services/rule.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
const ruleEngine = new RuleEngine()

router.get('/status/:accountId', authenticate, async (req, res) => {
  try {
    const { prisma } = await import('../index.js')
    const account = await prisma.account.findUnique({
      where: { id: req.params.accountId },
      include: { positions: { where: { status: 'open' } } },
    })
    if (!account) return res.status(404).json({ error: 'Account not found' })

    const dailyPnL = await ruleEngine.calculateDailyPnL(req.params.accountId)
    const overallPnL = Number(account.balance) - Number(account.accountSize)
    const dailyLossLimit = Number(account.accountSize) * (Number(account.maxDailyLoss || 6) / 100)
    const overallLossLimit = Number(account.accountSize) * (Number(account.maxOverallLoss || 10) / 100)
    const targetAmount = account.profitTarget ? Number(account.accountSize) * (Number(account.profitTarget) / 100) : null

    const usedMargin = account.positions.reduce((sum: number, p: any) => sum + Number(p.margin), 0)
    const floatingPnl = account.positions.reduce((sum: number, p: any) => sum + Number(p.profit), 0)

    res.json({
      balance: account.balance,
      equity: account.equity,
      dailyPnl: dailyPnL.toFixed(2),
      dailyLossRemaining: (dailyLossLimit + dailyPnL).toFixed(2),
      dailyLossPercent: ((dailyPnL / Number(account.accountSize)) * 100).toFixed(2),
      overallPnl: overallPnL.toFixed(2),
      overallLossRemaining: (overallLossLimit + overallPnL).toFixed(2),
      overallLossPercent: ((overallPnL / Number(account.accountSize)) * 100).toFixed(2),
      profitTarget: account.profitTarget,
      profitTargetProgress: targetAmount ? ((overallPnL / targetAmount) * 100).toFixed(1) : null,
      profitTargetAmount: targetAmount?.toFixed(2),
      openPositions: account.positions.length,
      maxOpenTrades: account.maxOpenTrades,
      usedMargin,
      freeMargin: (Number(account.equity) - usedMargin).toFixed(2),
      floatingPnl: floatingPnl.toFixed(2),
      tradingDaysCount: account.tradingDaysCount,
      minTradingDays: account.minTradingDays,
      status: account.status,
      phase: account.phase,
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
