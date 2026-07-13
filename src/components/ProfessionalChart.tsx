import { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
} from 'lightweight-charts'
import type {
  IChartApi,
  ISeriesApi,
  IPriceLine,
  CandlestickData,
  HistogramData,
  LineData,
  UTCTimestamp,
  SeriesMarker,
  Time,
} from 'lightweight-charts'
import { useRealtimeCandles, useMarketStatus, useLivePrice, useSmoothTotalFloatingPnl } from '../utils/useRealtime'
import { calcMA, calcEMA, calcRSI, calcBB, calcMACD } from '../utils/indicators'
import { useWorkerIndicators } from '../utils/useWorkerIndicators'
import { resolveChartReferencePrice } from '../utils/chartPrice'
import { getMaxCandlesForInterval, mergeLiveCandle, trimCandles } from '../utils/cryptoChart'
import { buildPulseState, getAnimationIntensity, getPulseVisualStyle } from '../utils/chartAnimation'
import type { Candle, Position, Order, ConnectionStatus } from '../../shared/types'
import { ChartToolbar, ChartPanes, ChartOverlays, getChartColors, CHART_LAYOUT, toTVTime } from './chart'

function binarySearchTime(arr: Candle[], time: number): number {
  let lo = 0,
    hi = arr.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const t = arr[mid].time as number
    if (t === time) return mid
    if (t < time) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}

interface ProfessionalChartProps {
  symbol: string
  interval: string
  theme?: 'dark' | 'light'
  onPriceSelect?: (price: number) => void
  positions?: Position[]
  orders?: Order[]
  locale?: 'ar' | 'en'
  indicators?: string[]
  connectionStatus?: ConnectionStatus
  showVolume?: boolean
  showDrawingTools?: boolean
  onModifyPosition?: (positionId: string, data: { stopLoss?: number; takeProfit?: number }) => void
  onModifyOrder?: (orderId: string, data: { price?: number; stopLoss?: number; takeProfit?: number }) => void
}

const PROXIMITY_PX = 8

const ProfessionalChart = memo(function ProfessionalChart({
  symbol,
  interval,
  theme = 'dark',
  onPriceSelect,
  positions,
  orders,
  indicators = [],
  showVolume = true,
  showDrawingTools = true,
  onModifyPosition,
  onModifyOrder,
}: ProfessionalChartProps) {
  const colors = getChartColors(theme)
  const { t, i18n } = useTranslation('trading')
  const direction = i18n.language === 'ar' ? 'rtl' : 'ltr'

  const containerRef = useRef<HTMLDivElement>(null)
  const mainPaneRef = useRef<HTMLDivElement>(null)
  const volumePaneRef = useRef<HTMLDivElement>(null)
  const rsiPaneRef = useRef<HTMLDivElement>(null)
  const macdPaneRef = useRef<HTMLDivElement>(null)

  const mainChartRef = useRef<IChartApi | null>(null)
  const volumeChartRef = useRef<IChartApi | null>(null)
  const rsiChartRef = useRef<IChartApi | null>(null)
  const macdChartRef = useRef<IChartApi | null>(null)

  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const macdHistogramRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null)
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null)

  const maSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
  const emaSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null)
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null)
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null)
  const trendLineRef = useRef<ISeriesApi<'Line'> | null>(null)
  const markersPluginRef = useRef<ReturnType<typeof createSeriesMarkers<Time>> | null>(null)
  const referencePriceLineRef = useRef<IPriceLine | null>(null)
  const entryPriceLinesRef = useRef<Map<string, IPriceLine>>(new Map())
  const slTpLinesRef = useRef<Map<string, { sl: IPriceLine | null; tp: IPriceLine | null }>>(new Map())
  const orderLinesRef = useRef<Map<string, IPriceLine>>(new Map())

  const [data, setData] = useState<Candle[]>([])
  const dataRef = useRef(data)
  dataRef.current = data
  const candleDataRef = useRef<Candle[]>([])
  const dataIntervalRef = useRef('')
  const [chartKey, setChartKey] = useState(0)
  const hasDataRef = useRef(false)
  const pendingUpdateRef = useRef<Candle | null>(null)
  const rafRef = useRef<number | null>(null)
  const hlinePricesRef = useRef<number[]>([])
  const trendPointsRef = useRef<{ time: number; value: number }[]>([])
  const drawingModeRef = useRef<'none' | 'hline' | 'trend'>('none')
  const [drawingMode, setDrawingMode] = useState<'none' | 'hline' | 'trend'>('none')
  const [followLatest, setFollowLatest] = useState(true)
  const [pulseState, setPulseState] = useState({ direction: 'flat' as const, intensity: 0 })
  const followLatestRef = useRef(true)
  followLatestRef.current = followLatest
  const prevPositionIdsRef = useRef<Set<string>>(new Set())
  const onPriceSelectRef = useRef(onPriceSelect)
  onPriceSelectRef.current = onPriceSelect
  const onModifyRef = useRef(onModifyPosition)
  onModifyRef.current = onModifyPosition
  const onModifyOrderRef = useRef(onModifyOrder)
  onModifyOrderRef.current = onModifyOrder
  const hlinePriceLineRefsRef = useRef<IPriceLine[]>([])
  const crosshairPendingRef = useRef<{ time: Time; candle: Candle } | null>(null)
  const crosshairRafRef = useRef<number | null>(null)
  const resizeTimerRef = useRef<number | null>(null)
  const { compute } = useWorkerIndicators()
  const workerBusyRef = useRef(false)

  const adjustingRef = useRef<{ positionId: string; type: 'sl' | 'tp' } | null>(null)
  const [adjusting, setAdjusting] = useState<{ positionId: string; type: 'sl' | 'tp' } | null>(null)
  const hoveredLineRef = useRef<{ positionId: string; type: 'sl' | 'tp' } | null>(null)

  const toTVData = useCallback((candles: Candle[]): CandlestickData[] => {
    return candles.map((c) => ({
      time: toTVTime(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))
  }, [])

  const toVolumeData = useCallback(
    (candles: Candle[]): HistogramData[] => {
      return candles.map((c) => ({
        time: toTVTime(c.time),
        value: c.volume || 0,
        color: c.close >= c.open ? colors.volumeUp : colors.volumeDown,
      }))
    },
    [colors],
  )

  const paneLayout = useMemo(() => {
    let mainH = CHART_LAYOUT.main
    let volH = showVolume ? CHART_LAYOUT.volume : 0
    let rsiH = CHART_LAYOUT.rsi
    let macdH = CHART_LAYOUT.macd

    if (!indicators.includes('RSI')) rsiH = 0
    if (!indicators.includes('MACD')) macdH = 0

    const totalH = mainH + volH + rsiH + macdH
    const scale = 1 / totalH

    const main = mainH * scale
    const volume = volH * scale
    const rsi = rsiH * scale
    const macd = macdH * scale

    return {
      main: { top: 0, height: main },
      volume: { top: main, height: volume },
      rsi: { top: main + volume, height: rsi },
      macd: { top: main + volume + rsi, height: macd },
    }
  }, [indicators, showVolume])

  const createPaneChart = useCallback(
    (container: HTMLDivElement | null, heightPct: number): IChartApi | null => {
      if (!container || !containerRef.current) return null
      const containerHeight = containerRef.current.clientHeight
      const height = Math.max(20, Math.floor(containerHeight * heightPct))

      return createChart(container, {
        height,
        width: containerRef.current.clientWidth,
        layout: {
          background: { type: ColorType.Solid, color: colors.bg },
          textColor: colors.text,
          fontSize: 10,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        grid: {
          vertLines: { color: colors.grid, style: LineStyle.Dotted },
          horzLines: { color: colors.grid, style: LineStyle.Dotted },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: colors.border,
          visible: true,
          scaleMargins: { top: 0.05, bottom: 0.05 },
        },
        layout: {
          background: { type: ColorType.Solid, color: colors.bg },
          textColor: colors.text,
          fontSize: 11,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        timeScale: {
          borderColor: colors.border,
          timeVisible: true,
          secondsVisible: false,
          fixLeftEdge: true,
          rightOffset: 6,
          barSpacing: 6,
        },
        handleScroll: { vertTouchDrag: false },
        handleScale: { axisPressedMouseMove: true },
      })
    },
    [colors],
  )

  const resizeAllCharts = useCallback(() => {
    if (!containerRef.current) return
    const { clientWidth: w, clientHeight: h } = containerRef.current
    if (w === 0 || h === 0) return
    const entries: { chart: IChartApi | null; pct: number }[] = [
      { chart: mainChartRef.current, pct: paneLayout.main.height },
      { chart: showVolume ? volumeChartRef.current : null, pct: paneLayout.volume.height },
      { chart: rsiChartRef.current, pct: paneLayout.rsi.height },
      { chart: macdChartRef.current, pct: paneLayout.macd.height },
    ]
    for (const { chart, pct } of entries) {
      if (!chart) continue
      chart.applyOptions({ width: w, height: Math.max(20, Math.floor(h * pct)) })
    }
  }, [paneLayout, showVolume])

  const destroyCharts = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (crosshairRafRef.current !== null) {
      cancelAnimationFrame(crosshairRafRef.current)
      crosshairRafRef.current = null
    }
    crosshairPendingRef.current = null
    pendingUpdateRef.current = null
    mainChartRef.current?.remove()
    mainChartRef.current = null
    volumeChartRef.current?.remove()
    volumeChartRef.current = null
    rsiChartRef.current?.remove()
    rsiChartRef.current = null
    macdChartRef.current?.remove()
    macdChartRef.current = null
    if (referencePriceLineRef.current) {
      candleSeriesRef.current?.removePriceLine(referencePriceLineRef.current)
      referencePriceLineRef.current = null
    }
    candleSeriesRef.current = null
    volumeSeriesRef.current = null
    rsiSeriesRef.current = null
    macdHistogramRef.current = null
    macdLineRef.current = null
    macdSignalRef.current = null
    maSeriesRef.current.clear()
    emaSeriesRef.current.clear()
    bbUpperRef.current = null
    bbMiddleRef.current = null
    bbLowerRef.current = null
    trendLineRef.current = null
    hlinePriceLineRefsRef.current = []
    entryPriceLinesRef.current.forEach((pl) => {
      candleSeriesRef.current?.removePriceLine(pl)
    })
    entryPriceLinesRef.current.clear()
    slTpLinesRef.current.forEach(({ sl, tp }) => {
      if (sl) candleSeriesRef.current?.removePriceLine(sl)
      if (tp) candleSeriesRef.current?.removePriceLine(tp)
    })
    slTpLinesRef.current.clear()
    orderLinesRef.current.forEach((pl) => {
      candleSeriesRef.current?.removePriceLine(pl)
    })
    orderLinesRef.current.clear()
  }, [])

  const isNearPriceLine = useCallback(
    (clickY: number): { positionId: string; type: 'sl' | 'tp' } | null => {
      const series = candleSeriesRef.current
      if (!series || !containerRef.current || !positions) return null

      const rect = containerRef.current.getBoundingClientRect()
      const chartY = clickY - rect.top

      for (const pos of positions) {
        const slTp = slTpLinesRef.current.get(pos.id)
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
    [positions],
  )

  const handleChartClick = useCallback(
    (param: any) => {
      if (!param.time) return

      const price =
        param.point?.y !== undefined ? candleSeriesRef.current?.coordinateToPrice?.(param.point.y) : undefined
      if (price === undefined || price === null) return

      const adjusting = adjustingRef.current
      if (adjusting) {
        const pos = positions?.find((p) => p.id === adjusting.positionId)
        if (pos && onModifyRef.current) {
          const data = adjusting.type === 'sl' ? { stopLoss: price } : { takeProfit: price }
          onModifyRef.current(pos.id, data)
        }
        adjustingRef.current = null
        setAdjusting(null)
        return
      }

      const nearLine = isNearPriceLine(param.point.y)
      if (nearLine) {
        adjustingRef.current = nearLine
        setAdjusting(nearLine)
        return
      }

      if (drawingModeRef.current === 'none') {
        onPriceSelectRef.current?.(price)
        return
      }

      const time = Number(param.time)

      if (drawingModeRef.current === 'hline') {
        hlinePricesRef.current.push(price)
        const pl = candleSeriesRef.current?.createPriceLine({
          price,
          color: '#FF9800',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: price.toFixed(5),
        })
        if (pl) hlinePriceLineRefsRef.current.push(pl)
      } else if (drawingModeRef.current === 'trend') {
        if (trendPointsRef.current.length === 0) {
          trendPointsRef.current = [{ time, value: price }]
        } else {
          trendPointsRef.current.push({ time, value: price })
          if (trendLineRef.current) {
            trendLineRef.current.setData([
              { time: toTVTime(trendPointsRef.current[0].time), value: trendPointsRef.current[0].value },
              { time: toTVTime(trendPointsRef.current[1].time), value: trendPointsRef.current[1].value },
            ])
          } else if (mainChartRef.current) {
            trendLineRef.current = mainChartRef.current.addSeries(LineSeries, {
              color: '#2962FF',
              lineWidth: 2,
              lastValueVisible: false,
              priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
            })
            trendLineRef.current.setData([
              { time: toTVTime(trendPointsRef.current[0].time), value: trendPointsRef.current[0].value },
              { time: toTVTime(trendPointsRef.current[1].time), value: trendPointsRef.current[1].value },
            ])
          }
          trendPointsRef.current = []
        }
      }
    },
    [isNearPriceLine, positions],
  )

  const handleContainerMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (adjustingRef.current) {
        if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
        return
      }
      const near = isNearPriceLine(e.clientY)
      if (near) {
        hoveredLineRef.current = near
        if (containerRef.current) containerRef.current.style.cursor = 'pointer'
      } else {
        hoveredLineRef.current = null
        if (containerRef.current) containerRef.current.style.cursor = ''
      }
    },
    [isNearPriceLine],
  )

  const handleContainerMouseLeave = useCallback(() => {
    hoveredLineRef.current = null
    if (containerRef.current) containerRef.current.style.cursor = ''
  }, [])

  const handleCrosshairMove = useCallback(
    (param: any) => {
      if (!param?.time) return
      const t = Number(param.time)
      const data = dataRef.current
      const idx = binarySearchTime(data, t)
      const candle = idx >= 0 ? data[idx] : undefined
      if (!candle) return

      crosshairPendingRef.current = { time: param.time as Time, candle }
      if (crosshairRafRef.current === null) {
        crosshairRafRef.current = requestAnimationFrame(flushCrosshair)
      }
    },
    [],
  )

  const flushCrosshair = useCallback(() => {
    const pending = crosshairPendingRef.current
    crosshairPendingRef.current = null
    crosshairRafRef.current = null
    if (!pending) return

    const { time, candle } = pending
    const data = dataRef.current

    if (showVolume && volumeChartRef.current && volumeSeriesRef.current) {
      volumeChartRef.current.setCrosshairPosition(candle.volume || 0, time, volumeSeriesRef.current)
    }

    if (rsiChartRef.current && rsiSeriesRef.current) {
      const idx = binarySearchTime(data, candle.time)
      if (idx >= 0) {
        const window = data.slice(Math.max(0, idx - 13), idx + 1)
        if (window.length >= 14) {
          const rsiVal = calcRSI(window, 14)
          const lastRsi = rsiVal[rsiVal.length - 1]
          rsiChartRef.current.setCrosshairPosition(isNaN(lastRsi) ? 50 : lastRsi, time, rsiSeriesRef.current)
        }
      }
    }

    if (macdChartRef.current && macdLineRef.current) {
      const idx = binarySearchTime(data, candle.time)
      if (idx >= 0) {
        const window = data.slice(Math.max(0, idx - 25), idx + 1)
        if (window.length >= 26) {
          const macdResult = calcMACD(window)
          const i = macdResult.macd.length - 1
          macdChartRef.current.setCrosshairPosition(macdResult.macd[i], time, macdLineRef.current)
          if (macdSignalRef.current) {
            macdChartRef.current.setCrosshairPosition(macdResult.signal[i], time, macdSignalRef.current)
          }
        }
      }
    }
  }, [showVolume])

  const initCharts = useCallback(() => {
    destroyCharts()

    if (mainPaneRef.current) {
      const chart = createPaneChart(mainPaneRef.current, paneLayout.main.height)
      if (chart) {
        mainChartRef.current = chart
        candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
          upColor: colors.up,
          downColor: colors.down,
          borderUpColor: colors.up,
          borderDownColor: colors.down,
          wickUpColor: colors.wickUp,
          wickDownColor: colors.wickDown,
          priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
          borderVisible: true,
          wickVisible: true,
        })
        markersPluginRef.current = createSeriesMarkers(candleSeriesRef.current, [], {})
        chart.subscribeClick(handleChartClick)
        chart.subscribeCrosshairMove(handleCrosshairMove)
        chart.timeScale().subscribeVisibleTimeRangeChange(() => {
          const data = candleSeriesRef.current?.data()
          if (!data || data.length === 0) return
          const range = chart.timeScale().getVisibleLogicalRange()
          if (!range) return
          const latestIdx = data.length - 1
          const isAtRightEdge = range.to >= latestIdx - 2
          if (isAtRightEdge !== followLatestRef.current) {
            followLatestRef.current = isAtRightEdge
            setFollowLatest(isAtRightEdge)
          }
        })
      }
    }

    if (showVolume && volumePaneRef.current && paneLayout.volume.height > 0) {
      const chart = createPaneChart(volumePaneRef.current, paneLayout.volume.height)
      if (chart) {
        volumeChartRef.current = chart
        volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
          color: colors.volumeUp,
          priceFormat: { type: 'volume' },
          priceScaleId: 'right',
        })
        chart.priceScale('right').applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
        })
      }
    }

    if (indicators.includes('RSI') && rsiPaneRef.current && paneLayout.rsi.height > 0) {
      const chart = createPaneChart(rsiPaneRef.current, paneLayout.rsi.height)
      if (chart) {
        rsiChartRef.current = chart
        rsiSeriesRef.current = chart.addSeries(LineSeries, {
          color: '#787b86',
          lineWidth: 1,
          priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
        })
        chart.priceScale('right').applyOptions({
          scaleMargins: { top: 0.15, bottom: 0.15 },
        })
      }
    }

    if (indicators.includes('MACD') && macdPaneRef.current && paneLayout.macd.height > 0) {
      const chart = createPaneChart(macdPaneRef.current, paneLayout.macd.height)
      if (chart) {
        macdChartRef.current = chart
        macdHistogramRef.current = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'price', precision: 8, minMove: 0.00000001 },
        })
        macdLineRef.current = chart.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1 })
        macdSignalRef.current = chart.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1 })
      }
    }

    resizeAllCharts()
  }, [
    colors,
    createPaneChart,
    paneLayout,
    indicators,
    resizeAllCharts,
    destroyCharts,
    handleChartClick,
    handleCrosshairMove,
    showVolume,
  ])

  const syncTimeScales = useCallback(() => {
    const charts = [
      mainChartRef.current,
      showVolume ? volumeChartRef.current : null,
      rsiChartRef.current,
      macdChartRef.current,
    ].filter(Boolean) as IChartApi[]
    if (charts.length < 2) return

    const main = charts[0]
    const range = main.timeScale().getVisibleLogicalRange()
    if (!range) return

    for (let i = 1; i < charts.length; i++) {
      try {
        charts[i].timeScale().setVisibleLogicalRange(range)
      } catch {}
    }
  }, [showVolume])

  const applyData = useCallback(
    (candles: Candle[]) => {
      candleDataRef.current = candles
      dataIntervalRef.current = interval
      setData(candles)
      hasDataRef.current = true

      const tvData = toTVData(candles)
      const volData = toVolumeData(candles)

      candleSeriesRef.current?.setData(tvData)
      if (showVolume) volumeSeriesRef.current?.setData(volData)

      workerBusyRef.current = true

      if (rsiSeriesRef.current) {
        compute('rsi', candles, 14).then((raw) => {
          const rsiValues = raw as number[]
          const rsiData: LineData[] = rsiValues.map((v, i) => ({
            time: toTVTime(candles[i]?.time ?? 0),
            value: isNaN(v) ? 50 : v,
          }))
          rsiSeriesRef.current?.setData(rsiData)
        })
      }

      if (macdHistogramRef.current && macdLineRef.current && macdSignalRef.current) {
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
          macdHistogramRef.current?.setData(macdData)
          macdLineRef.current?.setData(difData)
          macdSignalRef.current?.setData(signalData)
        })
      }

      for (const ind of indicators) {
        if (ind.startsWith('MA') || ind.startsWith('SMA')) {
          const period = parseInt(ind.replace(/MA|SMA/, '')) || 7
          const values = calcMA(candles, period)
          let series = maSeriesRef.current.get(ind)
          if (!series && candleSeriesRef.current) {
            series = mainChartRef.current?.addSeries(LineSeries, {
              color: '#FF9800',
              lineWidth: 1,
              lastValueVisible: false,
              priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
            })
            if (series) maSeriesRef.current.set(ind, series)
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
          let series = emaSeriesRef.current.get(ind)
          if (!series && candleSeriesRef.current) {
            series = mainChartRef.current?.addSeries(LineSeries, {
              color: '#CE93D8',
              lineWidth: 1,
              lastValueVisible: false,
              priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
            })
            if (series) emaSeriesRef.current.set(ind, series)
          }
          if (series) {
            const lineData: LineData[] = values.map((v, i) => ({
              time: toTVTime(candles[i]?.time ?? 0),
              value: isNaN(v) ? 0 : v,
            }))
            series.setData(lineData)
          }
        } else if (ind === 'BB') {
          if (candleSeriesRef.current) {
            const bb = calcBB(candles, 20, 2)
            if (!bbUpperRef.current) {
              bbUpperRef.current =
                mainChartRef.current?.addSeries(LineSeries, {
                  color: '#FF980080',
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  lastValueVisible: false,
                }) ?? null
              bbMiddleRef.current =
                mainChartRef.current?.addSeries(LineSeries, {
                  color: '#FF980040',
                  lineWidth: 1,
                  lastValueVisible: false,
                }) ?? null
              bbLowerRef.current =
                mainChartRef.current?.addSeries(LineSeries, {
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
            bbUpperRef.current?.setData(upperData)
            bbMiddleRef.current?.setData(middleData)
            bbLowerRef.current?.setData(lowerData)
          }
        }
      }

      if (candleSeriesRef.current && positions) {
        const markers: SeriesMarker<UTCTimestamp>[] = positions.map((p) => ({
          time: toTVTime(new Date(p.createdAt).getTime() / 1000),
          position: p.side === 'buy' ? 'belowBar' : 'aboveBar',
          color: p.side === 'buy' ? colors.up : colors.down,
          shape: p.side === 'buy' ? 'arrowUp' : 'arrowDown',
          text: `${Number(p.volume).toFixed(2)}`,
          size: 1,
        }))
        if (markersPluginRef.current) {
          markersPluginRef.current.setMarkers(markers)
        }
      }

      if (trendLineRef.current && trendPointsRef.current.length === 2) {
        const pts = trendPointsRef.current
        trendLineRef.current.setData([
          { time: toTVTime(pts[0].time), value: pts[0].value },
          { time: toTVTime(pts[1].time), value: pts[1].value },
        ])
      }

      if (tvData.length > 0 && followLatestRef.current) {
        const charts = [
          mainChartRef.current,
          showVolume ? volumeChartRef.current : null,
          rsiChartRef.current,
          macdChartRef.current,
        ].filter(Boolean) as IChartApi[]
        charts.forEach((c) => {
          try {
            c.timeScale().fitContent()
          } catch {}
        })
      }
    },
    [toTVData, toVolumeData, indicators, positions, colors, showVolume],
  )

  const updateCandle = useCallback(
    (candle: Candle) => {
      if (!candleSeriesRef.current) return
      const tvTime = toTVTime(candle.time)

      candleSeriesRef.current.update({
        time: tvTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })

      if (showVolume) {
        volumeSeriesRef.current?.update({
          time: tvTime,
          value: candle.volume ?? 0,
          color: candle.close >= candle.open ? colors.volumeUp : colors.volumeDown,
        })
      }

      const currentData = dataRef.current
      const needRsi = rsiSeriesRef.current
      const needMacd = macdHistogramRef.current && macdLineRef.current && macdSignalRef.current

      if (needRsi || needMacd) {
        const windowLen = needMacd ? 26 : 14
        const windowData =
          currentData.length >= windowLen ? [...currentData.slice(-(windowLen - 1)), candle] : null

        if (windowData && windowData.length >= windowLen) {
          if (needRsi && windowLen >= 14) {
            const rsiSlice = needMacd ? windowData : windowData
            const rsiVal = calcRSI(rsiSlice, 14)
            const lastRsi = rsiVal[rsiVal.length - 1]
            rsiSeriesRef.current!.update({
              time: tvTime,
              value: isNaN(lastRsi) ? 50 : lastRsi,
            })
          }

          if (needMacd) {
            const macdResult = calcMACD(windowData)
            const i = macdResult.histogram.length - 1
            macdHistogramRef.current!.update({
              time: tvTime,
              value: macdResult.histogram[i],
              color: macdResult.histogram[i] >= 0 ? '#26a69a' : '#ef5350',
            })
            macdLineRef.current!.update({ time: tvTime, value: macdResult.macd[i] })
            macdSignalRef.current!.update({ time: tvTime, value: macdResult.signal[i] })
          }
        }
      }
    },
    [colors, showVolume],
  )

  const onInitial = useCallback(
    (candles: Candle[]) => {
      applyData(candles)
    },
    [applyData],
  )

  const flushUpdate = useCallback(() => {
    const candle = pendingUpdateRef.current
    pendingUpdateRef.current = null
    rafRef.current = null
    if (candle) updateCandle(candle)
  }, [updateCandle])

  const onCandle = useCallback(
    (candle: Candle) => {
      const prev = dataRef.current
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
      dataRef.current = next
      setData(next)
      pendingUpdateRef.current = candle
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushUpdate)
      }
    },
    [flushUpdate],
  )

  const livePrice = useLivePrice(symbol)
  const smoothPnl = useSmoothTotalFloatingPnl(positions ?? [])
  const latestReferencePrice = useMemo(() => {
    const latestCandle = data[data.length - 1]
    return resolveChartReferencePrice(livePrice?.price, latestCandle)
  }, [data, livePrice?.price])

  useEffect(() => {
    if (!candleSeriesRef.current) return

    if (latestReferencePrice === null) {
      if (referencePriceLineRef.current) {
        candleSeriesRef.current.removePriceLine(referencePriceLineRef.current)
        referencePriceLineRef.current = null
      }
      return
    }

    const pulseVisual = getPulseVisualStyle(pulseState.direction, pulseState.intensity)

    if (referencePriceLineRef.current) {
      referencePriceLineRef.current.applyOptions({
        price: latestReferencePrice,
        color: pulseVisual.color,
        lineWidth: pulseVisual.lineWidth,
      })
    } else {
      referencePriceLineRef.current = candleSeriesRef.current.createPriceLine({
        price: latestReferencePrice,
        color: pulseVisual.color,
        lineWidth: pulseVisual.lineWidth,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'Live',
      })
    }
  }, [latestReferencePrice, pulseState.direction, pulseState.intensity, colors.up])

  useEffect(() => {
    const series = candleSeriesRef.current
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

    const currentIds = new Set<string>()

    if (positions) {
      for (const p of positions) {
        currentIds.add(p.id)

        const existing = entryPriceLinesRef.current.get(p.id)
        const entryColor = p.side === 'buy' ? colors.up : colors.down
        if (existing) {
          existing.applyOptions({ price: Number(p.openPrice), color: entryColor })
        } else {
          entryPriceLinesRef.current.set(
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

        let slTp = slTpLinesRef.current.get(p.id)
        if (!slTp) {
          slTp = { sl: null, tp: null }
          slTpLinesRef.current.set(p.id, slTp)
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
              title: `${t('professionalChart.stopLoss')} ${Number(p.stopLoss)}`,
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
              title: `${t('professionalChart.takeProfit')} ${Number(p.takeProfit)}`,
            })
          }
        } else if (slTp.tp) {
          series.removePriceLine(slTp.tp)
          slTp.tp = null
        }
      }
    }

    for (const [id, pl] of entryPriceLinesRef.current) {
      if (!currentIds.has(id)) {
        series.removePriceLine(pl)
        entryPriceLinesRef.current.delete(id)
        const slTp = slTpLinesRef.current.get(id)
        if (slTp) {
          if (slTp.sl) series.removePriceLine(slTp.sl)
          if (slTp.tp) series.removePriceLine(slTp.tp)
          slTpLinesRef.current.delete(id)
        }
      }
    }
  }, [positions, colors.up, colors.down])

  useEffect(() => {
    const series = candleSeriesRef.current
    if (!series) return

    const currentIds = new Set<string>()

    if (orders) {
      for (const o of orders) {
        if (o.status !== 'pending') continue
        currentIds.add(o.id)

        const isBuy = o.side === 'buy'
        const isLimit = o.type === 'limit'
        const arrow = isBuy ? '▲' : '▼'
        const typeLabel = isLimit ? t('professionalChart.limit') : t('professionalChart.stop')
        const lineColor = isLimit ? '#FF9800' : '#AB47BC'
        const lineStyle = isLimit ? LineStyle.Dotted : LineStyle.Dashed

        const existing = orderLinesRef.current.get(o.id)
        if (existing) {
          existing.applyOptions({ price: Number(o.price), color: lineColor })
        } else {
          orderLinesRef.current.set(
            o.id,
            series.createPriceLine({
              price: Number(o.price),
              color: lineColor,
              lineWidth: 1,
              lineStyle,
              axisLabelVisible: true,
              title: `${arrow} ${typeLabel} ${o.side.toUpperCase()} @ ${Number(o.price)}`,
            }),
          )
        }
      }
    }

    for (const [id, pl] of orderLinesRef.current) {
      if (!currentIds.has(id)) {
        series.removePriceLine(pl)
        orderLinesRef.current.delete(id)
      }
    }
  }, [orders])

  const { isLoading } = useRealtimeCandles(symbol, interval, onInitial, onCandle)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      if (resizeTimerRef.current !== null) clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = window.setTimeout(() => {
        resizeTimerRef.current = null
        resizeAllCharts()
        syncTimeScales()
      }, 80)
    })
    ro.observe(containerRef.current)
    return () => {
      ro.disconnect()
      if (resizeTimerRef.current !== null) clearTimeout(resizeTimerRef.current)
    }
  }, [resizeAllCharts])

  useEffect(() => {
    const timer = setTimeout(() => {
      initCharts()

      const pending = candleDataRef.current
      if (pending.length > 0 && dataIntervalRef.current === interval) {
        applyData(pending)
      }

      requestAnimationFrame(() => {
        resizeAllCharts()
        syncTimeScales()
      })
    }, 0)
    return () => {
      clearTimeout(timer)
      destroyCharts()
    }
  }, [chartKey])

  const prevSymbolRef = useRef(symbol)
  useEffect(() => {
    if (prevSymbolRef.current !== symbol) {
      prevSymbolRef.current = symbol
      hasDataRef.current = false
      setChartKey((prev) => prev + 1)
    } else {
      hasDataRef.current = false
    }
    maSeriesRef.current.clear()
    emaSeriesRef.current.clear()
    bbUpperRef.current = null
    bbMiddleRef.current = null
    bbLowerRef.current = null
  }, [symbol, interval])

  const handleClearDrawings = useCallback(() => {
    hlinePricesRef.current = []
    trendPointsRef.current = []
    trendLineRef.current?.setData([])
    trendLineRef.current = null
    for (const pl of hlinePriceLineRefsRef.current) {
      candleSeriesRef.current?.removePriceLine(pl)
    }
    hlinePriceLineRefsRef.current = []
    drawingModeRef.current = 'none'
    setDrawingMode('none')
  }, [])

  const handleDrawingMode = useCallback((mode: 'none' | 'hline' | 'trend') => {
    drawingModeRef.current = mode
    setDrawingMode(mode)
    if (mode === 'trend') trendPointsRef.current = []
  }, [])

  const handleScrollToLatest = useCallback(() => {
    setFollowLatest(true)
    followLatestRef.current = true
    const main = mainChartRef.current
    if (!main) return
    const data = candleSeriesRef.current?.data()
    if (!data || data.length === 0) return
    const lastIdx = data.length - 1
    const range = { from: Math.max(0, lastIdx - 40), to: lastIdx + 6 }
    main.timeScale().setVisibleLogicalRange(range)
    const subCharts = [
      showVolume ? volumeChartRef.current : null,
      rsiChartRef.current,
      macdChartRef.current,
    ].filter(Boolean) as IChartApi[]
    subCharts.forEach((c) => {
      try { c.timeScale().setVisibleLogicalRange(range) } catch {}
    })
  }, [showVolume])

  const scrollToEntry = useCallback(
    (entryTime: number) => {
      const main = mainChartRef.current
      if (!main) return
      setFollowLatest(false)
      followLatestRef.current = false
      const data = candleSeriesRef.current?.data()
      if (!data || data.length === 0) return
      const tvTime = toTVTime(entryTime)
      const idx = data.findIndex((d) => d.time === tvTime)
      if (idx < 0) return
      const halfView = 20
      const range = {
        from: Math.max(0, idx - halfView),
        to: Math.min(data.length - 1, idx + halfView),
      }
      main.timeScale().setVisibleLogicalRange(range)
      const subCharts = [
        showVolume ? volumeChartRef.current : null,
        rsiChartRef.current,
        macdChartRef.current,
      ].filter(Boolean) as IChartApi[]
      subCharts.forEach((c) => {
        try { c.timeScale().setVisibleLogicalRange(range) } catch {}
      })
    },
    [showVolume],
  )

  useEffect(() => {
    if (!positions || positions.length === 0) return
    const currentIds = new Set(positions.map((p) => p.id))
    const prevIds = prevPositionIdsRef.current
    let hasNew = false
    for (const id of currentIds) {
      if (!prevIds.has(id)) {
        hasNew = true
        break
      }
    }
    prevPositionIdsRef.current = currentIds
    if (!hasNew) return
    const newest = positions.reduce((a, b) =>
      new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime() ? a : b,
    )
    requestAnimationFrame(() => {
      scrollToEntry(new Date(newest.createdAt).getTime() / 1000)
    })
  }, [positions, scrollToEntry])

  const marketStatus = useMarketStatus(symbol)
  const isOpen = marketStatus.open
  const hasData = hasDataRef.current
  const showLoading = isLoading && !hasData
  const showRefreshing = isLoading && hasData

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        contain: 'strict',
        direction,
      }}
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleContainerMouseLeave}
    >
      {showDrawingTools && (
        <ChartToolbar
          drawingMode={drawingMode}
          onModeChange={handleDrawingMode}
          onClear={handleClearDrawings}
        />
      )}
      {adjusting && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            background: '#1e222d',
            border: `1px solid ${adjusting.type === 'sl' ? '#ef5350' : '#26a69a'}`,
            borderRadius: 6,
            padding: '4px 12px',
            color: '#d1d4dc',
            fontSize: 11,
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          Click on chart to set new {adjusting.type === 'sl' ? t('professionalChart.clickSetSL') : t('professionalChart.clickSetTP')}
        </div>
      )}
      <ChartPanes
        containerRef={containerRef}
        mainPaneRef={mainPaneRef}
        volumePaneRef={showVolume ? volumePaneRef : null}
        rsiPaneRef={rsiPaneRef}
        macdPaneRef={macdPaneRef}
        paneLayout={paneLayout}
        indicators={indicators}
      />
      <ChartOverlays
        isOpen={isOpen}
        hasData={hasData}
        isLoading={isLoading}
        marketStatus={marketStatus}
        bg={colors.bg}
        showLoading={showLoading}
        showRefreshing={showRefreshing}
      />
      {hasData && (
        <button
          onClick={handleScrollToLatest}
          style={{
            position: 'absolute',
            bottom: 30,
            right: 10,
            zIndex: 15,
            width: 32,
            height: 32,
            borderRadius: 6,
            border: followLatest ? '1px solid #26a69a' : '1px solid #2a2e39',
            background: followLatest ? 'rgba(38,166,154,0.15)' : 'rgba(13,15,20,0.85)',
            color: followLatest ? '#26a69a' : '#787b86',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.15s',
          }}
          title={followLatest ? t('professionalChart.followingLatest') : t('professionalChart.clickToFollow')}
          onMouseEnter={(e) => {
            if (!followLatest) {
              e.currentTarget.style.color = '#d1d4dc'
              e.currentTarget.style.borderColor = '#444'
            }
          }}
          onMouseLeave={(e) => {
            if (!followLatest) {
              e.currentTarget.style.color = '#787b86'
              e.currentTarget.style.borderColor = '#2a2e39'
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </button>
      )}
      {hasData && !followLatest && (
        <button
          onClick={handleScrollToLatest}
          style={{
            position: 'absolute',
            bottom: 66,
            right: 10,
            zIndex: 15,
            width: 32,
            height: 32,
            borderRadius: 6,
            border: '1px solid #2a2e39',
            background: 'rgba(13,15,20,0.85)',
            color: '#787b86',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.15s',
          }}
          title={t('professionalChart.jumpToLatest')}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#d1d4dc'
            e.currentTarget.style.borderColor = '#444'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#787b86'
            e.currentTarget.style.borderColor = '#2a2e39'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
      )}
      {positions && positions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: direction === 'rtl' ? undefined : 8,
            left: direction === 'rtl' ? 8 : undefined,
            zIndex: 15,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            padding: '4px 10px',
            borderRadius: 6,
            background: `rgba(13,15,20,0.8)`,
            border: `1px solid ${smoothPnl >= 0 ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)'}`,
            backdropFilter: 'blur(4px)',
            fontSize: 11,
            lineHeight: '16px',
            fontFamily: "'Courier New', monospace",
          }}
        >
          <span style={{ color: smoothPnl >= 0 ? '#26a69a' : '#ef5350', fontWeight: 600, fontSize: 13 }}>
            {smoothPnl >= 0 ? '+' : ''}${smoothPnl.toFixed(2)}
          </span>
          <span style={{ color: '#787b86', fontSize: 10 }}>
            {positions.length} {t('professionalChart.pos')}
            {' · '}
            {positions.reduce((s, p) => s + (p.side === 'buy' ? 1 : -1) * Number(p.volume), 0).toFixed(2)} {t('professionalChart.lots')}
          </span>
          {positions.map((p) => (
            <button
              key={p.id}
              onClick={(e) => {
                e.stopPropagation()
                scrollToEntry(new Date(p.createdAt).getTime() / 1000)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#787b86',
                cursor: 'pointer',
                fontSize: 10,
                padding: '1px 0',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
              title={t('professionalChart.jumpToEntry', { symbol: p.symbol })}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
              <span style={{ color: p.side === 'buy' ? '#26a69a' : '#ef5350' }}>
                {p.side === 'buy' ? '▲' : '▼'} {p.symbol}
              </span>
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <style>{`@keyframes loadingBar { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </div>
  )
})

export { ProfessionalChart }
export default ProfessionalChart
