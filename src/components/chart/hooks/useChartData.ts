import { useCallback } from 'react'
import type {
  IChartApi,
  ISeriesApi,
  HistogramData,
  LineData,
  UTCTimestamp,
  SeriesMarker,
} from 'lightweight-charts'
import { LineSeries, LineStyle } from 'lightweight-charts'
import type { Candle, Position } from '../../../../shared/types'
import { calcMA, calcEMA, calcRSI, calcBB, calcMACD } from '../../../utils/indicators'
import { getMaxCandlesForInterval, mergeLiveCandle, trimCandles } from '../../../utils/cryptoChart'
import { buildPulseState } from '../../../utils/chartAnimation'
import { toTVTime } from '../constants'
import { toTVData, toVolumeData } from '../utils/chartTransforms'
import type { PulseState } from '../types'

interface ChartDataRefs {
  candleSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
  volumeSeriesRef: React.MutableRefObject<ISeriesApi<'Histogram'> | null>
  rsiSeriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  macdHistogramRef: React.MutableRefObject<ISeriesApi<'Histogram'> | null>
  macdLineRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  macdSignalRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  maSeriesRef: React.MutableRefObject<Map<string, ISeriesApi<'Line'>>>
  emaSeriesRef: React.MutableRefObject<Map<string, ISeriesApi<'Line'>>>
  bbUpperRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  bbMiddleRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  bbLowerRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  trendLineRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  markersPluginRef: React.MutableRefObject<ReturnType<typeof import('lightweight-charts').createSeriesMarkers> | null>
  mainChartRef: React.MutableRefObject<IChartApi | null>
  volumeChartRef: React.MutableRefObject<IChartApi | null>
  rsiChartRef: React.MutableRefObject<IChartApi | null>
  macdChartRef: React.MutableRefObject<IChartApi | null>
  dataRef: React.MutableRefObject<Candle[]>
  candleDataRef: React.MutableRefObject<Candle[]>
  dataIntervalRef: React.MutableRefObject<string>
  hasDataRef: React.MutableRefObject<boolean>
  pendingUpdateRef: React.MutableRefObject<Candle | null>
  rafRef: React.MutableRefObject<number | null>
  followLatestRef: React.MutableRefObject<boolean>
  trendPointsRef: React.MutableRefObject<{ time: number; value: number }[]>
}

interface ChartDataOptions {
  interval: string
  indicators: string[]
  showVolume: boolean
  positions?: Position[]
  colors: { volumeUp: string; volumeDown: string; up: string; down: string }
  setData: (data: Candle[]) => void
  setPulseState: (pulse: PulseState) => void
  compute: (type: string, candles: Candle[], period?: number) => Promise<unknown>
}

export function useChartData(refs: ChartDataRefs, options: ChartDataOptions) {
  const { interval, indicators, showVolume, positions, colors, setData, setPulseState, compute } = options

  const applyData = useCallback(
    (candles: Candle[]) => {
      refs.candleDataRef.current = candles
      refs.dataIntervalRef.current = interval
      setData(candles)
      refs.hasDataRef.current = true

      const tvData = toTVData(candles)
      const volData = toVolumeData(candles, colors.volumeUp, colors.volumeDown)

      refs.candleSeriesRef.current?.setData(tvData)
      if (showVolume) refs.volumeSeriesRef.current?.setData(volData)

      if (refs.rsiSeriesRef.current) {
        compute('rsi', candles, 14).then((raw) => {
          const rsiValues = raw as number[]
          const rsiData: LineData[] = rsiValues.map((v, i) => ({
            time: toTVTime(candles[i]?.time ?? 0),
            value: isNaN(v) ? 50 : v,
          }))
          refs.rsiSeriesRef.current?.setData(rsiData)
        })
      }

      if (refs.macdHistogramRef.current && refs.macdLineRef.current && refs.macdSignalRef.current) {
        compute('macd', candles).then((raw) => {
          const macdResult = raw as { macd: number[]; signal: number[]; histogram: number[] }
          const macdData: HistogramData[] = macdResult.histogram.map((v, i) => ({
            time: toTVTime(candles[i]?.time ?? 0),
            value: v,
            color: v >= 0 ? '#26a69a' : '#ef5350',
          }))
          const difData: LineData[] = macdResult.macd.map((v, i) => ({
            time: toTVTime(candles[i]?.time ?? 0),
            value: v,
          }))
          const signalData: LineData[] = macdResult.signal.map((v, i) => ({
            time: toTVTime(candles[i]?.time ?? 0),
            value: v,
          }))
          refs.macdHistogramRef.current?.setData(macdData)
          refs.macdLineRef.current?.setData(difData)
          refs.macdSignalRef.current?.setData(signalData)
        })
      }

      for (const ind of indicators) {
        if (ind.startsWith('MA') || ind.startsWith('SMA')) {
          const period = parseInt(ind.replace(/MA|SMA/, '')) || 7
          const values = calcMA(candles, period)
          let series = refs.maSeriesRef.current.get(ind)
          if (!series && refs.candleSeriesRef.current) {
            series = refs.mainChartRef.current?.addSeries(LineSeries, {
              color: '#FF9800',
              lineWidth: 1,
              lastValueVisible: false,
              priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
            })
            if (series) refs.maSeriesRef.current.set(ind, series)
          }
          if (series) {
            const lineData: LineData[] = values.map((v, i) => ({
              time: toTVTime(candles[i]?.time ?? 0),
              value: isNaN(v) ? 0 : v,
            }))
            series.setData(lineData)
          }
        } else if (ind.startsWith('EMA')) {
          const period = parseInt(ind.replace('EMA', '')) || 9
          const values = calcEMA(candles, period)
          let series = refs.emaSeriesRef.current.get(ind)
          if (!series && refs.candleSeriesRef.current) {
            series = refs.mainChartRef.current?.addSeries(LineSeries, {
              color: '#CE93D8',
              lineWidth: 1,
              lastValueVisible: false,
              priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
            })
            if (series) refs.emaSeriesRef.current.set(ind, series)
          }
          if (series) {
            const lineData: LineData[] = values.map((v, i) => ({
              time: toTVTime(candles[i]?.time ?? 0),
              value: isNaN(v) ? 0 : v,
            }))
            series.setData(lineData)
          }
        } else if (ind === 'BB') {
          if (refs.candleSeriesRef.current) {
            const bb = calcBB(candles, 20, 2)
            if (!refs.bbUpperRef.current) {
              refs.bbUpperRef.current =
                refs.mainChartRef.current?.addSeries(LineSeries, {
                  color: '#FF980080',
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  lastValueVisible: false,
                }) ?? null
              refs.bbMiddleRef.current =
                refs.mainChartRef.current?.addSeries(LineSeries, {
                  color: '#FF980040',
                  lineWidth: 1,
                  lastValueVisible: false,
                }) ?? null
              refs.bbLowerRef.current =
                refs.mainChartRef.current?.addSeries(LineSeries, {
                  color: '#FF980080',
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  lastValueVisible: false,
                }) ?? null
            }
            const upperData: LineData[] = bb.upper.map((v, i) => ({
              time: toTVTime(candles[i]?.time ?? 0),
              value: isNaN(v) ? 0 : v,
            }))
            const middleData: LineData[] = bb.middle.map((v, i) => ({
              time: toTVTime(candles[i]?.time ?? 0),
              value: isNaN(v) ? 0 : v,
            }))
            const lowerData: LineData[] = bb.lower.map((v, i) => ({
              time: toTVTime(candles[i]?.time ?? 0),
              value: isNaN(v) ? 0 : v,
            }))
            refs.bbUpperRef.current?.setData(upperData)
            refs.bbMiddleRef.current?.setData(middleData)
            refs.bbLowerRef.current?.setData(lowerData)
          }
        }
      }

      if (refs.candleSeriesRef.current && positions) {
        const markers: SeriesMarker<UTCTimestamp>[] = positions.map((p) => ({
          time: toTVTime(new Date(p.createdAt).getTime() / 1000),
          position: p.side === 'buy' ? 'belowBar' : 'aboveBar',
          color: p.side === 'buy' ? colors.up : colors.down,
          shape: p.side === 'buy' ? 'arrowUp' : 'arrowDown',
          text: `${Number(p.volume).toFixed(2)}`,
          size: 1,
        }))
        refs.markersPluginRef.current?.setMarkers(markers)
      }

      if (refs.trendLineRef.current && refs.trendPointsRef.current.length === 2) {
        const pts = refs.trendPointsRef.current
        refs.trendLineRef.current.setData([
          { time: toTVTime(pts[0].time), value: pts[0].value },
          { time: toTVTime(pts[1].time), value: pts[1].value },
        ])
      }

      if (tvData.length > 0 && refs.followLatestRef.current) {
        const charts = [
          refs.mainChartRef.current,
          showVolume ? refs.volumeChartRef.current : null,
          refs.rsiChartRef.current,
          refs.macdChartRef.current,
        ].filter(Boolean) as IChartApi[]
        charts.forEach((c) => {
          try {
            c.timeScale().fitContent()
          } catch {}
        })
      }
    },
    [interval, indicators, positions, colors, showVolume, setData, compute, refs],
  )

  const updateCandle = useCallback(
    (candle: Candle) => {
      if (!refs.candleSeriesRef.current) return
      const tvTime = toTVTime(candle.time)

      refs.candleSeriesRef.current.update({
        time: tvTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })

      if (showVolume) {
        refs.volumeSeriesRef.current?.update({
          time: tvTime,
          value: candle.volume ?? 0,
          color: candle.close >= candle.open ? colors.volumeUp : colors.volumeDown,
        })
      }

      const currentData = refs.dataRef.current
      const needRsi = refs.rsiSeriesRef.current
      const needMacd = refs.macdHistogramRef.current && refs.macdLineRef.current && refs.macdSignalRef.current

      if (needRsi || needMacd) {
        const windowLen = needMacd ? 26 : 14
        const windowData =
          currentData.length >= windowLen ? [...currentData.slice(-(windowLen - 1)), candle] : null

        if (windowData && windowData.length >= windowLen) {
          if (needRsi && windowLen >= 14) {
            const rsiVal = calcRSI(windowData, 14)
            const lastRsi = rsiVal[rsiVal.length - 1]
            refs.rsiSeriesRef.current!.update({
              time: tvTime,
              value: isNaN(lastRsi) ? 50 : lastRsi,
            })
          }

          if (needMacd) {
            const macdResult = calcMACD(windowData)
            const i = macdResult.histogram.length - 1
            refs.macdHistogramRef.current!.update({
              time: tvTime,
              value: macdResult.histogram[i],
              color: macdResult.histogram[i] >= 0 ? '#26a69a' : '#ef5350',
            })
            refs.macdLineRef.current!.update({ time: tvTime, value: macdResult.macd[i] })
            refs.macdSignalRef.current!.update({ time: tvTime, value: macdResult.signal[i] })
          }
        }
      }
    },
    [colors, showVolume, refs],
  )

  const flushUpdate = useCallback(() => {
    const candle = refs.pendingUpdateRef.current
    refs.pendingUpdateRef.current = null
    refs.rafRef.current = null
    if (candle) updateCandle(candle)
  }, [updateCandle, refs])

  const onInitial = useCallback(
    (candles: Candle[]) => {
      applyData(candles)
    },
    [applyData],
  )

  const onCandle = useCallback(
    (candle: Candle) => {
      const prev = refs.dataRef.current
      const merged = mergeLiveCandle(
        prev.map((item) => ({
          time: item.time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume ?? 0,
        })),
        {
          time: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume ?? 0,
        },
      )

      const next = trimCandles(merged, getMaxCandlesForInterval(interval)).map((item) => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      }))

      const previousClose = next.length > 1 ? next[next.length - 2].close : candle.close
      const pulse = buildPulseState(previousClose, candle.close)
      setPulseState(pulse)
      refs.dataRef.current = next
      setData(next)
      refs.pendingUpdateRef.current = candle
      if (refs.rafRef.current === null) {
        refs.rafRef.current = requestAnimationFrame(flushUpdate)
      }
    },
    [interval, flushUpdate, setData, setPulseState, refs],
  )

  return { applyData, updateCandle, onInitial, onCandle, flushUpdate }
}