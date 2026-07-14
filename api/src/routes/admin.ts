import { Router } from 'express'
import { prisma } from '../index.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { AppError, getErrorInfo } from '../middleware/errorHandler.js'
import { AuthRequest } from '../types/index.js'
import { AuditService } from '../services/audit.js'
import { validateId } from '../middleware/validateId.js'
import { isSafeUrl, sanitizeText } from '../utils/sanitize.js'
import bcrypt from 'bcryptjs'
import type { Prisma, TradingRuleConfig } from '@prisma/client'

const router = Router()
const audit = new AuditService()

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
      where: { status: { in: ['approved', 'completed'] } },
      _sum: { amount: true },
    })

    res.json({
      totalUsers,
      totalAccounts,
      fundedAccounts,
      pendingPayouts,
      totalRevenue: totalRevenue._sum.amount || 0,
    })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
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
        select: {
          id: true, email: true, firstName: true, lastName: true,
          phone: true, country: true, role: true, kycStatus: true,
          emailVerified: true, createdAt: true, updatedAt: true,
          avatar: true, loginAttempts: true, lockUntil: true,
          _count: { select: { accounts: true } },
        },
      }),
      prisma.user.count(),
    ])

    res.json({ users, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// Update user (whitelisted fields only)
router.put('/users/:id', validateId('id'), async (req: AuthRequest, res) => {
  try {
    const allowed = ['role', 'emailVerified', 'kycStatus', 'firstName', 'lastName', 'phone', 'country']
    const data: Record<string, string | boolean | null | undefined> = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key]
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No valid fields provided' })
    const user = await prisma.user.update({ where: { id: req.params.id }, data: data as Prisma.UserUpdateInput })
    await audit.log(req.user!.id, 'update_user', req.params.id, { fields: Object.keys(data) })
    res.json(user)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
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
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// Update account (whitelisted fields only)
router.put('/accounts/:id', validateId('id'), async (req: AuthRequest, res) => {
  try {
    const allowed = [
      'status',
      'phase',
      'balance',
      'equity',
      'leverage',
      'maxDailyLoss',
      'maxOverallLoss',
      'profitTarget',
    ]
    const data: Record<string, string | number | null | undefined> = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key]
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No valid fields provided' })
    const account = await prisma.account.update({ where: { id: req.params.id }, data: data as Prisma.AccountUpdateInput })
    await audit.log(req.user!.id, 'update_account', req.params.id, { fields: Object.keys(data) })
    res.json(account)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// Process payout (validated status)
router.put('/payouts/:id', validateId('id'), async (req: AuthRequest, res) => {
  try {
    const { status, txHash } = req.body
    if (!status || !['pending', 'approved', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    const data: Record<string, string | Date | undefined> = { status }
    if (status === 'completed' || status === 'rejected') {
      data.processedAt = new Date()
    }
    if (txHash) {
      data.txHash = txHash
    }
    const payout = await prisma.payoutRequest.update({
      where: { id: req.params.id },
      data: data as Prisma.PayoutRequestUpdateInput,
    })
    await audit.log(req.user!.id, `payout_${status}`, req.params.id, txHash ? { txHash } : undefined)
    res.json(payout)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
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
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
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
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// ── Trading Rules Configuration ────────────────────────────────

const ACCOUNT_SIZES = [5000, 10000, 25000, 50000, 100000, 200000]
const PHASES = ['evaluation_1', 'evaluation_2', 'funded']

const RULES_FIELDS = [
  'profitTarget', 'maxDailyLoss', 'maxOverallLoss',
  'maxPositionSize', 'maxLeverage', 'maxOpenTrades',
  'minTradingDays', 'maxTradingDays',
  'commission', 'spreadMarkup',
  'newsRestriction',
] as const

// GET — matrix of all rules for all sizes × phases
router.get('/rules/matrix', async (_req, res) => {
  try {
    const configs = await prisma.tradingRuleConfig.findMany()
    const matrix: Record<string, Record<string, TradingRuleConfig | null>> = {}
    for (const size of ACCOUNT_SIZES) {
      matrix[size] = {}
      for (const phase of PHASES) {
        matrix[size][phase] = configs.find((c) => Number(c.accountSize) === size && c.phase === phase) || null
      }
    }
    res.json({ matrix, sizes: ACCOUNT_SIZES, phases: PHASES })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// GET — load existing config (or return null)
router.get('/rules/:accountSize/:phase', async (req, res) => {
  try {
    const accountSize = Number(req.params.accountSize)
    const { phase } = req.params
    const config = await prisma.tradingRuleConfig.findUnique({
      where: { accountSize_phase: { accountSize, phase } },
    })
    res.json(config || null)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// PUT — upsert trading rules (validated fields only)
router.put('/rules/:accountSize/:phase', async (req: AuthRequest, res) => {
  try {
    const allowed: string[] = [...RULES_FIELDS, 'leverage']
    const data: Record<string, string | number | boolean | null | undefined> = {}
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
    const { applyToExisting } = req.body

    const config = await prisma.tradingRuleConfig.upsert({
      where: { accountSize_phase: { accountSize, phase } },
      update: data as Prisma.TradingRuleConfigUpdateInput,
      create: {
        accountSize,
        phase,
        profitTarget: Number(data.profitTarget ?? 8),
        maxDailyLoss: Number(data.maxDailyLoss ?? 5),
        maxOverallLoss: Number(data.maxOverallLoss ?? 10),
        maxPositionSize: Number(data.maxPositionSize ?? 5),
        maxLeverage: Number(data.maxLeverage ?? 100),
        maxOpenTrades: Number(data.maxOpenTrades ?? 10),
        minTradingDays: Number(data.minTradingDays ?? 5),
        maxTradingDays: Number(data.maxTradingDays ?? 30),
        commission: Number(data.commission ?? 0),
        spreadMarkup: Number(data.spreadMarkup ?? 0),
        newsRestriction: Boolean(data.newsRestriction ?? false),
      },
    })
    
    // If requested, apply changes to all active accounts of this size & phase
    if (applyToExisting) {
      const updateData: Record<string, number> = {}
      if (data.profitTarget !== undefined) updateData.profitTarget = data.profitTarget as number
      if (data.maxDailyLoss !== undefined) updateData.maxDailyLoss = data.maxDailyLoss as number
      if (data.maxOverallLoss !== undefined) updateData.maxOverallLoss = data.maxOverallLoss as number
      if (data.maxPositionSize !== undefined) updateData.maxPositionSize = data.maxPositionSize as number
      if (data.maxOpenTrades !== undefined) updateData.maxOpenTrades = data.maxOpenTrades as number
      if (data.minTradingDays !== undefined) updateData.minTradingDays = data.minTradingDays as number
      if (data.maxTradingDays !== undefined) updateData.maxTradingDays = data.maxTradingDays as number
      if (data.maxLeverage !== undefined) updateData.leverage = data.maxLeverage as number

      if (Object.keys(updateData).length > 0) {
        await prisma.account.updateMany({
          where: {
            accountSize,
            phase,
            status: { in: ['active', 'passed'] }
          },
          data: updateData as Prisma.AccountUpdateManyMutationInput,
        })
      }
    }

    await audit.log(req.user!.id, 'update_rules', `${accountSize}/${phase}`, { fields: Object.keys(data), applyToExisting: !!applyToExisting })
    res.json(config)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
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
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
      prisma.payment.count(),
    ])
    res.json({ payments, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// Approve/reject crypto payment + create account (transactional)
router.put('/payments/:id', validateId('id'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } })
    if (!payment) return res.status(404).json({ error: 'Payment not found' })
    if (payment.status === 'approved') return res.status(400).json({ error: 'Payment already approved' })
    if (payment.status === 'rejected') return res.status(400).json({ error: 'Payment already rejected' })

    if (status === 'approved') {
      const rawMeta = payment.metadata as Record<string, unknown>
      if (!rawMeta?.accountSize || !rawMeta?.accountType) {
        return res.status(400).json({ error: 'Payment metadata missing accountSize/accountType' })
      }

      const meta = rawMeta as { accountSize: number; accountType: string; promoCode?: string }
      const phase = meta.accountType === 'funded' ? 'funded' : 'evaluation_1'

      const result = await prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payment.update({
          where: { id: req.params.id },
          data: { status: 'approved' },
        })

        if (meta.promoCode) {
          await tx.coupon.updateMany({
            where: { code: meta.promoCode.toUpperCase() },
            data: { usedCount: { increment: 1 } }
          })
        }

        const { generateAccountLogin, generateAccountPassword } = await import('../utils/helpers.js')
        const { DEFAULT_RULES, DEFAULT_RULES_BY_SIZE } = await import('../utils/constants.js')

        let rules = await tx.tradingRuleConfig.findUnique({
          where: { accountSize_phase: { accountSize: meta.accountSize, phase } }
        })

        if (!rules) {
          const sizeKey = meta.accountSize as keyof typeof DEFAULT_RULES_BY_SIZE
          const defaultRules = DEFAULT_RULES_BY_SIZE[sizeKey]?.[phase] || DEFAULT_RULES[phase]
          if (!defaultRules) throw new Error('Invalid phase')
          rules = await tx.tradingRuleConfig.create({
            data: {
              accountSize: meta.accountSize,
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

        const account = await tx.account.create({
          data: {
            userId: payment.userId,
            accountType: phase,
            accountSize: meta.accountSize,
            balance: meta.accountSize,
            equity: meta.accountSize,
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

        return { payment: updatedPayment, account }
      })

      await audit.log(req.user!.id, 'approve_payment', req.params.id, { accountSize: meta.accountSize, phase })

      // Send email notification (best-effort)
      try {
        const { EmailService } = await import('../services/email.js')
        const emailService = new EmailService()
        const user = await prisma.user.findUnique({ where: { id: payment.userId } })
        if (user) {
          await emailService.sendAccountCreated(user.email, result.account)
        }
      } catch (_) {}

      res.json(result)
    } else {
      const updated = await prisma.payment.update({
        where: { id: req.params.id },
        data: { status: 'rejected' },
      })
      await audit.log(req.user!.id, 'reject_payment', req.params.id)
      res.json({ payment: updated })
    }
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    console.error('Payment approval failed:', message)
    res.status(statusCode).json({ error: message || 'Failed to process payment' })
  }
})

// GET — audit log
router.get('/audit-log', async (req: AuthRequest, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 50
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { email: true } } },
      }),
      prisma.auditLog.count(),
    ])
    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// ── Coupons ────────────────────────────────────────────────

router.get('/coupons', async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(coupons)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

router.post('/coupons', async (req, res) => {
  try {
    const { code, discountType, discountValue, maxUses, expiresAt } = req.body
    if (!code || !discountValue) throw new AppError('Code and discountValue are required', 400)
    
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType: discountType || 'percentage',
        discountValue: Number(discountValue),
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }
    })
    
    await audit.log((req as AuthRequest).user!.id, 'create_coupon', coupon.id, coupon)
    res.status(201).json(coupon)
  } catch (error: unknown) {
    const errWithCode = error as { code?: string }
    if (errWithCode.code === 'P2002') return res.status(400).json({ error: 'Coupon code already exists' })
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

router.put('/coupons/:id', validateId('id'), async (req, res) => {
  try {
    const { isActive } = req.body
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: { isActive }
    })
    
    await audit.log((req as AuthRequest).user!.id, 'update_coupon', coupon.id, { isActive })
    res.json(coupon)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

router.delete('/coupons/:id', validateId('id'), async (req, res) => {
  try {
    const coupon = await prisma.coupon.delete({
      where: { id: req.params.id }
    })
    
    await audit.log((req as AuthRequest).user!.id, 'delete_coupon', coupon.id, undefined)
    res.json({ message: 'Coupon deleted successfully' })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// ── Settings Management ──────────────────────────────────────────────────────

router.get('/settings', async (_req, res) => {
  try {
    const settings = await prisma.platformSetting.findMany()
    res.json(settings)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

router.put('/settings', async (req, res) => {
  try {
    const { key, value, isPublic, description } = req.body
    if (!key || typeof value !== 'string') throw new AppError('Key and value are required', 400)

    const sanitizedValue = sanitizeText(value, 2000)

    // Validate URLs for keys that represent social/external links
    const URL_KEYS = ['social_telegram', 'social_discord', 'social_twitter', 'social_youtube', 'website_url', 'contact_email']
    if (URL_KEYS.includes(key) && !isSafeUrl(sanitizedValue)) {
      throw new AppError('Invalid URL scheme. Only http/https URLs are allowed.', 400)
    }

    const setting = await prisma.platformSetting.upsert({
      where: { key },
      update: { value: sanitizedValue, isPublic, description: description ? sanitizeText(description, 500) : undefined },
      create: { key, value: sanitizedValue, isPublic, description: description ? sanitizeText(description, 500) : undefined },
    })

    await audit.log((req as AuthRequest).user!.id, 'update_setting', key, { value: sanitizedValue })
    res.json(setting)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// ── Contact Messages ─────────────────────────────────────────────────────────

router.get('/contact-messages', async (_req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(messages)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

router.put('/contact-messages/:id', validateId('id'), async (req, res) => {
  try {
    const { status } = req.body
    if (!status || !['unread', 'read', 'resolved'].includes(status)) {
      throw new AppError('Invalid status', 400)
    }

    const message = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { status }
    })

    res.json(message)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

router.delete('/contact-messages/:id', validateId('id'), async (req, res) => {
  try {
    await prisma.contactMessage.delete({ where: { id: req.params.id } })
    await audit.log((req as AuthRequest).user!.id, 'delete_message', req.params.id, undefined)
    res.json({ message: 'Message deleted' })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

export default router
