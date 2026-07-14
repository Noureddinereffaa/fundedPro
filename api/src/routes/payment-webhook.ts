import { Router } from 'express'
import { NowPaymentsService } from '../services/nowpayments.js'

const router = Router()
const nowPaymentsService = new NowPaymentsService()

router.post('/webhook', async (req, res) => {
  try {
    await nowPaymentsService.handleWebhook(req.body)
    res.json({ ok: true })
  } catch (e) {
    console.error('[PaymentWebhook] Error:', e)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

export default router
