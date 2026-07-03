import { Router } from 'express'
import { TradingService } from '../services/trading.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'

const router = Router()
const tradingService = new TradingService()

// Place order
router.post('/order', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountId, ...orderData } = req.body
    const result = await tradingService.placeOrder(accountId, orderData)
    res.json(result)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Modify order
router.put('/order/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountId, ...modifications } = req.body
    const result = await tradingService.modifyOrder(req.params.id, accountId, modifications)
    res.json(result)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Cancel order
router.delete('/order/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountId } = req.body
    await tradingService.cancelOrder(req.params.id, accountId)
    res.json({ message: 'Order cancelled' })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Get open positions
router.get('/positions/:accountId', authenticate, async (req: AuthRequest, res) => {
  try {
    const positions = await tradingService.getOpenPositions(req.params.accountId)
    res.json(positions)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get pending orders
router.get('/orders/:accountId', authenticate, async (req: AuthRequest, res) => {
  try {
    const orders = await tradingService.getPendingOrders(req.params.accountId)
    res.json(orders)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Modify position (SL/TP)
router.put('/position/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountId, ...modifications } = req.body
    const result = await tradingService.modifyPosition(req.params.id, accountId, modifications)
    res.json(result)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Close position
router.post('/position/:id/close', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountId, volume, price } = req.body
    const result = await tradingService.closePosition(req.params.id, accountId, volume, price)
    res.json(result)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Close all positions
router.post('/positions/:accountId/close-all', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountId } = req.params
    const positions = await tradingService.getOpenPositions(accountId)
    
    // Fetch latest prices for closing
    let prices: Record<string, { price: number }> = {}
    try {
      const pRes = await fetch('http://localhost:3002/prices', { signal: AbortSignal.timeout(2000) })
      if (pRes.ok) prices = await pRes.json() as Record<string, { price: number }>
    } catch (e) {}

    const results = []
    for (const pos of positions) {
      const price = prices[pos.symbol]?.price || pos.currentPrice || pos.openPrice
      try {
        await tradingService.closePosition(pos.id, accountId, undefined, Number(price))
        results.push({ id: pos.id, status: 'closed' })
      } catch (err: any) {
        results.push({ id: pos.id, status: 'error', error: err.message })
      }
    }
    res.json({ message: `Attempted to close ${positions.length} positions`, results })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Get trade history
router.get('/history/:accountId', authenticate, async (req: AuthRequest, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 50
    const result = await tradingService.getTradeHistory(req.params.accountId, page, limit)
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get statistics
router.get('/stats/:accountId', authenticate, async (req: AuthRequest, res) => {
  try {
    const stats = await tradingService.getStatistics(req.params.accountId)
    res.json(stats)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
