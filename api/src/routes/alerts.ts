import { Router } from 'express'
import { AlertService, NotificationService } from '../services/alerts.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'
import { z } from 'zod'

const router = Router()

const createAlertSchema = z.object({
  symbol: z.string().min(1),
  condition: z.enum(['above', 'below']),
  price: z.number().positive(),
  message: z.string().optional(),
})

// ── CRUD ──────────────────────────────────────────────────────

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const body = createAlertSchema.parse(req.body)
    const alert = await AlertService.create({ ...body, userId: req.user!.id })
    res.json(alert)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Failed to create alert' })
  }
})

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const alerts = await AlertService.list(req.user!.id)
    res.json(alerts)
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' })
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    await AlertService.delete(req.params.id, req.user!.id)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete alert' })
  }
})

// ── Notifications ─────────────────────────────────────────────

router.get('/notifications', authenticate, async (req: AuthRequest, res) => {
  try {
    const notifications = await NotificationService.list(req.user!.id)
    const unreadCount = await NotificationService.getUnreadCount(req.user!.id)
    res.json({ notifications, unreadCount })
  } catch {
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

router.put('/notifications/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    await NotificationService.markRead(req.params.id, req.user!.id)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to mark notification read' })
  }
})

router.put('/notifications/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    await NotificationService.markAllRead(req.user!.id)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to mark all read' })
  }
})

export default router
