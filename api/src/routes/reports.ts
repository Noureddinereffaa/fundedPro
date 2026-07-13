import { Router } from 'express'
import { ReportService } from '../services/report.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'
import { verifyAccountOwnership } from '../utils/ownership.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()
const reportService = new ReportService()

router.get('/daily/:accountId', authenticate, async (req: AuthRequest, res) => {
  try {
    await verifyAccountOwnership(req.params.accountId, req.user!.id)
    const date = req.query.date ? new Date(req.query.date as string) : new Date()
    const report = await reportService.getDailyReport(req.params.accountId, date)
    res.json(report)
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500
    res.status(statusCode).json({ error: error.message })
  }
})

router.get('/equity/:accountId', authenticate, async (req: AuthRequest, res) => {
  try {
    await verifyAccountOwnership(req.params.accountId, req.user!.id)
    const days = Number(req.query.days) || 30
    const curve = await reportService.getEquityCurve(req.params.accountId, days)
    res.json(curve)
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500
    res.status(statusCode).json({ error: error.message })
  }
})

router.get('/stats/:accountId', authenticate, async (req: AuthRequest, res) => {
  try {
    await verifyAccountOwnership(req.params.accountId, req.user!.id)
    const stats = await reportService.getPerformanceStats(req.params.accountId)
    res.json(stats)
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500
    res.status(statusCode).json({ error: error.message })
  }
})

router.get('/symbols/:accountId', authenticate, async (req: AuthRequest, res) => {
  try {
    await verifyAccountOwnership(req.params.accountId, req.user!.id)
    const breakdown = await reportService.getSymbolBreakdown(req.params.accountId)
    res.json(breakdown)
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500
    res.status(statusCode).json({ error: error.message })
  }
})

export default router
