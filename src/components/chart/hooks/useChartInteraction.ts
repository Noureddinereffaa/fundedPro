import { useCallback } from 'react'
import type { IChartApi, ISeriesApi, MouseEventParams, Time } from 'lightweight-charts'
import { calcRSI, calcMACD } from '../../../utils/indicators'
import type { Candle } from '../../../../shared/types'
import { binarySearchTime } from '../utils/chartTransforms'

interface InteractionRefs {
  dataRef: React.MutableRefObject<Candle[]>
  volumeChartRef: React.MutableRefObject<IChartApi | null>
  volumeSeriesRef: React.MutableRefObject<ISeriesApi<'Histogram'> | null>
  rsiChartRef: React.MutableRefObject<IChartApi | null>
  rsiSeriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  macdChartRef: React.MutableRefObject<IChartApi | null>
  macdLineRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  macdSignalRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  crosshairPendingRef: React.MutableRefObject<{ time: Time; candle: Candle } | null>
  crosshairRafRef: React.MutableRefObject<number | null>
}

interface InteractionOptions {
  showVolume: boolean
}

export function useChartInteraction(refs: InteractionRefs, options: InteractionOptions) {
  const { showVolume } = options

  const flushCrosshair = useCallback(() => {
    const pending = refs.crosshairPendingRef.current
    refs.crosshairPendingRef.current = null
    refs.crosshairRafRef.current = null
    if (!pending) return

    const { time, candle } = pending
    const data = refs.dataRef.current

    if (showVolume && refs.volumeChartRef.current && refs.volumeSeriesRef.current) {
      refs.volumeChartRef.current.setCrosshairPosition(candle.volume || 0, time, refs.volumeSeriesRef.current)
    }

    if (refs.rsiChartRef.current && refs.rsiSeriesRef.current) {
      const idx = binarySearchTime(data, candle.time)
      if (idx >= 0) {
        const window = data.slice(Math.max(0, idx - 13), idx + 1)
        if (window.length >= 14) {
          const rsiVal = calcRSI(window, 14)
          const lastRsi = rsiVal[rsiVal.length - 1]
          refs.rsiChartRef.current.setCrosshairPosition(isNaN(lastRsi) ? 50 : lastRsi, time, refs.rsiSeriesRef.current)
        }
      }
    }

    if (refs.macdChartRef.current && refs.macdLineRef.current) {
      const idx = binarySearchTime(data, candle.time)
      if (idx >= 0) {
        const window = data.slice(Math.max(0, idx - 25), idx + 1)
        if (window.length >= 26) {
          const macdResult = calcMACD(window)
          const i = macdResult.macd.length - 1
          refs.macdChartRef.current.setCrosshairPosition(macdResult.macd[i], time, refs.macdLineRef.current)
          if (refs.macdSignalRef.current) {
            refs.macdChartRef.current.setCrosshairPosition(macdResult.signal[i], time, refs.macdSignalRef.current)
          }
        }
      }
    }
  }, [showVolume, refs])

  const handleCrosshairMove = useCallback(
    (param: MouseEventParams) => {
      if (!param?.time) return
      const t = Number(param.time)
      const data = refs.dataRef.current
      const idx = binarySearchTime(data, t)
      const candle = idx >= 0 ? data[idx] : undefined
      if (!candle) return

      refs.crosshairPendingRef.current = { time: param.time as Time, candle }
      if (refs.crosshairRafRef.current === null) {
        refs.crosshairRafRef.current = requestAnimationFrame(flushCrosshair)
      }
    },
    [flushCrosshair, refs],
  )

  return { handleCrosshairMove, flushCrosshair }
}