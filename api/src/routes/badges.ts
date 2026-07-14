import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { BadgeService } from '../services/badge.js'
import type { AuthRequest } from '../types/index.js'
import { getErrorInfo } from '../middleware/errorHandler.js'

const router = Router()
const badgeService = new BadgeService()

// GET /api/badges — list all badges with user progress
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const badges = await badgeService.getAllBadges(req.user!.id)
    res.json(badges)
  } catch (error: unknown) {
    const { message } = getErrorInfo(error)
    console.error('[Badges] Error:', message)
    res.status(500).json({ error: 'Failed to load badges' })
  }
})

// GET /api/badges/user — current user's earned badges
router.get('/user', authenticate, async (req: AuthRequest, res) => {
  try {
    const badges = await badgeService.getUserBadges(req.user!.id)
    res.json(badges)
  } catch (error: unknown) {
    const { message } = getErrorInfo(error)
    console.error('[Badges] Error:', message)
    res.status(500).json({ error: 'Failed to load user badges' })
  }
})

// POST /api/badges/check — evaluate & award badges (called after trades/account changes)
router.post('/check', authenticate, async (req: AuthRequest, res) => {
  try {
    const { totalTrades, totalProfit, winStreak, tradingDays, passedEvaluation, funded, payoutCount, cleanDays } = req.body
    const awarded = await badgeService.checkAndAward(req.user!.id, {
      totalTrades: totalTrades ?? 0,
      totalProfit: totalProfit ?? 0,
      winStreak: winStreak ?? 0,
      tradingDays: tradingDays ?? 0,
      passedEvaluation: passedEvaluation ?? false,
      funded: funded ?? false,
      payoutCount: payoutCount ?? 0,
      cleanDays: cleanDays ?? 0,
    })
    res.json({ awarded })
  } catch (error: unknown) {
    const { message } = getErrorInfo(error)
    console.error('[Badges] Check error:', message)
    res.status(500).json({ error: 'Failed to check badges' })
  }
})

// POST /api/badges/seed — seed default badges (dev/admin)
router.post('/seed', authenticate, authorize('admin'), async (_req, res) => {
  try {
    await badgeService.seedDefaultBadges()
    res.json({ message: 'Default badges seeded' })
  } catch (error: unknown) {
    const { message } = getErrorInfo(error)
    console.error('[Badges] Seed error:', message)
    res.status(500).json({ error: 'Failed to seed badges' })
  }
})

// Admin: CRUD
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const badge = await badgeService.createBadge(req.body)
    res.status(201).json(badge)
  } catch (error: unknown) {
    const { message } = getErrorInfo(error)
    console.error('[Badges] Create error:', message)
    res.status(500).json({ error: 'Failed to create badge' })
  }
})

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const badge = await badgeService.updateBadge(req.params.id, req.body)
    res.json(badge)
  } catch (error: unknown) {
    const { message } = getErrorInfo(error)
    console.error('[Badges] Update error:', message)
    res.status(500).json({ error: 'Failed to update badge' })
  }
})

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await badgeService.deleteBadge(req.params.id)
    res.json({ message: 'Badge deleted' })
  } catch (error: unknown) {
    const { message } = getErrorInfo(error)
    console.error('[Badges] Delete error:', message)
    res.status(500).json({ error: 'Failed to delete badge' })
  }
})

export default router
