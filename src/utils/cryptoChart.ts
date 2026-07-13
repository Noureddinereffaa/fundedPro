export interface CryptoChartCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function mergeLiveCandle(candles: CryptoChartCandle[], incoming: CryptoChartCandle): CryptoChartCandle[] {
  if (!candles.length) return [incoming]

  const last = candles[candles.length - 1]
  if (last.time === incoming.time) {
    return [
      ...candles.slice(0, -1),
      {
        ...last,
        open: last.open,
        high: Math.max(last.high, incoming.high),
        low: Math.min(last.low, incoming.low),
        close: incoming.close,
        volume: Math.max(last.volume, incoming.volume),
      },
    ]
  }

  return [...candles, incoming]
}

export function trimCandles(candles: CryptoChartCandle[], maxLength: number): CryptoChartCandle[] {
  if (candles.length <= maxLength) return candles
  return candles.slice(candles.length - maxLength)
}

export function getMaxCandlesForInterval(interval: string): number {
  const fastIntervals = ['1s', '5s', '15s', '30s']
  if (fastIntervals.includes(interval)) return 300
  if (interval === '60' || interval === '300') return 450
  if (interval === '900' || interval === '1800' || interval === '3600') return 600
  return 800
}
