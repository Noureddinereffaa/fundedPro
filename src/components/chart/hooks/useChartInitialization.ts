import { useCallback } from 'react'
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
  MouseEventParams,
  Time,
} from 'lightweight-charts'
import type { Candle } from '../../../../shared/types'
import { getChartColors } from '../constants'
import type { PaneLayoutConfig } from '../types'
import { resizeAllCharts } from '../utils/chartLayout'

interface ChartRefs {
  containerRef: React.RefObject<HTMLDivElement | null>
  mainPaneRef: React.RefObject<HTMLDivElement | null>
  volumePaneRef: React.RefObject<HTMLDivElement | null>
  rsiPaneRef: React.RefObject<HTMLDivElement | null>
  macdPaneRef: React.RefObject<HTMLDivElement | null>
  mainChartRef: React.MutableRefObject<IChartApi | null>
  volumeChartRef: React.MutableRefObject<IChartApi | null>
  rsiChartRef: React.MutableRefObject<IChartApi | null>
  macdChartRef: React.MutableRefObject<IChartApi | null>
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
  markersPluginRef: React.MutableRefObject<ReturnType<typeof createSeriesMarkers<Time>> | null>
  referencePriceLineRef: React.MutableRefObject<IPriceLine | null>
  entryPriceLinesRef: React.MutableRefObject<Map<string, IPriceLine>>
  slTpLinesRef: React.MutableRefObject<Map<string, { sl: IPriceLine | null; tp: IPriceLine | null }>>
  orderLinesRef: React.MutableRefObject<Map<string, IPriceLine>>
  hlinePriceLineRefsRef: React.MutableRefObject<IPriceLine[]>
  rafRef: React.MutableRefObject<number | null>
  crosshairRafRef: React.MutableRefObject<number | null>
  crosshairPendingRef: React.MutableRefObject<{ time: Time; candle: Candle } | null>
  pendingUpdateRef: React.MutableRefObject<Candle | null>
}

interface InitOptions {
  theme: 'dark' | 'light'
  paneLayout: PaneLayoutConfig
  indicators: string[]
  showVolume: boolean
  followLatestRef: React.MutableRefObject<boolean>
  setFollowLatest: (v: boolean) => void
  handleChartClick: (param: MouseEventParams) => void
  handleCrosshairMove: (param: MouseEventParams) => void
}

function createPaneChart(
  container: HTMLDivElement | null,
  containerRef: React.RefObject<HTMLDivElement | null>,
  heightPct: number,
  colors: ReturnType<typeof getChartColors>,
): IChartApi | null {
  if (!container || !containerRef.current) return null
  const containerHeight = containerRef.current.clientHeight
  const height = Math.max(20, Math.floor(containerHeight * heightPct))

  return createChart(container, {
    height,
    width: containerRef.current.clientWidth,
    layout: {
      background: { type: ColorType.Solid, color: colors.bg },
      textColor: colors.text,
      fontSize: 11,
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
}

export function useChartInitialization(refs: ChartRefs, options: InitOptions) {
  const { theme, paneLayout, indicators, showVolume, followLatestRef, setFollowLatest, handleChartClick, handleCrosshairMove } = options
  const colors = getChartColors(theme)

  const destroyCharts = useCallback(() => {
    if (refs.rafRef.current !== null) {
      cancelAnimationFrame(refs.rafRef.current)
      refs.rafRef.current = null
    }
    if (refs.crosshairRafRef.current !== null) {
      cancelAnimationFrame(refs.crosshairRafRef.current)
      refs.crosshairRafRef.current = null
    }
    refs.crosshairPendingRef.current = null
    refs.pendingUpdateRef.current = null
    refs.mainChartRef.current?.remove()
    refs.mainChartRef.current = null
    refs.volumeChartRef.current?.remove()
    refs.volumeChartRef.current = null
    refs.rsiChartRef.current?.remove()
    refs.rsiChartRef.current = null
    refs.macdChartRef.current?.remove()
    refs.macdChartRef.current = null
    if (refs.referencePriceLineRef.current) {
      refs.candleSeriesRef.current?.removePriceLine(refs.referencePriceLineRef.current)
      refs.referencePriceLineRef.current = null
    }
    refs.candleSeriesRef.current = null
    refs.volumeSeriesRef.current = null
    refs.rsiSeriesRef.current = null
    refs.macdHistogramRef.current = null
    refs.macdLineRef.current = null
    refs.macdSignalRef.current = null
    refs.maSeriesRef.current.clear()
    refs.emaSeriesRef.current.clear()
    refs.bbUpperRef.current = null
    refs.bbMiddleRef.current = null
    refs.bbLowerRef.current = null
    refs.trendLineRef.current = null
    refs.hlinePriceLineRefsRef.current = []
    refs.entryPriceLinesRef.current.forEach((pl) => {
      refs.candleSeriesRef.current?.removePriceLine(pl)
    })
    refs.entryPriceLinesRef.current.clear()
    refs.slTpLinesRef.current.forEach(({ sl, tp }) => {
      if (sl) refs.candleSeriesRef.current?.removePriceLine(sl)
      if (tp) refs.candleSeriesRef.current?.removePriceLine(tp)
    })
    refs.slTpLinesRef.current.clear()
    refs.orderLinesRef.current.forEach((pl) => {
      refs.candleSeriesRef.current?.removePriceLine(pl)
    })
    refs.orderLinesRef.current.clear()
  }, [refs])

  const initCharts = useCallback(() => {
    destroyCharts()

    if (refs.mainPaneRef.current) {
      const chart = createPaneChart(refs.mainPaneRef.current, refs.containerRef, paneLayout.main.height, colors)
      if (chart) {
        refs.mainChartRef.current = chart
        refs.candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
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
        refs.markersPluginRef.current = createSeriesMarkers(refs.candleSeriesRef.current, [], {})
        chart.subscribeClick(handleChartClick)
        chart.subscribeCrosshairMove(handleCrosshairMove)
        chart.timeScale().subscribeVisibleTimeRangeChange(() => {
          const data = refs.candleSeriesRef.current?.data()
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

    if (showVolume && refs.volumePaneRef.current && paneLayout.volume.height > 0) {
      const chart = createPaneChart(refs.volumePaneRef.current, refs.containerRef, paneLayout.volume.height, colors)
      if (chart) {
        refs.volumeChartRef.current = chart
        refs.volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
          color: colors.volumeUp,
          priceFormat: { type: 'volume' },
          priceScaleId: 'right',
        })
        chart.priceScale('right').applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
        })
      }
    }

    if (indicators.includes('RSI') && refs.rsiPaneRef.current && paneLayout.rsi.height > 0) {
      const chart = createPaneChart(refs.rsiPaneRef.current, refs.containerRef, paneLayout.rsi.height, colors)
      if (chart) {
        refs.rsiChartRef.current = chart
        refs.rsiSeriesRef.current = chart.addSeries(LineSeries, {
          color: '#787b86',
          lineWidth: 1,
          priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
        })
        chart.priceScale('right').applyOptions({
          scaleMargins: { top: 0.15, bottom: 0.15 },
        })
      }
    }

    if (indicators.includes('MACD') && refs.macdPaneRef.current && paneLayout.macd.height > 0) {
      const chart = createPaneChart(refs.macdPaneRef.current, refs.containerRef, paneLayout.macd.height, colors)
      if (chart) {
        refs.macdChartRef.current = chart
        refs.macdHistogramRef.current = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'price', precision: 8, minMove: 0.00000001 },
        })
        refs.macdLineRef.current = chart.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1 })
        refs.macdSignalRef.current = chart.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1 })
      }
    }

    resizeAllCharts(refs.containerRef.current, [
      { chart: refs.mainChartRef.current, pct: paneLayout.main.height },
      { chart: showVolume ? refs.volumeChartRef.current : null, pct: paneLayout.volume.height },
      { chart: refs.rsiChartRef.current, pct: paneLayout.rsi.height },
      { chart: refs.macdChartRef.current, pct: paneLayout.macd.height },
    ])
  }, [
    colors,
    paneLayout,
    indicators,
    destroyCharts,
    handleChartClick,
    handleCrosshairMove,
    showVolume,
    followLatestRef,
    setFollowLatest,
    refs,
  ])

  return { initCharts, destroyCharts }
}