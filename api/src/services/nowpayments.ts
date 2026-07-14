import { config } from '../config/index.js'
import { prisma } from '../index.js'
import { EmailService } from './email.js'
import { AccountService } from './account.js'

const NOWPAYMENTS_API = 'https://api.nowpayments.io/v1'

interface NowPaymentsInvoice {
  invoice_id: number
  invoice_url: string
  payment_id: number
  payment_status: string
  price_amount: number
  price_currency: string
  pay_amount: number
  pay_currency: string
}

interface NowPaymentsPaymentStatus {
  payment_id: number
  payment_status: string
  pay_address: string
  pay_amount: number
  actually_paid: number
  price_amount: number
  price_currency: string
  pay_currency: string
  outcome_amount: number
}

async function apiRequest<T>(endpoint: string, method = 'GET', body?: Record<string, unknown>): Promise<T> {
  const apiKey = config.NOWPAYMENTS_API_KEY
  if (!apiKey) throw new Error('NOWPayments API key not configured')

  const res = await fetch(`${NOWPAYMENTS_API}${endpoint}`, {
    method,
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`NOWPayments API error ${res.status}: ${text}`)
  }

  return (await res.json()) as T
}

export class NowPaymentsService {
  async createInvoice(paymentId: string, amount: number, userId: string): Promise<NowPaymentsInvoice> {
    const result = await apiRequest<NowPaymentsInvoice>('/invoice', 'POST', {
      price_amount: amount,
      price_currency: 'USD',
      pay_currency: 'btc,eth,usdttrc20,usdterc20,ltc',
      order_id: paymentId,
      order_description: `Pro FundX - Account Purchase - #${paymentId}`,
      ipn_callback_url: `${config.API_URL}/api/payments/webhook`,
      is_fixed_rate: true,
      is_fee_paid_by_user: true,
    })

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        metadata: {
          nowpaymentsInvoiceId: result.invoice_id,
          nowpaymentsPaymentId: result.payment_id,
          invoiceUrl: result.invoice_url,
          status: result.payment_status,
        },
      },
    })

    return result
  }

  async checkPayment(paymentId: number): Promise<NowPaymentsPaymentStatus> {
    return apiRequest<NowPaymentsPaymentStatus>(`/payment/${paymentId}`)
  }

  async handleWebhook(payload: Record<string, unknown>): Promise<void> {
    const paymentId = payload.payment_id as number
    const paymentStatus = payload.payment_status as string
    const actuallyPaid = Number(payload.actually_paid || 0)
    const orderId = payload.order_id as string

    const payment = await prisma.payment.findFirst({
      where: { id: orderId, status: 'pending' },
    })

    if (!payment) {
      console.error(`[NowPayments] Payment not found: ${orderId}`)
      return
    }

    const meta = (payment.metadata || {}) as Record<string, unknown>
    const userId = payment.userId

    if (paymentStatus === 'finished') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          txHash: `NP-${paymentId}`,
          metadata: { ...meta, nowpaymentsPaymentId: paymentId, actuallyPaid, confirmedAt: new Date().toISOString() },
        },
      })

      if (meta.accountSize && meta.accountType) {
        const accountService = new AccountService()
        const accountType = String(meta.accountType)
        const phase = accountType === 'funded' ? 'funded' as const : 'evaluation_1' as const
        await accountService.purchaseAccount(userId, Number(meta.accountSize), phase)
      }

      const emailService = new EmailService()
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
      if (user) {
        await emailService.sendAccountCreated(user.email, {}).catch(() => {})
      }
    } else if (['failed', 'expired', 'refunded'].includes(paymentStatus)) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed', metadata: { ...meta, failureReason: paymentStatus } },
      })
    }
  }

  async pollPendingPayments(): Promise<void> {
    const pending = await prisma.payment.findMany({
      where: {
        method: 'nowpayments',
        status: 'pending',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    for (const payment of pending) {
      const meta = (payment.metadata || {}) as Record<string, unknown>
      const npPaymentId = meta.nowpaymentsPaymentId as number | undefined
      if (!npPaymentId) continue

      try {
        const status = await this.checkPayment(npPaymentId)
        if (status.payment_status !== (meta.status || 'waiting')) {
          await this.handleWebhook({
            payment_id: npPaymentId,
            payment_status: status.payment_status,
            actually_paid: status.actually_paid,
            order_id: payment.id,
          })
        }
      } catch {
        console.error(`[NowPayments] Poll error for payment ${payment.id}`)
      }
    }
  }
}
