import { prisma } from '../index.js'
import { AppError } from '../middleware/errorHandler.js'
import { config } from '../config/index.js'
import { PROFIT_SPLIT } from '../utils/constants.js'
import { AccountService } from './account.js'

const isDev = config.NODE_ENV === 'development'

const CRYPTO_WALLETS = {
  BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
  'USDT-TRC20': 'TN2YhN7bVvKJwHbSKuYRmFjzQxqFfFfFfF',
  'USDT-ERC20': '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
}

function generateTxId() {
  return `TX_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export class PaymentService {
  async createCheckout(userId: string, accountSize: number, accountType: string) {
    const { ACCOUNT_PRICES } = await import('../utils/constants.js')
    const pricing = ACCOUNT_PRICES[accountSize as keyof typeof ACCOUNT_PRICES]
    if (!pricing) throw new AppError('Invalid account size', 400)

    const amount = accountType === 'funded' ? pricing.instant : pricing.evaluation

    if (isDev) {
      const accountService = new AccountService()
      await prisma.payment.create({
        data: {
          userId,
          amount,
          currency: 'USD',
          method: 'crypto',
          walletAddress: CRYPTO_WALLETS.BTC,
          network: 'BTC',
          status: 'completed',
        },
      })
      const phase = accountType === 'funded' ? 'funded' : 'evaluation_1'
      const { account } = await accountService.purchaseAccount(userId, accountSize, phase as any)
      return { url: `/payment/success?dev=1&accountId=${account.id}`, accountId: account.id }
    }

    const txId = generateTxId()
    await prisma.payment.create({
      data: {
        userId,
        amount,
        currency: 'USD',
        method: 'crypto',
        walletAddress: CRYPTO_WALLETS.BTC,
        network: 'BTC',
        status: 'pending',
        metadata: { txId, accountSize, accountType, createdAt: new Date().toISOString() },
      },
    })

    return {
      txId,
      amount,
      walletAddress: CRYPTO_WALLETS.BTC,
      network: 'BTC',
      networks: [
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
      data: { txHash, metadata: { ...(payment.metadata as any || {}), txHash, submittedAt: new Date().toISOString() } },
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

  async requestPayout(userId: string, accountId: string, amount: number) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId, status: 'funded' },
    })
    if (!account) throw new AppError('Account not found or not funded', 404)

    const trades = await prisma.trade.findMany({ where: { accountId } })
    const totalProfit = trades.reduce((sum: number, t: any) => sum + Number(t.profit), 0)
    const payoutAmount = totalProfit * PROFIT_SPLIT

    if (amount > payoutAmount) {
      throw new AppError(`Maximum payout available: $${payoutAmount.toFixed(2)}`, 400)
    }

    return prisma.payoutRequest.create({
      data: { userId, accountId, amount, status: 'pending' },
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
