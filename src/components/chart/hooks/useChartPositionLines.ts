import { useEffect } from 'react'
import { LineStyle } from 'lightweight-charts'
import type { ISeriesApi, IPriceLine } from 'lightweight-charts'
import type { Position, Order } from '../../../../shared/types'
import type { PulseState } from '../types'

interface PositionLinesRefs {
  candleSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
  entryPriceLinesRef: React.MutableRefObject<Map<string, IPriceLine>>
  slTpLinesRef: React.MutableRefObject<Map<string, { sl: IPriceLine | null; tp: IPriceLine | null }>>
  orderLinesRef: React.MutableRefObject<Map<string, IPriceLine>>
  prevPositionIdsRef: React.MutableRefObject<Set<string>>
}

interface PositionLinesOptions {
  positions?: Position[]
  orders?: Order[]
  colors: { up: string; down: string; wickUp: string; wickDown: string }
  pulseState: PulseState
}

export function useChartPositionLines(refs: PositionLinesRefs, options: PositionLinesOptions) {
  const { positions, orders, colors, pulseState } = options

  useEffect(() => {
    const series = refs.candleSeriesRef.current
    if (!series) return

    if (pulseState.direction === 'up') {
      series.applyOptions({
        upColor: colors.up,
        borderUpColor: colors.up,
        wickUpColor: colors.wickUp,
      })
      const timer = window.setTimeout(() => {
        series.applyOptions({
          upColor: colors.up,
          borderUpColor: colors.up,
          wickUpColor: colors.wickUp,
        })
      }, 220)
      return () => window.clearTimeout(timer)
    }

    if (pulseState.direction === 'down') {
      series.applyOptions({
        downColor: colors.down,
        borderDownColor: colors.down,
        wickDownColor: colors.wickDown,
      })
      const timer = window.setTimeout(() => {
        series.applyOptions({
          downColor: colors.down,
          borderDownColor: colors.down,
          wickDownColor: colors.wickDown,
        })
      }, 220)
      return () => window.clearTimeout(timer)
    }
  }, [pulseState, colors, refs])

  useEffect(() => {
    const series = refs.candleSeriesRef.current
    if (!series || !positions) return

    const currentIds = new Set<string>()

    for (const p of positions) {
      currentIds.add(p.id)

      const existing = refs.entryPriceLinesRef.current.get(p.id)
      const entryColor = p.side === 'buy' ? colors.up : colors.down
      if (existing) {
        existing.applyOptions({ price: Number(p.openPrice), color: entryColor })
      } else {
        refs.entryPriceLinesRef.current.set(
          p.id,
          series.createPriceLine({
            price: Number(p.openPrice),
            color: entryColor,
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: ` ${p.side === 'buy' ? '▲' : '▼'} ${p.symbol} @ ${Number(p.openPrice)}`,
          }),
        )
      }

      let slTp = refs.slTpLinesRef.current.get(p.id)
      if (!slTp) {
        slTp = { sl: null, tp: null }
        refs.slTpLinesRef.current.set(p.id, slTp)
      }
      if (p.stopLoss) {
        if (slTp.sl) {
          slTp.sl.applyOptions({ price: Number(p.stopLoss) })
        } else {
          slTp.sl = series.createPriceLine({
            price: Number(p.stopLoss),
            color: '#ef5350',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `SL ${p.symbol}`,
          })
        }
      } else if (slTp.sl) {
        series.removePriceLine(slTp.sl)
        slTp.sl = null
      }
      if (p.takeProfit) {
        if (slTp.tp) {
          slTp.tp.applyOptions({ price: Number(p.takeProfit) })
        } else {
          slTp.tp = series.createPriceLine({
            price: Number(p.takeProfit),
            color: '#26a69a',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `TP ${p.symbol}`,
          })
        }
      } else if (slTp.tp) {
        series.removePriceLine(slTp.tp)
        slTp.tp = null
      }
    }

    for (const [id, pl] of refs.entryPriceLinesRef.current) {
      if (!currentIds.has(id)) {
        series.removePriceLine(pl)
        refs.entryPriceLinesRef.current.delete(id)
      }
    }
    for (const [id, { sl, tp }] of refs.slTpLinesRef.current) {
      if (!currentIds.has(id)) {
        if (sl) series.removePriceLine(sl)
        if (tp) series.removePriceLine(tp)
        refs.slTpLinesRef.current.delete(id)
      }
    }
    refs.prevPositionIdsRef.current = currentIds
  }, [positions, colors, refs])

  useEffect(() => {
    const series = refs.candleSeriesRef.current
    if (!series || !orders) return

    const currentOrderIds = new Set<string>()

    for (const o of orders) {
      if (o.status !== 'pending') continue
      currentOrderIds.add(o.id)

      const existing = refs.orderLinesRef.current.get(o.id)
      const orderColor = o.side === 'buy' ? '#4CAF50' : '#FF9800'
      const orderPrice = Number(o.price)

      if (existing) {
        existing.applyOptions({ price: orderPrice, color: orderColor })
      } else {
        refs.orderLinesRef.current.set(
          o.id,
          series.createPriceLine({
            price: orderPrice,
            color: orderColor,
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `${o.side === 'buy' ? 'BUY' : 'SELL'} ${o.symbol} @ ${orderPrice}`,
          }),
        )
      }
    }

    for (const [id, pl] of refs.orderLinesRef.current) {
      if (!currentOrderIds.has(id)) {
        series.removePriceLine(pl)
        refs.orderLinesRef.current.delete(id)
      }
    }
  }, [orders, refs])
}