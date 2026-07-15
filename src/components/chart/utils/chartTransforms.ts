import type { CandlestickData, HistogramData } from 'lightweight-charts'
import type { Candle } from '../../../../shared/types'
import { toTVTime } from '../constants'

/**
 * Binary search for a candle by timestamp in a sorted array.
 * @returns index of the candle, or -1 if not found
 */
export function binarySearchTime(arr: Candle[], time: number): number {
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

/**
 * Convert internal Candle[] to TradingView CandlestickData[]
 */
export function toTVData(candles: Candle[]): CandlestickData[] {
  return candles.map((c) => ({
    time: toTVTime(c.time),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }))
}

/**
 * Convert internal Candle[] to TradingView HistogramData[] for volume.
 */
export function toVolumeData(
  candles: Candle[],
  volumeUpColor: string,
  volumeDownColor: string,
): HistogramData[] {
  return candles.map((c) => ({
    time: toTVTime(c.time),
    value: c.volume || 0,
    color: c.close >= c.open ? volumeUpColor : volumeDownColor,
  }))
}