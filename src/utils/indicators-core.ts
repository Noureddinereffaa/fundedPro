import type { Candle } from '../../shared/types'

export function calcMA(data: Candle[], period: number): number[] {
  const result: number[] = []
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close
    if (i >= period) sum -= data[i - period].close
    if (i < period - 1) {
      result.push(NaN)
      continue
    }
    result.push(sum / period)
  }
  return result
}

export function calcEMA(data: Candle[], period: number): number[] {
  const result: number[] = []
  const k = 2 / (period + 1)
  let ema = data[0]?.close ?? 0
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(ema)
      continue
    }
    ema = data[i].close * k + ema * (1 - k)
    result.push(ema)
  }
  return result
}

export function calcRSI(data: Candle[], period: number): number[] {
  const result: number[] = [NaN]
  let avgGain = 0,
    avgLoss = 0
  for (let i = 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    if (i < period) {
      avgGain += gain / period
      avgLoss += loss / period
      result.push(NaN)
      continue
    }
    if (i === period) {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
    }
    if (avgLoss === 0) {
      result.push(100)
      continue
    }
    const rs = avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }
  return result
}

export function calcBB(data: Candle[], period: number, stdDev: number) {
  const upper: number[] = [],
    middle: number[] = [],
    lower: number[] = []
  let sum = 0
  let sumSq = 0
  for (let i = 0; i < data.length; i++) {
    const close = data[i].close
    sum += close
    sumSq += close * close
    if (i >= period) {
      const oldClose = data[i - period].close
      sum -= oldClose
      sumSq -= oldClose * oldClose
    }
    if (i < period - 1) {
      upper.push(NaN)
      middle.push(NaN)
      lower.push(NaN)
      continue
    }
    const ma = sum / period
    const variance = sumSq / period - ma * ma
    const std = Math.sqrt(Math.max(0, variance))
    upper.push(ma + stdDev * std)
    middle.push(ma)
    lower.push(ma - stdDev * std)
  }
  return { upper, middle, lower }
}

export function calcMACD(data: Candle[]) {
  const ema12 = calcEMA(data, 12)
  const ema26 = calcEMA(data, 26)
  const macd: number[] = []
  const signal: number[] = []
  const histogram: number[] = []

  for (let i = 0; i < data.length; i++) {
    macd.push(ema12[i] - ema26[i])
  }

  const signalPeriod = 9
  const k = 2 / (signalPeriod + 1)
  let emaSignal = macd[0] ?? 0
  for (let i = 0; i < macd.length; i++) {
    if (i === 0) {
      signal.push(emaSignal)
      histogram.push(0)
      continue
    }
    emaSignal = macd[i] * k + emaSignal * (1 - k)
    signal.push(emaSignal)
    histogram.push(macd[i] - emaSignal)
  }

  return { macd, signal, histogram }
}
