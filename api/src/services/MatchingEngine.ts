import { prisma } from '../index.js'
import { TradingService } from './trading.js'
import { calculatePnL } from '../utils/helpers.js'

async function fetchLivePrices(): Promise<Record<string, { price: number; change: number }>> {
  try {
    const res = await fetch('http://localhost:3002/prices', { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      return await res.json() as Record<string, { price: number; change: number }>
    }
  } catch (err) {
    // console.warn('[MatchingEngine] Failed to fetch prices from WS server', err)
  }
  return {}
}

export class MatchingEngine {
  private bestPrices = new Map<string, { high: number; low: number }>()
  private trading: TradingService

  constructor() {
    this.trading = new TradingService()
  }

  // 1. Process Pending Orders (Limit / Stop)
  async processOrders() {
    const orders = await prisma.order.findMany({
      where: { status: 'pending' },
      include: { account: true },
    })
    if (orders.length === 0) return

    const prices = await fetchLivePrices()

    for (const order of orders) {
      const priceData = prices[order.symbol]
      if (!priceData || priceData.price <= 0) continue

      const currentPrice = priceData.price
      const orderPrice = Number(order.price)
      let triggered = false

      if (order.type === 'limit') {
        if (order.side === 'buy' && currentPrice <= orderPrice) triggered = true
        if (order.side === 'sell' && currentPrice >= orderPrice) triggered = true
      } else if (order.type === 'stop') {
        if (order.side === 'buy' && currentPrice >= orderPrice) triggered = true
        if (order.side === 'sell' && currentPrice <= orderPrice) triggered = true
      }

      if (!triggered) continue

      try {
        await this.trading.placeOrder(order.accountId, {
          symbol: order.symbol,
          type: 'market',
          side: order.side,
          volume: Number(order.volume),
          price: currentPrice,
          stopLoss: order.stopLoss ? Number(order.stopLoss) : undefined,
          takeProfit: order.takeProfit ? Number(order.takeProfit) : undefined,
          trailingStop: order.trailingStop ? Number(order.trailingStop) : undefined,
          breakEven: order.breakEven,
        })

        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'filled' },
        })

        console.log(`[MatchingEngine] Filled ${order.type} ${order.side} ${order.symbol} vol=${order.volume} @ ${currentPrice}`)
      } catch (err: any) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'failed',
            errorMessage: err.message || 'Matching engine execution failed',
          },
        })
      }
    }
  }

  // 2. Process SL / TP and update floating PnL
  async processSLTP() {
    const positions = await prisma.position.findMany({
      where: { status: 'open' },
    })
    if (positions.length === 0) return

    const prices = await fetchLivePrices()

    for (const position of positions) {
      const priceData = prices[position.symbol]
      if (!priceData || priceData.price <= 0) continue

      const currentPrice = priceData.price
      const floatingPnl = calculatePnL(position.side, Number(position.openPrice), currentPrice, Number(position.volume), position.symbol)
      const sl = position.stopLoss ? Number(position.stopLoss) : null
      const tp = position.takeProfit ? Number(position.takeProfit) : null

      let closeReason: string | null = null

      if (position.side === 'buy') {
        if (sl && currentPrice <= sl) closeReason = 'stop_loss'
        if (tp && currentPrice >= tp) closeReason = 'take_profit'
      } else {
        if (sl && currentPrice >= sl) closeReason = 'stop_loss'
        if (tp && currentPrice <= tp) closeReason = 'take_profit'
      }

      if (closeReason) {
        try {
          // Execute close via TradingService so balance/trade history are updated correctly
          await this.trading.closePosition(position.id, position.accountId, undefined, currentPrice)
          console.log(`[MatchingEngine] Hit ${closeReason} for ${position.symbol} @ ${currentPrice}`)
          
          // Also manually update the trade record with the correct closeReason if TradingService defaults to 'manual'
          await prisma.trade.updateMany({
            where: { positionId: position.id },
            data: { closeReason },
          })
        } catch (err: any) {
          console.error(`[MatchingEngine] SL/TP close failed for ${position.id}: ${err.message}`)
        }
      } else {
        // Update floating PnL & current price live
        await prisma.position.update({
          where: { id: position.id },
          data: {
            currentPrice,
            profit: floatingPnl,
          },
        })
      }
    }
  }

  // 3. Process Trailing Stops
  async processTrailingStops() {
    const positions = await prisma.position.findMany({
      where: {
        status: 'open',
        trailingStop: { not: null },
      },
    })
    if (positions.length === 0) return

    const prices = await fetchLivePrices()

    for (const position of positions) {
      const priceData = prices[position.symbol]
      if (!priceData || priceData.price <= 0) continue

      const currentPrice = priceData.price
      const trailingStopDist = Number(position.trailingStop)
      const existingSL = position.stopLoss ? Number(position.stopLoss) : null
      const posId = position.id

      if (!this.bestPrices.has(posId)) {
        this.bestPrices.set(posId, { high: currentPrice, low: currentPrice })
      }
      const best = this.bestPrices.get(posId)!
      if (currentPrice > best.high) best.high = currentPrice
      if (currentPrice < best.low) best.low = currentPrice

      let newSL: number | null = null

      if (position.side === 'buy') {
        const desiredSL = best.high - trailingStopDist
        if (desiredSL > (existingSL ?? 0)) newSL = desiredSL
      } else {
        const desiredSL = best.low + trailingStopDist
        if (desiredSL < (existingSL ?? Infinity)) newSL = desiredSL
      }

      if (newSL !== null && newSL > 0) {
        const roundedSL = Number(newSL.toFixed(6))
        await prisma.position.update({
          where: { id: posId },
          data: { stopLoss: roundedSL },
        })
      }
    }
  }

  // 4. Process Break Even
  async processBreakEven() {
    const positions = await prisma.position.findMany({
      where: {
        status: 'open',
        breakEven: true,
      },
    })
    if (positions.length === 0) return

    const prices = await fetchLivePrices()

    for (const position of positions) {
      const priceData = prices[position.symbol]
      if (!priceData || priceData.price <= 0) continue

      const currentPrice = priceData.price
      const openPrice = Number(position.openPrice)
      const existingSL = position.stopLoss ? Number(position.stopLoss) : null

      const threshold = openPrice * 0.005 // 0.5% move
      let shouldMove = false

      if (position.side === 'buy' && currentPrice >= openPrice + threshold) shouldMove = true
      else if (position.side === 'sell' && currentPrice <= openPrice - threshold) shouldMove = true

      if (shouldMove && existingSL !== openPrice) {
        await prisma.position.update({
          where: { id: position.id },
          data: {
            stopLoss: openPrice,
            breakEven: false,
          },
        })
      }
    }
  }

  // 5. Process Swap (Overnight financing)
  async processSwap() {
    const positions = await prisma.position.findMany({
      where: { status: 'open' },
      include: { account: true }
    })
    
    if (positions.length === 0) return

    const { SWAP_RATES, SYMBOLS } = await import('../utils/constants.js')
    
    for (const position of positions) {
      const category = SYMBOLS[position.symbol]?.category || 'forex'
      const rates = SWAP_RATES[category] || { long: 0, short: 0 }
      const swapRate = position.side === 'buy' ? rates.long : rates.short
      
      // Calculate swap cost based on volume
      // simple calculation: swap = volume * swapRate
      const swapCost = Number(position.volume) * swapRate
      
      if (swapCost !== 0) {
        const newSwap = Number(position.swap) + swapCost
        await prisma.position.update({
          where: { id: position.id },
          data: { swap: newSwap }
        })
        
        // deduct from balance
        const newBalance = Number(position.account.balance) + swapCost
        await prisma.account.update({
          where: { id: position.accountId },
          data: { balance: newBalance }
        })
      }
    }
    console.log('[MatchingEngine] Swap processed for open positions')
  }
}

