import { Router } from 'express'
import { RuleEngine } from '../services/rule.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'
import { verifyAccountOwnership } from '../utils/ownership.js'
import { AppError, getErrorInfo } from '../middleware/errorHandler.js'
import { validateId } from '../middleware/validateId.js'

const router = Router()
const ruleEngine = new RuleEngine()

// ── Helper: compute risk status for a single account row ──────────────────
function buildRiskStatus(account: any, dailyPnL: number) {
  const dailyLossLimit   = Number(account.accountSize) * (Number(account.maxDailyLoss  || 6) / 100)
  const overallLossLimit = Number(account.accountSize) * (Number(account.maxOverallLoss || 10) / 100)
  const overallPnL       = Number(account.balance) - Number(account.accountSize)
  const targetAmount     = account.profitTarget
    ? Number(account.accountSize) * (Number(account.profitTarget) / 100)
    : null

  const usedMargin   = account.positions.reduce((s: number, p: any) => s + Number(p.margin),  0)
  const floatingPnl  = account.positions.reduce((s: number, p: any) => s + Number(p.profit),  0)

  return {
    balance: account.balance,
    equity:  account.equity,
    dailyPnl: dailyPnL.toFixed(2),
    dailyLossRemaining:  (dailyLossLimit   + dailyPnL).toFixed(2),
    dailyLossPercent:    ((dailyPnL        / Number(account.accountSize)) * 100).toFixed(2),
    overallPnl:          overallPnL.toFixed(2),
    overallLossRemaining:(overallLossLimit + overallPnL).toFixed(2),
    overallLossPercent:  ((overallPnL      / Number(account.accountSize)) * 100).toFixed(2),
    profitTarget:        account.profitTarget,
    profitTargetProgress:targetAmount ? ((overallPnL / targetAmount) * 100).toFixed(1) : null,
    profitTargetAmount:  targetAmount?.toFixed(2),
    openPositions:       account.positions.length,
    maxOpenTrades:       account.maxOpenTrades,
    usedMargin,
    freeMargin:          (Number(account.equity) - usedMargin).toFixed(2),
    floatingPnl:         floatingPnl.toFixed(2),
    tradingDaysCount:    account.tradingDaysCount,
    minTradingDays:      account.minTradingDays,
    status: account.status,
    phase:  account.phase,
  }
}

// ── GET /risk/status/:accountId — single account ──────────────────────────
router.get('/status/:accountId', authenticate, validateId('accountId'), async (req: AuthRequest, res) => {
  try {
    await verifyAccountOwnership(req.params.accountId, req.user!.id)
    const { prisma } = await import('../index.js')
    const account = await prisma.account.findUnique({
      where: { id: req.params.accountId },
      include: { positions: { where: { status: 'open' } } },
    })
    if (!account) return res.status(404).json({ error: 'Account not found' })

    const dailyPnL = await ruleEngine.calculateDailyPnL(req.params.accountId)
    res.json(buildRiskStatus(account, dailyPnL))
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// ── GET /risk/batch — all accounts for the current user in ONE query ──────
// Eliminates the N+1 problem in the Dashboard where each AccountCard
// fired its own /risk/status request.
router.get('/batch', authenticate, async (req: AuthRequest, res) => {
  try {
    const { prisma } = await import('../index.js')
    const accounts = await prisma.account.findMany({
      where: { userId: req.user!.id },
      include: { positions: { where: { status: 'open' } } },
    })

    // Compute daily PnL for all accounts in parallel
    const dailyPnLs = await Promise.allSettled(
      accounts.map((a) => ruleEngine.calculateDailyPnL(a.id)),
    )

    const result: Record<string, ReturnType<typeof buildRiskStatus>> = {}
    for (let i = 0; i < accounts.length; i++) {
      const settled = dailyPnLs[i]
      const dailyPnL = settled.status === 'fulfilled' ? settled.value : 0
      result[accounts[i].id] = buildRiskStatus(accounts[i], dailyPnL)
    }

    res.json(result)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

export default router

