import { Router } from 'express'
import { z } from 'zod'
import { PaymentService } from '../services/payment.js'
import { NowPaymentsService } from '../services/nowpayments.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'
import { AppError } from '../middleware/errorHandler.js'
import { ACCOUNT_PRICES, ACCOUNT_SIZES } from '../utils/constants.js'
import { config } from '../config/index.js'

const checkoutSchema = z.object({
  accountSize: z.number().positive(),
  accountType: z.enum(['evaluation', 'evaluation_1', 'funded']).transform((v) => v === 'evaluation' ? 'evaluation_1' : v),
  promoCode: z.string().optional(),
  method: z.enum(['crypto', 'nowpayments']).optional().default('crypto'),
})

const submitTxSchema = z.object({
  txId: z.string().min(1),
  txHash: z.string().min(1),
})

const payoutSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive(),
  method: z.string().optional(),
  walletAddress: z.string().optional(),
})

const router = Router()
const paymentService = new PaymentService()

router.get('/prices', (_req, res) => {
  res.json({ sizes: ACCOUNT_SIZES, prices: ACCOUNT_PRICES })
})

router.post('/checkout', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountSize, accountType, promoCode, method } = checkoutSchema.parse(req.body)

    if (method === 'nowpayments' && config.NOWPAYMENTS_API_KEY) {
      // NOWPayments automated checkout
      const payment = await paymentService.createCheckout(req.user!.id, accountSize, accountType, promoCode, 'nowpayments')
      const nowPaymentsService = new NowPaymentsService()
      const invoice = await nowPaymentsService.createInvoice(payment.id, payment.amount, req.user!.id)
      res.json({ ...payment, invoiceUrl: invoice.invoice_url, method: 'nowpayments' })
    } else {
      // Manual crypto wallet checkout
      const result = await paymentService.createCheckout(req.user!.id, accountSize, accountType, promoCode, 'crypto')
      res.json(result)
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message })
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

router.post('/submit-tx', authenticate, async (req: AuthRequest, res) => {
  try {
    const { txId, txHash } = submitTxSchema.parse(req.body)
    const result = await paymentService.submitTxHash(req.user!.id, txId, txHash)
    res.json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message })
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
    const { accountId, amount, method, walletAddress } = payoutSchema.parse(req.body)
    const result = await paymentService.requestPayout(req.user!.id, accountId, amount, method, walletAddress)
    res.json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message })
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

router.get('/max-payout/:accountId', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await paymentService.getMaxPayout(req.user!.id, req.params.accountId)
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
    const statusCode = error instanceof AppError ? error.statusCode : 500
    res.status(statusCode).json({ error: error.message })
  }
})

router.get('/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const history = await paymentService.getPaymentHistory(req.user!.id)
    res.json(history)
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500
    res.status(statusCode).json({ error: error.message })
  }
})

export default router
