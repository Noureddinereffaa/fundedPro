import { Router } from 'express'
import { AccountService } from '../services/account.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'

const router = Router()
const accountService = new AccountService()

// Get all accounts
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const result = await accountService.getAccounts(req.user!.id, page, limit)
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
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
    const { accountSize, accountType } = req.body
    const result = await accountService.purchaseAccount(req.user!.id, accountSize, accountType)
    res.json(result)
  } catch (error: any) {
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
    res.status(500).json({ error: error.message })
  }
})

export default router
