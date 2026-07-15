import { useMemo } from 'react'
import type { IChartApi } from 'lightweight-charts'
import { CHART_LAYOUT } from '../constants'
import type { PaneLayoutConfig } from '../types'

/**
 * Compute pane layout percentages based on indicators and volume visibility.
 */
export function usePaneLayout(indicators: string[], showVolume: boolean): PaneLayoutConfig {
  return useMemo(() => {
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
}

/**
 * Resize all chart panes to match container dimensions.
 */
export function resizeAllCharts(
  container: HTMLDivElement | null,
  charts: { chart: IChartApi | null; pct: number }[],
): void {
  if (!container) return
  const { clientWidth: w, clientHeight: h } = container
  if (w === 0 || h === 0) return
  for (const { chart, pct } of charts) {
    if (!chart) continue
    chart.applyOptions({ width: w, height: Math.max(20, Math.floor(h * pct)) })
  }
}

/**
 * Sync time scales across all chart panes to match the main chart.
 */
export function syncTimeScales(charts: IChartApi[]): void {
  if (charts.length < 2) return

  const main = charts[0]
  const range = main.timeScale().getVisibleLogicalRange()
  if (!range) return

  for (let i = 1; i < charts.length; i++) {
    try {
      charts[i].timeScale().setVisibleLogicalRange(range)
    } catch {}
  }
}