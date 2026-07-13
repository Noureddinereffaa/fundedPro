import type { RefObject } from 'react'

interface PaneLayout {
  main: { top: number; height: number }
  volume: { top: number; height: number }
  rsi: { top: number; height: number }
  macd: { top: number; height: number }
}

interface ChartPanesProps {
  containerRef: RefObject<HTMLDivElement | null>
  mainPaneRef: RefObject<HTMLDivElement | null>
  volumePaneRef: RefObject<HTMLDivElement | null> | null
  rsiPaneRef: RefObject<HTMLDivElement | null>
  macdPaneRef: RefObject<HTMLDivElement | null>
  paneLayout: PaneLayout
  indicators: string[]
}

export function ChartPanes({
  containerRef,
  mainPaneRef,
  volumePaneRef,
  rsiPaneRef,
  macdPaneRef,
  paneLayout,
  indicators,
}: ChartPanesProps) {
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={mainPaneRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${paneLayout.main.height * 100}%`,
        }}
      />
      {volumePaneRef && (
        <div
          ref={volumePaneRef}
          style={{
            position: 'absolute',
            top: `${paneLayout.volume.top * 100}%`,
            left: 0,
            right: 0,
            height: `${paneLayout.volume.height * 100}%`,
          }}
        />
      )}
      {indicators.includes('RSI') && (
        <div
          ref={rsiPaneRef}
          style={{
            position: 'absolute',
            top: `${paneLayout.rsi.top * 100}%`,
            left: 0,
            right: 0,
            height: `${paneLayout.rsi.height * 100}%`,
          }}
        />
      )}
      {indicators.includes('MACD') && (
        <div
          ref={macdPaneRef}
          style={{
            position: 'absolute',
            top: `${paneLayout.macd.top * 100}%`,
            left: 0,
            right: 0,
            height: `${paneLayout.macd.height * 100}%`,
          }}
        />
      )}
    </div>
  )
}
