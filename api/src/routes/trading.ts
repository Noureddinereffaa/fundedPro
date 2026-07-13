import { Router } from 'express'
import { z } from 'zod'
import { TradingService } from '../services/trading.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'
import { verifyAccountOwnership } from '../utils/ownership.js'
import { AppError } from '../middleware/errorHandler.js'
import { PriceSnapshotClient } from '../utils/priceClient.js'
import { validateId } from '../middleware/validateId.js'

const router = Router()
const tradingService = new TradingService()
const priceClient = new PriceSnapshotClient()

const placeOrderSchema = z.object({
  accountId: z.string().min(1),
  symbol: z.string().min(1).max(20),
  type: z.enum(['market', 'limit', 'stop']),
  side: z.enum(['buy', 'sell']),
  volume: z.number().positive(),
  price: z.number().positive().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
})

const modifyOrderSchema = z.object({
  accountId: z.string().min(1),
  price: z.number().positive().optional(),
  stopLoss: z.number().nullish(),
  takeProfit: z.number().nullish(),
})

const cancelOrderSchema = z.object({
  accountId: z.string().min(1),
})

const modifyPositionSchema = z.object({
  accountId: z.string().min(1),
  stopLoss: z.number().nullish(),
  takeProfit: z.number().nullish(),
})

const closePositionSchema = z.object({
  accountId: z.string().min(1),
  volume: z.number().optional(),
})

// Place order
router.post('/order', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountId, ...orderData } = placeOrderSchema.parse(req.body)
    await verifyAccountOwnership(accountId, req.user!.id)
    const result = await tradingService.placeOrder(accountId, orderData)
    res.json(result)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Modify order
router.put('/order/:id', authenticate, validateId('id'), async (req: AuthRequest, res) => {
  try {
    const { accountId, ...modifications } = modifyOrderSchema.parse(req.body)
    await verifyAccountOwnership(accountId, req.user!.id)
    const result = await tradingService.modifyOrder(req.params.id, accountId, modifications)
    res.json(result)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Cancel order
router.delete('/order/:id', authenticate, validateId('id'), async (req: AuthRequest, res) => {
  try {
    const { accountId } = cancelOrderSchema.parse(req.body)
    await verifyAccountOwnership(accountId, req.user!.id)
    await tradingService.cancelOrder(req.params.id, accountId)
    res.json({ message: 'Order cancelled' })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Get open positions
router.get('/positions/:accountId', authenticate, validateId('accountId'), async (req: AuthRequest, res) => {
  try {
    await verifyAccountOwnership(req.params.accountId, req.user!.id)
    const positions = await tradingService.getOpenPositions(req.params.accountId)
    res.json(positions)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Get pending orders
router.get('/orders/:accountId', authenticate, validateId('accountId'), async (req: AuthRequest, res) => {
  try {
    await verifyAccountOwnership(req.params.accountId, req.user!.id)
    const orders = await tradingService.getPendingOrders(req.params.accountId)
    res.json(orders)
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500
    res.status(statusCode).json({ error: error.message })
  }
})

// Modify position (SL/TP)
router.put('/position/:id', authenticate, validateId('id'), async (req: AuthRequest, res) => {
  try {
    const { accountId, ...modifications } = modifyPositionSchema.parse(req.body)
    await verifyAccountOwnership(accountId, req.user!.id)
    const result = await tradingService.modifyPosition(req.params.id, accountId, modifications)
    res.json(result)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Close position (price fetched server-side only)
router.post('/position/:id/close', authenticate, validateId('id'), async (req: AuthRequest, res) => {
  try {
    const { accountId, volume } = closePositionSchema.parse(req.body)
    await verifyAccountOwnership(accountId, req.user!.id)

    const result = await tradingService.closePosition(req.params.id, accountId, volume)
    res.json(result)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Close all positions
router.post('/positions/:accountId/close-all', authenticate, validateId('accountId'), async (req: AuthRequest, res) => {
  try {
    const { accountId } = req.params
    await verifyAccountOwnership(accountId, req.user!.id)
    const results = await tradingService.closeAllPositions(accountId)
    res.json({ message: `Attempted to close ${results.length} positions`, results })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Get trade history
router.get('/history/:accountId', authenticate, validateId('accountId'), async (req: AuthRequest, res) => {
  try {
    await verifyAccountOwnership(req.params.accountId, req.user!.id)
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 50
    const result = await tradingService.getTradeHistory(req.params.accountId, page, limit)
    res.json(result)
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500
    res.status(statusCode).json({ error: error.message })
  }
})

// Get statistics
router.get('/stats/:accountId', authenticate, validateId('accountId'), async (req: AuthRequest, res) => {
  try {
    await verifyAccountOwnership(req.params.accountId, req.user!.id)
    const stats = await tradingService.getStatistics(req.params.accountId)
    res.json(stats)
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500
    res.status(statusCode).json({ error: error.message })
  }
})

export default router
