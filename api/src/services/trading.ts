import { prisma } from '../index.js'
import { AppError, getErrorInfo } from '../middleware/errorHandler.js'
import { RuleEngine } from './rule.js'
import { AccountService } from './account.js'
import { calculateMargin, calculatePnL } from '../utils/helpers.js'
import { SYMBOLS, COMMISSION, SPREAD_MARKUP } from '../utils/constants.js'
import { PriceSnapshotClient } from '../utils/priceClient.js'

interface PriceFetchResult {
  price: number
  source: 'primary' | 'fallback' | 'cache'
  age: number
}

const ruleEngine = new RuleEngine()
const accountService = new AccountService()

export class TradingService {
  private priceClient = new PriceSnapshotClient()

  private async fetchServerPrice(symbol: string): Promise<PriceFetchResult | null> {
    try {
      const snapshot = await this.priceClient.getSinglePrice(symbol)
      if (!snapshot || snapshot.price <= 0) {
        const metrics = this.priceClient.getFailureMetrics()
        console.warn(`[TradingService] Invalid price snapshot for ${symbol}. Failures: ${metrics.failureCount}`)
        return null
      }

      if (snapshot.age > 2000) {
        console.warn(
          `[TradingService] Using stale price for ${symbol}: age=${snapshot.age}ms, source=${snapshot.source}`,
        )
      }

      return {
        price: snapshot.price,
        source: snapshot.source,
        age: snapshot.age,
      }
    } catch (error) {
      const metrics = this.priceClient.getFailureMetrics()
      console.error(
        `[TradingService] Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : 'unknown error'}. Failures: ${metrics.failureCount}`,
      )
      return null
    }
  }

  private async resolveClosePrice(symbol: string, explicitPrice?: number): Promise<number> {
    if (typeof explicitPrice === 'number') {
      if (explicitPrice <= 0) throw new AppError('Invalid close price', 400)
      return explicitPrice
    }

    const snapshot = await this.fetchServerPrice(symbol)
    if (snapshot?.price && snapshot.price > 0) {
      return snapshot.price
    }

    return NaN
  }
  async placeOrder(
    accountId: string,
    orderData: {
      symbol: string
      type: string
      side: string
      volume: number
      price?: number
      stopLoss?: number
      takeProfit?: number
      trailingStop?: number
      breakEven?: boolean
    },
  ) {
    if (!SYMBOLS[orderData.symbol]) {
      throw new AppError('Invalid symbol', 400)
    }
    if (!['market', 'limit', 'stop'].includes(orderData.type)) {
      throw new AppError('Invalid order type', 400)
    }
    if (!['buy', 'sell'].includes(orderData.side)) {
      throw new AppError('Invalid order side', 400)
    }
    if (orderData.volume <= 0) {
      throw new AppError('Volume must be greater than 0', 400)
    }

    let executionPrice: number

    if (orderData.type === 'market') {
      // Fetch live price server-side — never trust client price for market orders
      const priceResult = await this.fetchServerPrice(orderData.symbol)
      if (!priceResult || priceResult.price <= 0) {
        throw new AppError('Unable to fetch live price for market order', 503)
      }
      executionPrice = priceResult.price
    } else {
      // Limit/stop orders: client's price is the trigger price — validate it
      if (!orderData.price || orderData.price <= 0) {
        throw new AppError('Price is required for limit/stop orders', 400)
      }
      executionPrice = orderData.price
    }

    // Apply spread markup for market orders
    if (orderData.type === 'market') {
      const cat = SYMBOLS[orderData.symbol]?.category || 'crypto'
      const spreadPips = SPREAD_MARKUP[cat] ?? 0
      const pipValue = SYMBOLS[orderData.symbol]?.pipValue || 0.0001
      const spreadInPrice = spreadPips * pipValue

      if (orderData.side === 'buy') {
        executionPrice += spreadInPrice / 2
      } else {
        executionPrice -= spreadInPrice / 2
      }
      executionPrice = Number(executionPrice.toFixed(SYMBOLS[orderData.symbol]?.digits || 5))
    }

    // Validate SL/TP against current price
    if (orderData.stopLoss) {
      if (orderData.side === 'buy' && orderData.stopLoss >= executionPrice) {
        throw new AppError('Stop loss must be below entry price for buy', 400)
      }
      if (orderData.side === 'sell' && orderData.stopLoss <= executionPrice) {
        throw new AppError('Stop loss must be above entry price for sell', 400)
      }
    }
    if (orderData.takeProfit) {
      if (orderData.side === 'buy' && orderData.takeProfit <= executionPrice) {
        throw new AppError('Take profit must be above entry price for buy', 400)
      }
      if (orderData.side === 'sell' && orderData.takeProfit >= executionPrice) {
        throw new AppError('Take profit must be below entry price for sell', 400)
      }
    }

    const ruleCheck = await ruleEngine.checkOrder(accountId, orderData)
    if (!ruleCheck.allowed) {
      throw new AppError(ruleCheck.reason || 'Order rejected', 400)
    }

    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) throw new AppError('Account not found', 404)

    const category = SYMBOLS[orderData.symbol]?.category || 'crypto'
    const commissionPerLot = COMMISSION[category] ?? 0
    const margin = calculateMargin(orderData.volume, executionPrice, account.leverage, orderData.symbol)
    const commission = commissionPerLot * orderData.volume

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          accountId,
          symbol: orderData.symbol,
          type: orderData.type,
          side: orderData.side,
          volume: orderData.volume,
          price: orderData.type !== 'market' ? orderData.price : undefined,
          stopLoss: orderData.stopLoss,
          takeProfit: orderData.takeProfit,
          trailingStop: orderData.trailingStop,
          breakEven: orderData.breakEven || false,
          status: orderData.type === 'market' ? 'filled' : 'pending',
          filledVolume: orderData.type === 'market' ? orderData.volume : null,
          filledPrice: orderData.type === 'market' ? executionPrice : null,
        },
      })

      if (orderData.type === 'market') {
        const position = await tx.position.create({
          data: {
            accountId,
            orderId: order.id,
            symbol: orderData.symbol,
            side: orderData.side,
            volume: orderData.volume,
            openPrice: executionPrice,
            currentPrice: executionPrice,
            stopLoss: orderData.stopLoss,
            takeProfit: orderData.takeProfit,
            trailingStop: orderData.trailingStop,
            breakEven: orderData.breakEven || false,
            margin,
            commission,
            status: 'open',
          },
        })

        await accountService.incrementTradingDays(accountId)

        return { order, position }
      }

      return { order, position: null }
    })
  }

  async modifyOrder(
    orderId: string,
    accountId: string,
    modifications: {
      price?: number
      stopLoss?: number | null
      takeProfit?: number | null
    },
  ) {
    const order = await prisma.order.findFirst({ where: { id: orderId, accountId } })
    if (!order) throw new AppError('Order not found', 404)
    if (order.status !== 'pending') throw new AppError('Can only modify pending orders', 400)

    // If price changed, re-validate SL/TP against new price
    if (modifications.price !== undefined) {
      if (modifications.stopLoss !== undefined && modifications.stopLoss !== null) {
        if (order.side === 'buy' && modifications.stopLoss >= modifications.price) {
          throw new AppError('Stop loss must be below entry price for buy orders', 400)
        }
        if (order.side === 'sell' && modifications.stopLoss <= modifications.price) {
          throw new AppError('Stop loss must be above entry price for sell orders', 400)
        }
      }
      if (modifications.takeProfit !== undefined && modifications.takeProfit !== null) {
        if (order.side === 'buy' && modifications.takeProfit <= modifications.price) {
          throw new AppError('Take profit must be above entry price for buy orders', 400)
        }
        if (order.side === 'sell' && modifications.takeProfit >= modifications.price) {
          throw new AppError('Take profit must be below entry price for sell orders', 400)
        }
      }
    }

    return prisma.order.update({
      where: { id: orderId },
      data: modifications,
    })
  }

  async cancelOrder(orderId: string, accountId: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, accountId } })
    if (!order) throw new AppError('Order not found', 404)
    if (order.status !== 'pending') throw new AppError('Can only cancel pending orders', 400)

    return prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    })
  }

  async modifyPosition(
    positionId: string,
    accountId: string,
    modifications: {
      stopLoss?: number | null
      takeProfit?: number | null
    },
  ) {
    const position = await prisma.position.findFirst({
      where: { id: positionId, accountId, status: 'open' },
    })
    if (!position) throw new AppError('Position not found', 404)

    // Validate SL/TP (skip null = remove SL/TP)
    if (modifications.stopLoss !== undefined && modifications.stopLoss !== null) {
      if (position.side === 'buy' && modifications.stopLoss >= Number(position.openPrice)) {
        throw new AppError('Stop loss must be below open price for buy position', 400)
      }
      if (position.side === 'sell' && modifications.stopLoss <= Number(position.openPrice)) {
        throw new AppError('Stop loss must be above open price for sell position', 400)
      }
    }
    if (modifications.takeProfit !== undefined && modifications.takeProfit !== null) {
      if (position.side === 'buy' && modifications.takeProfit <= Number(position.openPrice)) {
        throw new AppError('Take profit must be above open price for buy position', 400)
      }
      if (position.side === 'sell' && modifications.takeProfit >= Number(position.openPrice)) {
        throw new AppError('Take profit must be below open price for sell position', 400)
      }
    }

    return prisma.position.update({
      where: { id: positionId },
      data: modifications,
    })
  }

  async closePosition(positionId: string, accountId: string, closingVolume?: number, serverPrice?: number) {
    const position = await prisma.position.findFirst({
      where: { id: positionId, accountId, status: 'open' },
    })
    if (!position) throw new AppError('Position not found', 404)

    const fullVolume = Number(position.volume)
    const volToClose = closingVolume ? Math.min(closingVolume, fullVolume) : fullVolume
    if (volToClose <= 0) throw new AppError('Invalid closing volume', 400)

    const isPartial = volToClose < fullVolume
    let exitPrice = Number(position.currentPrice ?? position.openPrice)

    if (serverPrice === undefined) {
      const fetchedPrice = await this.resolveClosePrice(position.symbol)
      if (!Number.isNaN(fetchedPrice) && fetchedPrice > 0) {
        exitPrice = fetchedPrice
      }
    } else {
      if (serverPrice <= 0) throw new AppError('Invalid close price', 400)
      exitPrice = serverPrice
    }

    if (exitPrice <= 0) throw new AppError('Invalid close price', 400)

    const pnl = calculatePnL(
      position.side,
      Number(position.openPrice),
      exitPrice,
      volToClose,
      position.symbol,
    )
    const partialCommission = Number(position.commission) * (volToClose / fullVolume)

    return prisma.$transaction(async (tx) => {
      if (isPartial) {
        await tx.position.update({
          where: { id: positionId },
          data: {
            volume: fullVolume - volToClose,
            commission: Number(position.commission) - partialCommission,
            currentPrice: exitPrice,
          },
        })
      } else {
        await tx.position.update({
          where: { id: positionId },
          data: {
            status: 'closed',
            closeTime: new Date(),
            closePrice: exitPrice,
            closeReason: 'manual',
            profit: pnl,
          },
        })
      }

      await tx.trade.create({
        data: {
          accountId: position.accountId,
          positionId: position.id,
          symbol: position.symbol,
          side: position.side,
          volume: volToClose,
          openPrice: position.openPrice,
          closePrice: exitPrice,
          profit: pnl,
          swap: position.swap,
          commission: partialCommission,
          duration: Math.floor((Date.now() - position.openTime.getTime()) / 1000),
          openTime: position.openTime,
          closeTime: new Date(),
          closeReason: isPartial ? 'partial' : 'manual',
        },
      })

      const account = await tx.account.findUnique({ where: { id: accountId } })
      if (account) {
        const newBalance = Number(account.balance) + pnl
        await tx.account.update({
          where: { id: accountId },
          data: { balance: newBalance }, // We only strictly update balance here, equity is calculated dynamically
        })
      }

      return { pnl, isPartial, remainingVolume: isPartial ? fullVolume - volToClose : 0 }
    })
  }

  async closeAllPositions(accountId: string) {
    const positions = await this.getOpenPositions(accountId)
    const prices = await this.priceClient
      .getPrices()
      .catch((e) => {
        console.warn(
          `[TradingService] Failed to fetch prices for close-all positions: ${e instanceof Error ? e.message : 'unknown error'}`,
        )
        return {} as Record<string, { price: number; change: number }>
      })

    const results: Array<{ id: string; status: string; error?: string }> = []

    for (const position of positions) {
      const price = prices[position.symbol]?.price
      try {
        await this.closePosition(position.id, accountId, undefined, price)
        results.push({ id: position.id, status: 'closed' })
      } catch (error: unknown) {
        const { message } = getErrorInfo(error)
        results.push({ id: position.id, status: 'error', error: message || 'close failed' })
      }
    }

    return results
  }

  async getOpenPositions(accountId: string) {
    return prisma.position.findMany({
      where: { accountId, status: 'open' },
      orderBy: { openTime: 'desc' },
    })
  }

  async getPendingOrders(accountId: string) {
    return prisma.order.findMany({
      where: { accountId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getTradeHistory(accountId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where: { accountId },
        orderBy: { closeTime: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trade.count({ where: { accountId } }),
    ])
    return {
      data: trades,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  }

  async getStatistics(accountId: string) {
    const [winAgg, totals] = await Promise.all([
      prisma.trade.aggregate({
        where: { accountId, profit: { gt: 0 } },
        _sum: { profit: true },
        _count: true,
      }),
      prisma.trade.aggregate({
        where: { accountId },
        _sum: { profit: true },
        _max: { profit: true },
        _min: { profit: true },
        _count: true,
      }),
    ])

    const totalTrades = totals._count
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        bestTrade: 0,
        worstTrade: 0,
        totalProfit: 0,
        totalLoss: 0,
        netPnl: 0,
      }
    }

    const winCount = winAgg._count
    const lossCount = totalTrades - winCount
    const totalProfitPositive = Number(winAgg._sum.profit ?? 0)
    const totalSumAll = Number(totals._sum.profit ?? 0)
    const totalLossValue = Math.abs(totalSumAll - totalProfitPositive)

    return {
      totalTrades,
      winRate: Number(((winCount / totalTrades) * 100).toFixed(1)),
      profitFactor:
        totalLossValue > 0
          ? Number((totalProfitPositive / totalLossValue).toFixed(2))
          : totalProfitPositive > 0
            ? Infinity
            : 0,
      averageWin: winCount > 0 ? Number((totalProfitPositive / winCount).toFixed(2)) : 0,
      averageLoss: lossCount > 0 ? Number((totalLossValue / lossCount).toFixed(2)) : 0,
      bestTrade: Number(totals._max.profit ?? 0),
      worstTrade: Number(totals._min.profit ?? 0),
      totalProfit: Number(totalProfitPositive.toFixed(2)),
      totalLoss: Number(totalLossValue.toFixed(2)),
      netPnl: Number((totalProfitPositive - totalLossValue).toFixed(2)),
    }
  }
}
