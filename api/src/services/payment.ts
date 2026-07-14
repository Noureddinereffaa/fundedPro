import { prisma } from '../index.js'
import { AppError } from '../middleware/errorHandler.js'
import { config } from '../config/index.js'
import { PROFIT_SPLIT } from '../utils/constants.js'
import { randomBytes } from 'crypto'

const CRYPTO_WALLETS = {
  BTC: config.BTC_WALLET,
  ETH: config.ETH_WALLET,
  'USDT-TRC20': config.USDT_TRC20_WALLET,
  'USDT-ERC20': config.USDT_ERC20_WALLET,
}

function generateTxId() {
  return `TX_${Date.now()}_${randomBytes(4).toString('hex')}`
}

export class PaymentService {
  async createCheckout(userId: string, accountSize: number, accountType: string, promoCode?: string, method: string = 'crypto') {
    const { ACCOUNT_PRICES } = await import('../utils/constants.js')
    const pricing = ACCOUNT_PRICES[accountSize as keyof typeof ACCOUNT_PRICES]
    if (!pricing) throw new AppError('Invalid account size', 400)

    let amount = accountType === 'funded' ? pricing.instant : pricing.evaluation
    let discount = 0

    if (promoCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: promoCode.toUpperCase() } })
      if (!coupon || !coupon.isActive) throw new AppError('Invalid or inactive promo code', 400)
      if (coupon.expiresAt && new Date() > coupon.expiresAt) throw new AppError('Promo code has expired', 400)
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new AppError('Promo code usage limit reached', 400)
      
      if (coupon.discountType === 'percentage') {
        discount = (amount * Number(coupon.discountValue)) / 100
      } else {
        discount = Number(coupon.discountValue)
      }
      
      amount = Math.max(0, amount - discount)
      
      // We don't increment usedCount yet, it should ideally be incremented when payment is approved.
    }

    const txId = generateTxId()
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency: 'USD',
        method,
        walletAddress: method === 'nowpayments' ? null : CRYPTO_WALLETS.BTC,
        network: method === 'nowpayments' ? null : 'BTC',
        status: 'pending',
        metadata: { txId, accountSize, accountType, promoCode, discount, orderId: txId, createdAt: new Date().toISOString() },
      },
    })

    return {
      id: payment.id,
      txId,
      amount,
      walletAddress: method === 'nowpayments' ? null : CRYPTO_WALLETS.BTC,
      network: method === 'nowpayments' ? null : 'BTC',
      networks: method === 'nowpayments' ? [] : [
        { name: 'BTC', address: CRYPTO_WALLETS.BTC, label: 'Bitcoin' },
        { name: 'ETH', address: CRYPTO_WALLETS.ETH, label: 'Ethereum (ERC-20)' },
        { name: 'USDT-TRC20', address: CRYPTO_WALLETS['USDT-TRC20'], label: 'Tether (TRC-20)' },
        { name: 'USDT-ERC20', address: CRYPTO_WALLETS['USDT-ERC20'], label: 'Tether (ERC-20)' },
      ],
    }
  }

  async submitTxHash(userId: string, txId: string, txHash: string) {
    const payment = await prisma.payment.findFirst({
      where: { userId, metadata: { path: ['txId'], equals: txId }, status: 'pending' },
    })
    if (!payment) throw new AppError('Payment not found', 404)

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        txHash,
        metadata: { ...((payment.metadata as any) || {}), txHash, submittedAt: new Date().toISOString() },
      },
    })
    return updated
  }

  async getPaymentStatus(userId: string, txId: string) {
    const payment = await prisma.payment.findFirst({
      where: { userId, metadata: { path: ['txId'], equals: txId } },
    })
    if (!payment) throw new AppError('Payment not found', 404)
    return payment
  }

  async handleWebhook(_event: any) {
    // Crypto payments don't use webhooks — admin verifies manually
  }

  async getMaxPayout(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId, status: 'funded' },
    })
    if (!account) throw new AppError('Account not found or not funded', 404)

    const trades = await prisma.trade.findMany({ where: { accountId } })
    const totalProfit = trades.reduce((sum: number, t: any) => sum + Math.max(0, Number(t.profit)), 0)
    const totalLoss = Math.abs(trades.reduce((sum: number, t: any) => sum + Math.min(0, Number(t.profit)), 0))
    const netProfit = totalProfit - totalLoss

    const previousPayouts = await prisma.payoutRequest.aggregate({
      where: { accountId, status: 'completed' },
      _sum: { amount: true },
    })
    const totalPaidOut = Number(previousPayouts._sum.amount || 0)

    const availableProfit = Math.max(0, netProfit - totalPaidOut)
    return { maxPayout: availableProfit * PROFIT_SPLIT, netProfit, profitSplit: PROFIT_SPLIT, totalPaidOut }
  }

  async requestPayout(
    userId: string,
    accountId: string,
    amount: number,
    method?: string,
    walletAddress?: string,
  ) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId, status: 'funded' },
    })
    if (!account) throw new AppError('Account not found or not funded', 404)

    const pending = await prisma.payoutRequest.findFirst({
      where: { accountId, status: 'pending' },
    })
    if (pending) throw new AppError('A payout request is already pending for this account', 400)

    const { maxPayout } = await this.getMaxPayout(userId, accountId)
    if (amount > maxPayout) {
      throw new AppError(`Maximum payout available: $${maxPayout.toFixed(2)}`, 400)
    }

    return prisma.payoutRequest.create({
      data: { userId, accountId, amount, method, walletAddress, status: 'pending' },
    })
  }

  async getPayoutHistory(userId: string) {
    return prisma.payoutRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getPaymentHistory(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }
}
