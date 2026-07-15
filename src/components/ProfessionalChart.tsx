import { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { LineStyle } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, IPriceLine, Time, MouseEventParams } from 'lightweight-charts'
import { createSeriesMarkers } from 'lightweight-charts'
import { useRealtimeCandles, useMarketStatus, useLivePrice, useSmoothTotalFloatingPnl } from '../utils/useRealtime'
import { useWorkerIndicators } from '../utils/useWorkerIndicators'
import { resolveChartReferencePrice } from '../utils/chartPrice'
import { getPulseVisualStyle } from '../utils/chartAnimation'
import type { Candle } from '../../shared/types'
import { ChartToolbar, ChartPanes, ChartOverlays, getChartColors, toTVTime } from './chart'
import type { ProfessionalChartProps, DrawingMode, AdjustingTarget } from './chart/types'
import { binarySearchTime } from './chart/utils/chartTransforms'
import { PROXIMITY_PX } from './chart/types'
import { usePaneLayout, syncTimeScales as syncTimeScalesUtil, resizeAllCharts } from './chart/utils/chartLayout'
import { useChartInitialization } from './chart/hooks/useChartInitialization'
import { useChartData } from './chart/hooks/useChartData'
import { useChartInteraction } from './chart/hooks/useChartInteraction'

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
  const paneLayout = usePaneLayout(indicators, showVolume)

  // ── Refs ──
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
  const drawingModeRef = useRef<DrawingMode>('none')
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none')
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

  const adjustingRef = useRef<AdjustingTarget | null>(null)
  const [adjusting, setAdjusting] = useState<AdjustingTarget | null>(null)
  const hoveredLineRef = useRef<AdjustingTarget | null>(null)

  // ── Chart Interaction (crosshair sync) ──
  const interactionRefs = useMemo(() => ({
    dataRef, volumeChartRef, volumeSeriesRef, rsiChartRef, rsiSeriesRef,
    macdChartRef, macdLineRef, macdSignalRef, crosshairPendingRef, crosshairRafRef,
  }), [])
  const { handleCrosshairMove: syncCrosshair } = useChartInteraction(interactionRefs, { showVolume })

  // ── Chart Click Handler (drawing + price select) ──
  const handleChartClick = useCallback((param: MouseEventParams) => {
    if (!param?.time || !param.point) return
    const idx = binarySearchTime(dataRef.current, Number(param.time))
    if (idx < 0) return
    const candle = dataRef.current[idx]
    if (drawingModeRef.current === 'hline') {
      const price = param.point.y < 50 ? candle.high : candle.low
      const pl = candleSeriesRef.current?.createPriceLine({
        price, color: '#3b82f6', lineWidth: 1, lineStyle: LineStyle.Dashed,
        axisLabelVisible: true, title: '',
      })
      if (pl) hlinePriceLineRefsRef.current.push(pl)
      return
    }
    if (drawingModeRef.current === 'trend') {
      trendPointsRef.current.push({ time: Number(param.time), value: candle.close })
      if (trendPointsRef.current.length === 2) {
        const pts = trendPointsRef.current
        trendLineRef.current?.setData([
          { time: toTVTime(pts[0].time), value: pts[0].value },
          { time: toTVTime(pts[1].time), value: pts[1].value },
        ])
        drawingModeRef.current = 'none'
        setDrawingMode('none')
        trendPointsRef.current = []
      }
      return
    }
    onPriceSelectRef.current?.(candle.close, candle.time)
  }, [toTVTime])

  const handleCrosshairMove = useCallback((param: MouseEventParams) => {
    syncCrosshair(param)
    if (!param?.time) return
    const idx = binarySearchTime(dataRef.current, Number(param.time))
    if (idx < 0) return
    const candle = dataRef.current[idx]
    if (adjustingRef.current) {
      const target = adjustingRef.current
      const line = target.type === 'sl'
        ? slTpLinesRef.current.get(target.positionId)?.sl
        : slTpLinesRef.current.get(target.positionId)?.tp
      if (line) {
        candleSeriesRef.current?.updatePriceLine(line, {
          price: candle.close, color: target.type === 'sl' ? '#ef5350' : '#26a69a',
          lineWidth: 1, lineStyle: LineStyle.Solid,
          axisLabelVisible: true, title: target.type.toUpperCase(),
        })
      }
    }
  }, [syncCrosshair])

  // ── Chart Initialization ──
  const initRefs = useMemo(() => ({
    containerRef, mainPaneRef, volumePaneRef, rsiPaneRef, macdPaneRef,
    mainChartRef, volumeChartRef, rsiChartRef, macdChartRef,
    candleSeriesRef, volumeSeriesRef, rsiSeriesRef,
    macdHistogramRef, macdLineRef, macdSignalRef,
    maSeriesRef, emaSeriesRef, bbUpperRef, bbMiddleRef, bbLowerRef,
    trendLineRef, markersPluginRef, referencePriceLineRef,
    entryPriceLinesRef, slTpLinesRef, orderLinesRef,
    hlinePriceLineRefsRef, rafRef, crosshairRafRef,
    crosshairPendingRef, pendingUpdateRef,
  }), [])
  const { initCharts, destroyCharts } = useChartInitialization(initRefs, {
    theme, paneLayout, indicators, showVolume,
    followLatestRef, setFollowLatest, handleChartClick, handleCrosshairMove,
  })

  // ── Chart Data Bridge ──
  const dataRefs = useMemo(() => ({
    candleSeriesRef, volumeSeriesRef, rsiSeriesRef,
    macdHistogramRef, macdLineRef, macdSignalRef,
    maSeriesRef, emaSeriesRef, bbUpperRef, bbMiddleRef, bbLowerRef,
    trendLineRef, markersPluginRef, mainChartRef, volumeChartRef,
    rsiChartRef, macdChartRef, dataRef, candleDataRef,
    dataIntervalRef, hasDataRef, pendingUpdateRef, rafRef,
    followLatestRef, trendPointsRef,
  }), [])
  const { onInitial, onCandle } = useChartData(dataRefs, {
    interval, indicators, showVolume, positions, colors,
    setData, setPulseState, compute,
  })

  // ── Init charts on mount / symbol change ──
  useEffect(() => {
    const timer = window.setTimeout(() => initCharts(), 50)
    return () => {
      window.clearTimeout(timer)
      destroyCharts()
    }
  }, [initCharts, destroyCharts, symbol, interval])

  // ── Live Price & P&L ──
  const livePrice = useLivePrice(symbol)
  const smoothPnl = useSmoothTotalFloatingPnl(positions ?? [])
  const latestReferencePrice = useMemo(() => {
    const latestCandle = data[data.length - 1]
    return resolveChartReferencePrice(livePrice?.price, latestCandle)
  }, [data, livePrice?.price])

  // ── Market Status ──
  const marketStatus = useMarketStatus(symbol)
  const isOpen = marketStatus.open

  // ── Resize Observer ──
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      if (resizeTimerRef.current !== null) clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = window.setTimeout(() => {
        resizeTimerRef.current = null
        resizeAllCharts(containerRef.current, [
          { chart: mainChartRef.current, pct: paneLayout.main.height },
          { chart: showVolume ? volumeChartRef.current : null, pct: paneLayout.volume.height },
          { chart: rsiChartRef.current, pct: paneLayout.rsi.height },
          { chart: macdChartRef.current, pct: paneLayout.macd.height },
        ])
      }, 80)
    })
    ro.observe(containerRef.current)
    return () => {
      ro.disconnect()
      if (resizeTimerRef.current !== null) clearTimeout(resizeTimerRef.current)
    }
  }, [paneLayout, showVolume])

  // ── Chart Key Reset on Symbol Change ──
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

  // ── Drawing Tools ──
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

  const handleDrawingMode = useCallback((mode: DrawingMode) => {
    drawingModeRef.current = mode
    setDrawingMode(mode)
    if (mode === 'trend') trendPointsRef.current = []
  }, [])

  const handleScrollToLatest = useCallback(() => {
    setFollowLatest(true)
    followLatestRef.current = true
    const main = mainChartRef.current
    if (!main) return
    const d = candleSeriesRef.current?.data()
    if (!d || d.length === 0) return
    const lastIdx = d.length - 1
    const range = { from: Math.max(0, lastIdx - 40), to: lastIdx + 6 }
    main.timeScale().setVisibleLogicalRange(range)
    const subCharts = [showVolume ? volumeChartRef.current : null, rsiChartRef.current, macdChartRef.current].filter(Boolean) as IChartApi[]
    subCharts.forEach((c) => { try { c.timeScale().setVisibleLogicalRange(range) } catch {} })
  }, [showVolume])

  const scrollToEntry = useCallback((entryTime: number) => {
    const main = mainChartRef.current
    if (!main) return
    setFollowLatest(false)
    followLatestRef.current = false
    const d = candleSeriesRef.current?.data()
    if (!d || d.length === 0) return
    const tvTime = toTVTime(entryTime)
    const idx = d.findIndex((item) => item.time === tvTime)
    if (idx < 0) return
    const halfView = 20
    const range = { from: Math.max(0, idx - halfView), to: Math.min(d.length - 1, idx + halfView) }
    main.timeScale().setVisibleLogicalRange(range)
    const subCharts = [showVolume ? volumeChartRef.current : null, rsiChartRef.current, macdChartRef.current].filter(Boolean) as IChartApi[]
    subCharts.forEach((c) => { try { c.timeScale().setVisibleLogicalRange(range) } catch {} })
  }, [showVolume])

  // ── Position Auto-Scroll ──
  useEffect(() => {
    if (!positions || positions.length === 0) return
    const currentIds = new Set(positions.map((p) => p.id))
    const prevIds = prevPositionIdsRef.current
    let hasNew = false
    for (const id of currentIds) { if (!prevIds.has(id)) { hasNew = true; break } }
    prevPositionIdsRef.current = currentIds
    if (!hasNew) return
    const newest = positions.reduce((a, b) => new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime() ? a : b)
    requestAnimationFrame(() => { scrollToEntry(new Date(newest.createdAt).getTime() / 1000) })
  }, [positions, scrollToEntry])

  // ── Realtime Data ──
  const { isLoading } = useRealtimeCandles(symbol, interval, onInitial, onCandle)

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
            background: 'rgba(13,15,20,0.8)',
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