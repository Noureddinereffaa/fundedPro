import { Router } from 'express'
import { prisma } from '../index.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, authorize('admin'))

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalAccounts, fundedAccounts, pendingPayouts, recentPayments] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.account.count({ where: { status: 'funded' } }),
      prisma.payoutRequest.count({ where: { status: 'pending' } }),
      prisma.payment.count({ where: { status: 'completed' } }),
    ])

    const totalRevenue = await prisma.payment.aggregate({
      where: { status: 'completed' },
      _sum: { amount: true },
    })

    res.json({
      totalUsers,
      totalAccounts,
      fundedAccounts,
      pendingPayouts,
      totalRevenue: totalRevenue._sum.amount || 0,
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// List users
router.get('/users', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { accounts: true } } },
      }),
      prisma.user.count(),
    ])

    res.json({ users, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Update user (whitelisted fields only)
router.put('/users/:id', async (req, res) => {
  try {
    const allowed = ['role', 'emailVerified', 'kycStatus', 'firstName', 'lastName', 'phone', 'country']
    const data: Record<string, any> = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key]
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No valid fields provided' })
    const user = await prisma.user.update({ where: { id: req.params.id }, data })
    res.json(user)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// List all accounts
router.get('/accounts', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const skip = (page - 1) * limit

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
      prisma.account.count(),
    ])

    res.json({ accounts, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Update account (whitelisted fields only)
router.put('/accounts/:id', async (req, res) => {
  try {
    const allowed = ['status', 'phase', 'balance', 'equity', 'leverage', 'maxDailyLoss', 'maxOverallLoss', 'profitTarget']
    const data: Record<string, any> = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key]
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No valid fields provided' })
    const account = await prisma.account.update({ where: { id: req.params.id }, data })
    res.json(account)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Process payout (validated status)
router.put('/payouts/:id', async (req, res) => {
  try {
    const { status } = req.body
    if (!status || !['pending', 'approved', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    const payout = await prisma.payoutRequest.update({
      where: { id: req.params.id },
      data: { status, processedAt: status === 'completed' ? new Date() : undefined },
    })
    res.json(payout)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// List payouts
router.get('/payouts', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const skip = (page - 1) * limit

    const [payouts, total] = await Promise.all([
      prisma.payoutRequest.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } }, account: { select: { accountSize: true } } },
      }),
      prisma.payoutRequest.count(),
    ])

    res.json({ payouts, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Rule violations
router.get('/violations', async (req, res) => {
  try {
    const violations = await prisma.ruleViolation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        account: { select: { accountSize: true, status: true } },
      },
    })
    res.json(violations)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Update trading rules (validated fields only)
router.put('/rules/:accountSize/:phase', async (req, res) => {
  try {
    const allowed = ['maxDailyLoss', 'maxOverallLoss', 'profitTarget', 'maxPositionSize', 'maxOpenTrades', 'minTradingDays', 'maxTradingDays', 'maxLeverage', 'leverage']
    const data: Record<string, any> = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key]
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No valid fields provided' })

    // Normalize 'leverage' alias → maxLeverage
    if (data.leverage !== undefined && data.maxLeverage === undefined) {
      data.maxLeverage = data.leverage
      delete data.leverage
    }

    const accountSize = Number(req.params.accountSize)
    const { phase } = req.params

    const config = await prisma.tradingRuleConfig.upsert({
      where: { accountSize_phase: { accountSize, phase } },
      update: data,
      create: {
        accountSize,
        phase,
        // Required fields — use provided values or safe defaults
        profitTarget:    data.profitTarget    ?? 8,
        maxDailyLoss:    data.maxDailyLoss    ?? 5,
        maxOverallLoss:  data.maxOverallLoss  ?? 10,
        maxPositionSize: data.maxPositionSize ?? 5,
        maxLeverage:     data.maxLeverage     ?? 100,
        maxOpenTrades:   data.maxOpenTrades   ?? 10,
        minTradingDays:  data.minTradingDays  ?? 5,
        maxTradingDays:  data.maxTradingDays  ?? 30,
      },
    })
    res.json(config)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})


// List crypto payments
router.get('/payments', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const skip = (page - 1) * limit

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
      prisma.payment.count(),
    ])
    res.json({ payments, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Approve/reject crypto payment + create account
router.put('/payments/:id', async (req, res) => {
  try {
    const { status } = req.body
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } })
    if (!payment) return res.status(404).json({ error: 'Payment not found' })

    const updated = await prisma.payment.update({
      where: { id: req.params.id }, data: { status },
    })

    if (status === 'approved' && payment.metadata) {
      const meta = payment.metadata as any
      if (meta.accountSize && meta.accountType) {
        const { AccountService } = await import('../services/account.js')
        const accountService = new AccountService()
        const phase = meta.accountType === 'funded' ? 'funded' : 'evaluation_1'
        await accountService.purchaseAccount(payment.userId, meta.accountSize, phase)
      }
    }

    res.json(updated)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
