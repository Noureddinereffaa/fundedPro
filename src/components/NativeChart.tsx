import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  CrosshairMode,
} from 'lightweight-charts'
import type { ISeriesApi, Time, MouseEventParams } from 'lightweight-charts'
import { useRealtimeCandles } from '../utils/useRealtime'
import type { Candle } from '../utils/useRealtime'

interface NativeChartProps {
  symbol: string
  interval: string
  theme?: 'dark' | 'light'
  onPriceSelect?: (price: number) => void
  positions?: any[]
}

interface OHLCVTooltip {
  open: number
  high: number
  low: number
  close: number
  volume: number
  time: string
  x: number
  y: number
  isUp: boolean
}

// ── Compute EMA ──────────────────────────────────────────────
function computeEMA(data: { time: Time; value: number }[], period: number): { time: Time; value: number }[] {
  if (data.length < period) return []
  const k = 2 / (period + 1)
  const result: { time: Time; value: number }[] = []
  let ema = data.slice(0, period).reduce((s, d) => s + d.value, 0) / period
  result.push({ time: data[period - 1].time, value: ema })
  for (let i = period; i < data.length; i++) {
    ema = data[i].value * k + ema * (1 - k)
    result.push({ time: data[i].time, value: ema })
  }
  return result
}

// ── Format time for tooltip ──────────────────────────────────
function formatTime(unixSec: number): string {
  const d = new Date(unixSec * 1000)
  return d.toLocaleString('en-US', {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function formatPrice(p: number, symbol: string): string {
  if (symbol.includes('JPY') || symbol.includes('N225')) return p.toFixed(3)
  if (symbol.includes('BTC') || symbol.includes('SPX') || symbol.includes('NDX') ||
      symbol.includes('DJI') || symbol.includes('XAU') || symbol.includes('DAX') ||
      symbol.includes('FTSE') || symbol.endsWith('USDT')) return p.toFixed(2)
  if (symbol.includes('XAG') || symbol.includes('SOL')) return p.toFixed(3)
  return p.toFixed(5)
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toFixed(2)
}

export function NativeChart({ symbol, interval, theme = 'dark', onPriceSelect, positions = [] }: NativeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const ema20Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const ema50Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const priceLinesRef = useRef<Map<string, any>>(new Map())
  const dataSetRef = useRef(false)
  const pendingUpdatesRef = useRef<Candle[]>([])
  const candleDataRef = useRef<Candle[]>([]) // full dataset for MA recalc

  const [tooltip, setTooltip] = useState<OHLCVTooltip | null>(null)
  const [showEMA20, setShowEMA20] = useState(true)
  const [showEMA50, setShowEMA50] = useState(true)
  const [showVolume, setShowVolume] = useState(true)

  // Use refs so callbacks always read latest toggle values without stale closures
  const showEMA20Ref = useRef(showEMA20)
  const showEMA50Ref = useRef(showEMA50)
  useEffect(() => { showEMA20Ref.current = showEMA20 }, [showEMA20])
  useEffect(() => { showEMA50Ref.current = showEMA50 }, [showEMA50])

  const isDark = theme === 'dark'

  // ── Update EMAs from stored data ─────────────────────────────
  const updateEMAs = useCallback((data: Candle[]) => {
    if (!seriesRef.current || !chartRef.current) return
    const closes = data.map(c => ({
      time: (c.time > 10000000000 ? Math.floor(c.time / 1000) : c.time) as Time,
      value: c.close,
    }))

    if (ema20Ref.current && showEMA20Ref.current) {
      const ema20 = computeEMA(closes, 20)
      if (ema20.length > 0) ema20Ref.current.setData(ema20)
    }
    if (ema50Ref.current && showEMA50Ref.current) {
      const ema50 = computeEMA(closes, 50)
      if (ema50.length > 0) ema50Ref.current.setData(ema50)
    }
  }, []) // stable — reads latest values via refs

  // ── Initialize Chart ─────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      autoSize: false,
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0d0f14' : '#ffffff' },
        textColor: isDark ? '#d1d4dc' : '#131722',
        fontFamily: "'Inter', 'Roboto', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isDark ? '#1a1d27' : '#f0f3fa', style: 1 },
        horzLines: { color: isDark ? '#1a1d27' : '#f0f3fa', style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1, color: isDark ? '#4a4e5a' : '#b0b3bb', style: 1,
          labelBackgroundColor: isDark ? '#2a2e3e' : '#f0f3fa',
        },
        horzLine: {
          width: 1, color: isDark ? '#4a4e5a' : '#b0b3bb', style: 1,
          labelBackgroundColor: '#2962FF',
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: isDark ? '#1e222d' : '#e0e3eb',
        barSpacing: 8,
        rightOffset: 5,
        fixLeftEdge: false,
        lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: {
        borderColor: isDark ? '#1e222d' : '#e0e3eb',
        autoScale: true,
        scaleMargins: { top: 0.05, bottom: showVolume ? 0.2 : 0.05 },
      },
    })

    chartRef.current = chart

    // ── Candlestick Series ────────────────────────────────────
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })
    seriesRef.current = candlestickSeries

    // ── Volume Histogram ──────────────────────────────────────
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    })
    volumeSeriesRef.current = volumeSeries

    // ── EMA Lines ────────────────────────────────────────────
    const ema20Series = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    })
    ema20Ref.current = ema20Series

    const ema50Series = chart.addSeries(LineSeries, {
      color: '#8b5cf6',
      lineWidth: 1,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    })
    ema50Ref.current = ema50Series

    // ── Price Click ───────────────────────────────────────────
    chart.subscribeClick((param: MouseEventParams) => {
      if (!param.point) return
      const price = candlestickSeries.coordinateToPrice(param.point.y)
      if (price !== null && onPriceSelect) {
        onPriceSelect(Number(price.toFixed(5)))
      }
    })

    // ── OHLCV Crosshair Tooltip ────────────────────────────────
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!param.point || !param.time || !chartContainerRef.current) {
        setTooltip(null)
        return
      }
      const candleData = param.seriesData.get(candlestickSeries) as any
      const volData = param.seriesData.get(volumeSeries) as any
      if (!candleData) { setTooltip(null); return }

      const containerRect = chartContainerRef.current.getBoundingClientRect()
      const x = param.point.x
      const y = Math.max(10, Math.min(param.point.y - 70, containerRect.height - 150))

      setTooltip({
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: volData?.value ?? 0,
        time: formatTime(param.time as number),
        x,
        y,
        isUp: candleData.close >= candleData.open,
      })
    })

    // ── Resize Handler ────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    })
    ro.observe(chartContainerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      dataSetRef.current = false
      pendingUpdatesRef.current = []
      candleDataRef.current = []
    }
  }, [isDark, symbol, interval]) // Re-create on theme/symbol/interval change

  // ── Toggle EMA visibility ────────────────────────────────────
  useEffect(() => {
    if (ema20Ref.current) {
      ema20Ref.current.applyOptions({ visible: showEMA20 })
    }
  }, [showEMA20])

  useEffect(() => {
    if (ema50Ref.current) {
      ema50Ref.current.applyOptions({ visible: showEMA50 })
    }
  }, [showEMA50])

  useEffect(() => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: showVolume })
    }
  }, [showVolume])

  // ── Data Subscription ────────────────────────────────────────
  useRealtimeCandles(
    symbol,
    interval as any,
    (klines) => {
      if (!seriesRef.current || !volumeSeriesRef.current) return

      const formatted = klines.map(k => ({
        ...k,
        time: (k.time > 10000000000 ? Math.floor(k.time / 1000) : k.time) as Time
      })).sort((a, b) => (a.time as number) - (b.time as number))

      // Deduplicate strictly ascending
      const deduplicated: typeof formatted = []
      let lastTime = 0
      for (const k of formatted) {
        if ((k.time as number) > lastTime) {
          deduplicated.push(k)
          lastTime = k.time as number
        } else {
          deduplicated[deduplicated.length - 1] = k
        }
      }

      if (deduplicated.length === 0 && dataSetRef.current) return

      seriesRef.current.setData(deduplicated)

      // Volume data
      const volData = deduplicated.map(k => ({
        time: k.time,
        value: k.volume,
        color: (k.close >= k.open)
          ? 'rgba(38, 166, 154, 0.35)'
          : 'rgba(239, 83, 80, 0.35)',
      }))
      volumeSeriesRef.current.setData(volData)

      // Store for EMA calc
      candleDataRef.current = klines
      updateEMAs(klines)

      dataSetRef.current = true

      // Apply buffered updates
      const pending = pendingUpdatesRef.current
      pendingUpdatesRef.current = []
      for (const pc of pending) {
        const t = (pc.time > 10000000000 ? Math.floor(pc.time / 1000) : pc.time) as Time
        seriesRef.current.update({ ...pc, time: t })
        volumeSeriesRef.current?.update({
          time: t,
          value: pc.volume,
          color: pc.close >= pc.open ? 'rgba(38, 166, 154, 0.35)' : 'rgba(239, 83, 80, 0.35)',
        })
      }
    },
    (candle) => {
      if (!seriesRef.current) return
      const t = (candle.time > 10000000000 ? Math.floor(candle.time / 1000) : candle.time) as Time

      if (!dataSetRef.current) {
        pendingUpdatesRef.current.push(candle)
        return
      }

      seriesRef.current.update({ ...candle, time: t })
      volumeSeriesRef.current?.update({
        time: t,
        value: candle.volume,
        color: candle.close >= candle.open ? 'rgba(38, 166, 154, 0.35)' : 'rgba(239, 83, 80, 0.35)',
      })

      // Update last candle in cache and recalc EMAs (throttled)
      const data = candleDataRef.current
      const last = data[data.length - 1]
      if (last && last.time === candle.time) {
        data[data.length - 1] = candle
      } else {
        data.push(candle)
      }
      // Only update EMA tail for performance
      if (ema20Ref.current && showEMA20) {
        const closes = data.slice(-60).map(c => ({
          time: (c.time > 10000000000 ? Math.floor(c.time / 1000) : c.time) as Time,
          value: c.close,
        }))
        const ema20 = computeEMA(closes, Math.min(20, closes.length))
        if (ema20.length > 0) ema20Ref.current.update(ema20[ema20.length - 1])
      }
      if (ema50Ref.current && showEMA50) {
        const closes = data.slice(-100).map(c => ({
          time: (c.time > 10000000000 ? Math.floor(c.time / 1000) : c.time) as Time,
          value: c.close,
        }))
        const ema50 = computeEMA(closes, Math.min(50, closes.length))
        if (ema50.length > 0) ema50Ref.current.update(ema50[ema50.length - 1])
      }
    }
  )

  // ── Draw Positions ───────────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current) return
    const series = seriesRef.current

    priceLinesRef.current.forEach(line => series.removePriceLine(line))
    priceLinesRef.current.clear()

    positions.forEach(p => {
      if (p.symbol !== symbol) return

      const entryLine = series.createPriceLine({
        price: Number(p.openPrice),
        color: '#2962FF',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `${p.side.toUpperCase()} ${p.volume}`,
      })
      priceLinesRef.current.set(`entry_${p.id}`, entryLine)

      if (p.stopLoss) {
        const slLine = series.createPriceLine({
          price: Number(p.stopLoss),
          color: '#ef5350',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: 'SL',
        })
        priceLinesRef.current.set(`sl_${p.id}`, slLine)
      }

      if (p.takeProfit) {
        const tpLine = series.createPriceLine({
          price: Number(p.takeProfit),
          color: '#26a69a',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: 'TP',
        })
        priceLinesRef.current.set(`tp_${p.id}`, tpLine)
      }
    })
  }, [positions, symbol])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Chart container */}
      <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* ── Indicator Toolbar ── */}
      <div className="chart-toolbar">
        <button
          className={`chart-indicator-btn ${showEMA20 ? 'active' : ''}`}
          onClick={() => setShowEMA20(v => !v)}
          title="EMA 20"
        >
          <span className="chart-indicator-dot" style={{ background: '#f59e0b' }} />
          EMA 20
        </button>
        <button
          className={`chart-indicator-btn ${showEMA50 ? 'active' : ''}`}
          onClick={() => setShowEMA50(v => !v)}
          title="EMA 50"
        >
          <span className="chart-indicator-dot" style={{ background: '#8b5cf6' }} />
          EMA 50
        </button>
        <button
          className={`chart-indicator-btn ${showVolume ? 'active' : ''}`}
          onClick={() => setShowVolume(v => !v)}
          title="Volume"
        >
          <span className="chart-indicator-dot" style={{ background: '#2962FF' }} />
          Vol
        </button>
      </div>

      {/* ── OHLCV Tooltip ── */}
      {tooltip && (
        <div
          className={`chart-ohlcv-tooltip ${tooltip.isUp ? 'up' : 'down'}`}
          style={{
            left: tooltip.x > (chartContainerRef.current?.clientWidth ?? 600) / 2
              ? tooltip.x - 170
              : tooltip.x + 12,
            top: tooltip.y,
          }}
        >
          <div className="chart-tooltip-time">{tooltip.time}</div>
          <div className="chart-tooltip-row">
            <span>O</span><span className="chart-tooltip-val">{formatPrice(tooltip.open, symbol)}</span>
            <span>H</span><span className="chart-tooltip-val" style={{ color: '#26a69a' }}>{formatPrice(tooltip.high, symbol)}</span>
          </div>
          <div className="chart-tooltip-row">
            <span>L</span><span className="chart-tooltip-val" style={{ color: '#ef5350' }}>{formatPrice(tooltip.low, symbol)}</span>
            <span>C</span><span className={`chart-tooltip-val ${tooltip.isUp ? 'up' : 'down'}`}>{formatPrice(tooltip.close, symbol)}</span>
          </div>
          <div className="chart-tooltip-vol">
            Vol: {formatVolume(tooltip.volume)}
          </div>
        </div>
      )}

      {/* Click hint */}
      <div className="chart-hint">
        💡 Click chart → copy price
      </div>
    </div>
  )
}
