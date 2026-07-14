import { prisma } from '../index.js'
import { TradingService } from './trading.js'
import { calculatePnL } from '../utils/helpers.js'
import { PriceSnapshotClient } from '../utils/priceClient.js'
import { AlertService, NotificationService } from './alerts.js'

const priceClient = new PriceSnapshotClient()

interface FetchPricesResult {
  prices: Record<string, { price: number; change: number }>
  source: 'primary' | 'fallback' | 'empty'
}

/**
 * Fetch live prices with resilience and monitoring
 * Falls back gracefully when price source is unavailable
 */
async function fetchLivePrices(
  injectedPrices?: Record<string, { price: number; change: number }>,
): Promise<FetchPricesResult> {
  // Use injected prices if provided (for testing)
  if (injectedPrices) {
    return { prices: injectedPrices, source: 'primary' }
  }

  try {
    const prices = await priceClient.getPrices()
    const source = Object.keys(prices).length > 0 ? 'primary' : 'empty'
    return { prices, source }
  } catch (err) {
    const metrics = priceClient.getFailureMetrics()
    console.error(
      `[MatchingEngine] Failed to fetch prices from WS server. Failures: ${metrics.failureCount}`,
      err instanceof Error ? err.message : 'unknown error',
    )
    return { prices: {}, source: 'fallback' }
  }
}

export class MatchingEngine {
  private bestPrices = new Map<string, { high: number; low: number }>()
  private trading: TradingService
  private processing = false

  constructor() {
    this.trading = new TradingService()
  }

  // 1. Process Pending Orders (Limit / Stop)
  async processOrders(injectedPrices?: Record<string, { price: number; change: number }>) {
    if (this.processing) return
    this.processing = true
    try {
      const orders = await prisma.order.findMany({
        where: { status: 'pending' },
        include: { account: { include: { user: { select: { id: true, email: true } } } } },
      })
      if (orders.length === 0) return

      const result = await fetchLivePrices(injectedPrices)
      if (result.prices && Object.keys(result.prices).length === 0) {
        console.warn(`[MatchingEngine] No prices available for order matching`)
        return
      }

      let matchedCount = 0

      for (const order of orders) {
        const priceData = result.prices[order.symbol]
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

          matchedCount += 1
          console.log(
            `[MatchingEngine] Filled ${order.type} ${order.side} ${order.symbol} vol=${order.volume} @ ${currentPrice}`,
          )

          try {
            await NotificationService.create({
              userId: order.account.userId,
              type: 'order_filled',
              title: `📈 ${order.type.toUpperCase()} ${order.side.toUpperCase()} ${order.symbol} Filled`,
              message: `Volume: ${order.volume} @ $${currentPrice.toFixed(5)}`,
              data: { symbol: order.symbol, price: currentPrice, volume: order.volume, side: order.side, type: order.type },
              link: `/trade/${order.accountId}`,
            })
            import('./email.js').then(({ EmailService }) => {
              new EmailService().sendOrderFilled(order.account.user.email, order.symbol, order.side, order.type, Number(order.volume), currentPrice).catch(() => {})
            }).catch(() => {})
          } catch { /* non-blocking */ }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Matching engine execution failed'
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: 'failed',
              errorMessage: errMsg,
            },
          })
        }
      }
    } finally {
      this.processing = false
    }
  }

  // 2. Process SL / TP and update floating PnL
  async processSLTP() {
    const positions = await prisma.position.findMany({
      where: { status: 'open' },
      include: { account: { include: { user: { select: { id: true, email: true } } } } },
    })
    if (positions.length === 0) return

    const result = await fetchLivePrices()
    const prices = result.prices

    if (Object.keys(prices).length === 0) {
      console.warn(`[MatchingEngine] No prices available for SL/TP processing`)
      return
    }

    let slhitCount = 0
    let tphitCount = 0

    for (const position of positions) {
      const priceData = prices[position.symbol]
      if (!priceData || priceData.price <= 0) continue

      const currentPrice = priceData.price

      let quoteToUsdRate = 1
      if (
        !position.symbol.endsWith('USD') &&
        !position.symbol.endsWith('USDT') &&
        !position.symbol.startsWith('USD')
      ) {
        const quote = position.symbol.substring(3)
        if (quote && quote.length === 3) {
          const directSymbol = `${quote}USD`
          const inverseSymbol = `USD${quote}`
          if (prices[directSymbol]) {
            quoteToUsdRate = prices[directSymbol].price
          } else if (prices[inverseSymbol]) {
            quoteToUsdRate = 1 / prices[inverseSymbol].price
          }
        }
      }

      const floatingPnl = calculatePnL(
        position.side,
        Number(position.openPrice),
        currentPrice,
        Number(position.volume),
        position.symbol,
        quoteToUsdRate,
      )
      const sl = position.stopLoss ? Number(position.stopLoss) : null
      const tp = position.takeProfit ? Number(position.takeProfit) : null

      let closeReason: string | null = null

      if (position.side === 'buy') {
        if (sl && currentPrice <= sl) closeReason = 'stop_loss'
        else if (tp && currentPrice >= tp) closeReason = 'take_profit'
      } else {
        if (sl && currentPrice >= sl) closeReason = 'stop_loss'
        else if (tp && currentPrice <= tp) closeReason = 'take_profit'
      }

      if (closeReason) {
        try {
          // Execute close via TradingService so balance/trade history are updated correctly
          await this.trading.closePosition(position.id, position.accountId, undefined, currentPrice)

          if (closeReason === 'stop_loss') {
            slhitCount += 1
          } else {
            tphitCount += 1
          }

          console.log(`[MatchingEngine] Hit ${closeReason} for ${position.symbol} @ ${currentPrice}`)

          // Also manually update the trade record with the correct closeReason if TradingService defaults to 'manual'
          await prisma.trade.updateMany({
            where: { positionId: position.id },
            data: { closeReason },
          })

          // Create notification + email for SL/TP hit
          try {
            const account = position.account
            if (account) {
              const pnl = calculatePnL(
                position.side,
                Number(position.openPrice),
                currentPrice,
                Number(position.volume),
                position.symbol,
              )
              await NotificationService.create({
                userId: account.user.id,
                type: closeReason === 'stop_loss' ? 'stop_loss' : 'take_profit',
                title: `${closeReason === 'stop_loss' ? '🔴' : '🟢'} ${closeReason === 'stop_loss' ? 'Stop Loss' : 'Take Profit'} ${position.symbol}`,
                message: `${position.side.toUpperCase()} ${position.symbol} closed at $${currentPrice.toFixed(5)} (${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)})`,
                data: { symbol: position.symbol, price: currentPrice, pnl, side: position.side },
                link: `/trade/${position.accountId}`,
              })
              import('./email.js').then(({ EmailService }) => {
                new EmailService().sendSLTPHit(account.user.email, position.symbol, position.side, closeReason, currentPrice, pnl).catch(() => {})
              }).catch(() => {})
            }
          } catch { /* non-blocking */ }
        } catch (err: unknown) {
          console.error(`[MatchingEngine] SL/TP close failed for ${position.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      } else {
        // Update floating PnL & current price live
        try {
          await prisma.position.update({
            where: { id: position.id },
            data: {
              currentPrice,
              profit: floatingPnl,
            },
          })
        } catch (err: unknown) {
          console.error(`[MatchingEngine] Failed to update position ${position.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }
    }

    if (slhitCount > 0 || tphitCount > 0) {
      console.info(`[MatchingEngine] SL/TP processing: ${slhitCount} SL hits, ${tphitCount} TP hits`)
    }
  }

  // 3. Process Trailing Stops
  async processTrailingStops(injectedPrices?: Record<string, { price: number; change: number }>) {
    const positions = await prisma.position.findMany({
      where: {
        status: 'open',
        trailingStop: { not: null },
      },
    })
    if (positions.length === 0) return

    const result = await fetchLivePrices(injectedPrices)
    const prices = result.prices

    let trailedCount = 0

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
        try {
          await prisma.position.update({
            where: { id: posId },
            data: { stopLoss: roundedSL },
          })
          trailedCount += 1
        } catch (err: unknown) {
          console.error(`[MatchingEngine] Failed to update trailing stop for ${posId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }
    }

    if (trailedCount > 0) {
      console.debug(`[MatchingEngine] Updated ${trailedCount} trailing stops`)
    }

    // Clean up stale bestPrices entries for closed positions
    const openIds = new Set(positions.map((p) => p.id))
    for (const key of this.bestPrices.keys()) {
      if (!openIds.has(key)) this.bestPrices.delete(key)
    }
  }

  // 4. Process Break Even
  async processBreakEven(injectedPrices?: Record<string, { price: number; change: number }>) {
    const positions = await prisma.position.findMany({
      where: {
        status: 'open',
        breakEven: true,
      },
    })
    if (positions.length === 0) return

    const result = await fetchLivePrices(injectedPrices)
    const prices = result.prices

    if (Object.keys(prices).length === 0) {
      console.warn(`[MatchingEngine] No prices available for break-even processing`)
      return
    }

    let movedCount = 0

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
        try {
          await prisma.position.update({
            where: { id: position.id },
            data: {
              stopLoss: openPrice,
              breakEven: false,
            },
          })
          movedCount += 1
        } catch (err: unknown) {
          console.error(`[MatchingEngine] Failed to update break-even SL for ${position.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }
    }

    if (movedCount > 0) {
      console.debug(`[MatchingEngine] Updated ${movedCount} break-even stop losses`)
    }
  }

  // 5. Process Swap (Overnight financing)
  async processSwap() {
    const positions = await prisma.position.findMany({
      where: { status: 'open' },
      include: { account: true },
    })

    if (positions.length === 0) return

    const { SWAP_RATES, SYMBOLS } = await import('../utils/constants.js')

    const isWednesday = new Date().getUTCDay() === 3

    for (const position of positions) {
      const category = SYMBOLS[position.symbol]?.category || 'crypto'
      const rates = SWAP_RATES[category] || { long: 0, short: 0 }
      let swapRate = position.side === 'buy' ? rates.long : rates.short

      // Triple swap on Wednesday for Forex and Metals
      if (isWednesday && (category === 'forex' || category === 'metals' || category === 'indices' || category === 'stocks')) {
        swapRate *= 3
      }

      // Calculate swap cost based on volume
      // simple calculation: swap = volume * swapRate
      const swapCost = Number(position.volume) * swapRate

      if (swapCost !== 0) {
        const newSwap = Number(position.swap) + swapCost
        await prisma.position.update({
          where: { id: position.id },
          data: { swap: newSwap },
        })

        await prisma.account.update({
          where: { id: position.accountId },
          data: { balance: { increment: swapCost } },
        })
      }
    }
    console.log('[MatchingEngine] Swap processed for open positions')
  }

  async processAlerts() {
    const alerts = await AlertService.getActiveAlerts()
    if (alerts.length === 0) return

    const symbols = [...new Set(alerts.map((a) => a.symbol))]
    const prices: Record<string, number> = {}

    try {
      const allPrices = await priceClient.getPrices()
      for (const sym of symbols) {
        if (allPrices[sym] && allPrices[sym].price > 0) {
          prices[sym] = allPrices[sym].price
        }
      }
    } catch {
      // Fallback: try individual fetches
      for (const sym of symbols) {
        try {
          const priceData = await priceClient.getSinglePrice(sym)
          if (priceData?.price && priceData.price > 0) prices[sym] = priceData.price
        } catch { /* skip */ }
      }
    }

    if (Object.keys(prices).length === 0) return

    let triggeredCount = 0
    for (const alert of alerts) {
      const currentPrice = prices[alert.symbol]
      if (currentPrice === undefined) continue

      const alertPrice = Number(alert.price)
      let hit = false
      if (alert.condition === 'above' && currentPrice >= alertPrice) hit = true
      if (alert.condition === 'below' && currentPrice <= alertPrice) hit = true
      if (!hit) continue

      await AlertService.trigger(alert.id)
      await NotificationService.create({
        userId: alert.userId,
        type: 'alert_triggered',
        title: `Price Alert: ${alert.symbol} ${alert.condition === 'above' ? 'above' : 'below'} ${alertPrice}`,
        message: alert.message || undefined,
        data: { symbol: alert.symbol, price: currentPrice, alertPrice, condition: alert.condition },
        link: `/trade/${alert.userId}`,
      })

      triggeredCount++
    }
    if (triggeredCount > 0) {
      console.log(`[MatchingEngine] Alerts: triggered ${triggeredCount} alerts`)
    }
  }
}
