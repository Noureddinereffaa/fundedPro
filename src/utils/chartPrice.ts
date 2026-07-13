import type { Candle } from '../../shared/types'

export function resolveChartReferencePrice(
  livePrice: number | undefined,
  latestCandle: Candle | undefined,
): number | null {
  if (typeof livePrice === 'number' && Number.isFinite(livePrice) && livePrice > 0) {
    return livePrice
  }

  if (latestCandle) {
    const close = Number(latestCandle.close)
    if (Number.isFinite(close) && close > 0) return close
  }

  return null
}
