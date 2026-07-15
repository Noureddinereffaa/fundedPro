import { useCallback } from 'react'
import { LineStyle, LineSeries } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, IPriceLine, MouseEventParams } from 'lightweight-charts'
import type { Position } from '../../../../shared/types'
import { toTVTime } from '../constants'
import { PROXIMITY_PX, type DrawingMode, type AdjustingTarget } from '../types'

interface DrawingRefs {
  containerRef: React.RefObject<HTMLDivElement | null>
  candleSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
  mainChartRef: React.MutableRefObject<IChartApi | null>
  slTpLinesRef: React.MutableRefObject<Map<string, { sl: IPriceLine | null; tp: IPriceLine | null }>>
  hlinePricesRef: React.MutableRefObject<number[]>
  hlinePriceLineRefsRef: React.MutableRefObject<IPriceLine[]>
  trendPointsRef: React.MutableRefObject<{ time: number; value: number }[]>
  trendLineRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  drawingModeRef: React.MutableRefObject<DrawingMode>
  adjustingRef: React.MutableRefObject<AdjustingTarget | null>
  hoveredLineRef: React.MutableRefObject<AdjustingTarget | null>
  onPriceSelectRef: React.MutableRefObject<((price: number) => void) | undefined>
  onModifyRef: React.MutableRefObject<((positionId: string, data: { stopLoss?: number; takeProfit?: number }) => void) | undefined>
}

interface DrawingOptions {
  positions?: Position[]
  setAdjusting: (target: AdjustingTarget | null) => void
}

export function useChartDrawing(refs: DrawingRefs, options: DrawingOptions) {
  const { positions, setAdjusting } = options

  const isNearPriceLine = useCallback(
    (clickY: number): AdjustingTarget | null => {
      const series = refs.candleSeriesRef.current
      if (!series || !refs.containerRef.current || !positions) return null

      const rect = refs.containerRef.current.getBoundingClientRect()
      const chartY = clickY - rect.top

      for (const pos of positions) {
        const slTp = refs.slTpLinesRef.current.get(pos.id)
        if (!slTp) continue

        if (slTp.sl) {
          const lineY = series.priceToCoordinate(Number(pos.stopLoss))
          if (lineY !== null && Math.abs(chartY - lineY) < PROXIMITY_PX) {
            return { positionId: pos.id, type: 'sl' }
          }
        }
        if (slTp.tp) {
          const lineY = series.priceToCoordinate(Number(pos.takeProfit))
          if (lineY !== null && Math.abs(chartY - lineY) < PROXIMITY_PX) {
            return { positionId: pos.id, type: 'tp' }
          }
        }
      }
      return null
    },
    [positions, refs],
  )

  const handleChartClick = useCallback(
    (param: MouseEventParams) => {
      if (!param.time) return

      const price =
        param.point?.y !== undefined ? refs.candleSeriesRef.current?.coordinateToPrice?.(param.point.y) : undefined
      if (price === undefined || price === null) return

      const adjusting = refs.adjustingRef.current
      if (adjusting) {
        const pos = positions?.find((p) => p.id === adjusting.positionId)
        if (pos && refs.onModifyRef.current) {
          const data = adjusting.type === 'sl' ? { stopLoss: price } : { takeProfit: price }
          refs.onModifyRef.current(pos.id, data)
        }
        refs.adjustingRef.current = null
        setAdjusting(null)
        return
      }

      const nearLine = isNearPriceLine(param.point?.y ?? 0)
      if (nearLine) {
        refs.adjustingRef.current = nearLine
        setAdjusting(nearLine)
        return
      }

      if (refs.drawingModeRef.current === 'none') {
        refs.onPriceSelectRef.current?.(price)
        return
      }

      const time = Number(param.time)

      if (refs.drawingModeRef.current === 'hline') {
        refs.hlinePricesRef.current.push(price)
        const pl = refs.candleSeriesRef.current?.createPriceLine({
          price,
          color: '#FF9800',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: price.toFixed(5),
        })
        if (pl) refs.hlinePriceLineRefsRef.current.push(pl)
      } else if (refs.drawingModeRef.current === 'trend') {
        if (refs.trendPointsRef.current.length === 0) {
          refs.trendPointsRef.current = [{ time, value: price }]
        } else {
          refs.trendPointsRef.current.push({ time, value: price })
          if (refs.trendLineRef.current) {
            refs.trendLineRef.current.setData([
              { time: toTVTime(refs.trendPointsRef.current[0].time), value: refs.trendPointsRef.current[0].value },
              { time: toTVTime(refs.trendPointsRef.current[1].time), value: refs.trendPointsRef.current[1].value },
            ])
          } else if (refs.mainChartRef.current) {
            refs.trendLineRef.current = refs.mainChartRef.current.addSeries(LineSeries, {
              color: '#2962FF',
              lineWidth: 2,
              lastValueVisible: false,
              priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
            })
            refs.trendLineRef.current.setData([
              { time: toTVTime(refs.trendPointsRef.current[0].time), value: refs.trendPointsRef.current[0].value },
              { time: toTVTime(refs.trendPointsRef.current[1].time), value: refs.trendPointsRef.current[1].value },
            ])
          }
          refs.trendPointsRef.current = []
        }
      }
    },
    [isNearPriceLine, positions, setAdjusting, refs],
  )

  const handleContainerMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (refs.adjustingRef.current) {
        if (refs.containerRef.current) refs.containerRef.current.style.cursor = 'grabbing'
        return
      }
      const near = isNearPriceLine(e.clientY)
      if (near) {
        refs.hoveredLineRef.current = near
        if (refs.containerRef.current) refs.containerRef.current.style.cursor = 'pointer'
      } else {
        refs.hoveredLineRef.current = null
        if (refs.containerRef.current) refs.containerRef.current.style.cursor = ''
      }
    },
    [isNearPriceLine, refs],
  )

  const handleContainerMouseLeave = useCallback(() => {
    refs.hoveredLineRef.current = null
    if (refs.containerRef.current) refs.containerRef.current.style.cursor = ''
  }, [refs])

  return { handleChartClick, handleContainerMouseMove, handleContainerMouseLeave, isNearPriceLine }
}