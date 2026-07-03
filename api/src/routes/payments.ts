import { Router } from 'express'
import { PaymentService } from '../services/payment.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'

const router = Router()
const paymentService = new PaymentService()

router.post('/checkout', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountSize, accountType } = req.body
    const result = await paymentService.createCheckout(req.user!.id, accountSize, accountType)
    res.json(result)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

router.post('/submit-tx', authenticate, async (req: AuthRequest, res) => {
  try {
    const { txId, txHash } = req.body
    const result = await paymentService.submitTxHash(req.user!.id, txId, txHash)
    res.json(result)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

router.get('/status/:txId', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await paymentService.getPaymentStatus(req.user!.id, req.params.txId)
    res.json(result)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

router.post('/payout', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountId, amount } = req.body
    const result = await paymentService.requestPayout(req.user!.id, accountId, amount)
    res.json(result)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

router.get('/payouts', authenticate, async (req: AuthRequest, res) => {
  try {
    const history = await paymentService.getPayoutHistory(req.user!.id)
    res.json(history)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const history = await paymentService.getPaymentHistory(req.user!.id)
    res.json(history)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
