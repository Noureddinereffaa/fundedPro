import type { Candle } from '../../shared/types'
import { calcRSI, calcMACD, calcMA, calcEMA, calcBB } from './indicators-core'

interface WorkerRequest {
  id: number
  type: 'rsi' | 'macd' | 'ma' | 'ema' | 'bb'
  data: Candle[]
  period?: number
  stdDev?: number
}

interface WorkerResponse {
  id: number
  type: string
  result: unknown
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, type, data, period, stdDev } = e.data
  let result: unknown
  switch (type) {
    case 'rsi':
      result = calcRSI(data, period ?? 14)
      break
    case 'macd':
      result = calcMACD(data)
      break
    case 'ma':
      result = calcMA(data, period ?? 7)
      break
    case 'ema':
      result = calcEMA(data, period ?? 9)
      break
    case 'bb':
      result = calcBB(data, period ?? 20, stdDev ?? 2)
      break
  }
  self.postMessage({ id, type, result } as WorkerResponse)
}
