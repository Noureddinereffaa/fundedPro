import { prisma } from '../index.js'
import { AppError } from '../middleware/errorHandler.js'
import { RuleEngine } from './rule.js'
import { calculateMargin, calculatePnL } from '../utils/helpers.js'
import { SYMBOLS, COMMISSION, SPREAD_MARKUP } from '../utils/constants.js'

const ruleEngine = new RuleEngine()

export class TradingService {
  async placeOrder(accountId: string, orderData: {
    symbol: string
    type: string
    side: string
    volume: number
    price?: number
    stopLoss?: number
    takeProfit?: number
    trailingStop?: number
    breakEven?: boolean
  }) {
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

    if (orderData.type === 'market' && !orderData.price) {
      throw new AppError('Market price is required', 400)
    }

    let executionPrice = orderData.price!
    if (executionPrice <= 0) {
      throw new AppError('Invalid price', 400)
    }

    // Apply spread markup for market orders
    if (orderData.type === 'market') {
      const cat = SYMBOLS[orderData.symbol]?.category || 'forex'
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

    const category = SYMBOLS[orderData.symbol].category
    const commissionPerLot = COMMISSION[category] ?? COMMISSION.forex
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

        return { order, position }
      }

      return { order, position: null }
    })
  }

  async modifyOrder(orderId: string, accountId: string, modifications: {
    stopLoss?: number
    takeProfit?: number
    trailingStop?: number
  }) {
    const order = await prisma.order.findFirst({ where: { id: orderId, accountId } })
    if (!order) throw new AppError('Order not found', 404)
    if (order.status !== 'pending') throw new AppError('Can only modify pending orders', 400)

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

  async modifyPosition(positionId: string, accountId: string, modifications: {
    stopLoss?: number
    takeProfit?: number
  }) {
    const position = await prisma.position.findFirst({
      where: { id: positionId, accountId, status: 'open' },
    })
    if (!position) throw new AppError('Position not found', 404)

    // Validate SL/TP
    if (modifications.stopLoss !== undefined) {
      if (position.side === 'buy' && modifications.stopLoss >= Number(position.openPrice)) {
        throw new AppError('Stop loss must be below open price for buy position', 400)
      }
      if (position.side === 'sell' && modifications.stopLoss <= Number(position.openPrice)) {
        throw new AppError('Stop loss must be above open price for sell position', 400)
      }
    }
    if (modifications.takeProfit !== undefined) {
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

  async closePosition(positionId: string, accountId: string, closingVolume?: number, closePrice?: number) {
    const position = await prisma.position.findFirst({
      where: { id: positionId, accountId, status: 'open' },
    })
    if (!position) throw new AppError('Position not found', 404)

    const fullVolume = Number(position.volume)
    const volToClose = closingVolume ? Math.min(closingVolume, fullVolume) : fullVolume
    if (volToClose <= 0) throw new AppError('Invalid closing volume', 400)

    const isPartial = volToClose < fullVolume
    const exitPrice = closePrice ?? Number(position.currentPrice ?? position.openPrice)
    if (exitPrice <= 0) throw new AppError('Invalid close price', 400)

    const pnl = calculatePnL(position.side, Number(position.openPrice), exitPrice, volToClose, position.symbol)
    const partialCommission = Number(position.commission) * (volToClose / fullVolume)

    return prisma.$transaction(async (tx) => {
      if (isPartial) {
        await tx.position.update({
          where: { id: positionId },
          data: {
            volume: fullVolume - volToClose,
            commission: Number(position.commission) - partialCommission,
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
          swap: 0,
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
        skip, take: limit,
      }),
      prisma.trade.count({ where: { accountId } }),
    ])
    return {
      data: trades,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  }

  async getStatistics(accountId: string) {
    const trades = await prisma.trade.findMany({ where: { accountId } })
    if (trades.length === 0) {
      return {
        totalTrades: 0, winRate: 0, profitFactor: 0,
        averageWin: 0, averageLoss: 0, bestTrade: 0, worstTrade: 0,
        totalProfit: 0, totalLoss: 0, netPnl: 0,
      }
    }

    const wins = trades.filter(t => Number(t.profit) > 0)
    const losses = trades.filter(t => Number(t.profit) < 0)
    const totalProfit = wins.reduce((s, t) => s + Number(t.profit), 0)
    const totalLoss = Math.abs(losses.reduce((s, t) => s + Number(t.profit), 0))

    return {
      totalTrades: trades.length,
      winRate: Number(((wins.length / trades.length) * 100).toFixed(1)),
      profitFactor: totalLoss > 0 ? Number((totalProfit / totalLoss).toFixed(2)) : totalProfit > 0 ? Infinity : 0,
      averageWin: wins.length > 0 ? Number((totalProfit / wins.length).toFixed(2)) : 0,
      averageLoss: losses.length > 0 ? Number((totalLoss / losses.length).toFixed(2)) : 0,
      bestTrade: Math.max(...trades.map(t => Number(t.profit))),
      worstTrade: Math.min(...trades.map(t => Number(t.profit))),
      totalProfit: Number(totalProfit.toFixed(2)),
      totalLoss: Number(totalLoss.toFixed(2)),
      netPnl: Number((totalProfit - totalLoss).toFixed(2)),
    }
  }
}
