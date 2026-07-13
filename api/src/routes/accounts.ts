import { Router } from 'express'
import { z } from 'zod'
import { AccountService } from '../services/account.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'
import { AppError } from '../middleware/errorHandler.js'

const purchaseSchema = z.object({
  accountSize: z.number().positive(),
  accountType: z.enum(['evaluation', 'evaluation_1', 'funded']).transform((v) => v === 'evaluation' ? 'evaluation_1' : v),
})

const router = Router()
const accountService = new AccountService()

// Portfolio summary
router.get('/summary', authenticate, async (req: AuthRequest, res) => {
  try {
    const summary = await accountService.getPortfolioSummary(req.user!.id)
    res.json(summary)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Portfolio equity history
router.get('/summary/equity', authenticate, async (req: AuthRequest, res) => {
  try {
    const days = Number(req.query.days) || 90
    const history = await accountService.getPortfolioEquityHistory(req.user!.id, days)
    res.json(history)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get all accounts
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const result = await accountService.getAccounts(req.user!.id, page, limit)
    res.json(result)
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500
    res.status(statusCode).json({ error: error.message })
  }
})

// Get account by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const account = await accountService.getAccount(req.params.id, req.user!.id)
    res.json(account)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Purchase account (creates payment intent)
router.post('/purchase', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountSize, accountType } = purchaseSchema.parse(req.body)
    const result = await accountService.purchaseAccount(req.user!.id, accountSize, accountType)
    res.json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message })
    }
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Get daily snapshots
router.get('/:id/snapshots', authenticate, async (req: AuthRequest, res) => {
  try {
    const days = Number(req.query.days) || 30
    const snapshots = await accountService.getDailySnapshots(req.params.id, days)
    res.json(snapshots)
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500
    res.status(statusCode).json({ error: error.message })
  }
})

export default router
