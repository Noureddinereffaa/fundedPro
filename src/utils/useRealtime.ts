import { useState, useEffect, useRef, useCallback } from 'react'
import { dataClient } from './wsClient'
import { ALL_SYMBOLS } from './marketData'

export interface Tick {
  symbol: string
  price: number
  change: number
  time: number
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

// ── Global price cache (shared across all hooks) ─────────────
const priceCache = new Map<string, Tick>()
const cacheListeners = new Set<() => void>()

function notifyListeners() {
  cacheListeners.forEach(fn => fn())
}

export function useRealtimePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, Tick>>({})
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(dataClient.connectionStatus)

  useEffect(() => {
    const unsubStatus = dataClient.onStatusChange(setConnectionStatus)
    dataClient.connect().catch(() => {})
    return unsubStatus
  }, [])

  useEffect(() => {
    if (symbols.length === 0) return

    const unsubs = symbols.map(symbol =>
      dataClient.subscribeTicker(symbol, (price, change) => {
        const tick: Tick = { symbol, price, change, time: Date.now() }
        priceCache.set(symbol, tick)
        setPrices(prev => ({
          ...prev,
          [symbol]: tick,
        }))
      })
    )

    return () => {
      unsubs.forEach(fn => fn())
    }
  }, [symbols.join(',')])

  return { prices, connectionStatus }
}

// ── useAllMarketPrices: subscribes to ALL symbols at once ─────
export function useAllMarketPrices() {
  const [prices, setPrices] = useState<Record<string, Tick>>(() => {
    // Initialize from cache
    const initial: Record<string, Tick> = {}
    priceCache.forEach((tick, symbol) => { initial[symbol] = tick })
    return initial
  })
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(dataClient.connectionStatus)
  const pendingRef = useRef<Record<string, Tick>>({})
  const rafRef = useRef<number | null>(null)

  // Throttled batch update using requestAnimationFrame
  const flushUpdates = useCallback(() => {
    const updates = pendingRef.current
    if (Object.keys(updates).length === 0) return
    pendingRef.current = {}
    setPrices(prev => ({ ...prev, ...updates }))
    rafRef.current = null
  }, [])

  useEffect(() => {
    const unsubStatus = dataClient.onStatusChange(setConnectionStatus)
    dataClient.connect().catch(() => {})
    return unsubStatus
  }, [])

  useEffect(() => {
    const allSymbols = ALL_SYMBOLS.map(s => s.symbol)

    const unsubs = allSymbols.map(symbol =>
      dataClient.subscribeTicker(symbol, (price, change) => {
        const tick: Tick = { symbol, price, change, time: Date.now() }
        priceCache.set(symbol, tick)
        pendingRef.current[symbol] = tick
        notifyListeners()

        // Schedule a batched RAF update
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(flushUpdates)
        }
      })
    )

    return () => {
      unsubs.forEach(fn => fn())
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [flushUpdates])

  // Helper: get cached price instantly without re-render
  const getCachedPrice = useCallback((symbol: string) => priceCache.get(symbol), [])

  return { prices, connectionStatus, getCachedPrice }
}

export function useRealtimeCandles(
  symbol: string,
  interval: string,
  onInitial: (candles: Candle[]) => void,
  onCandle: (candle: Candle) => void
) {
  const initialRef = useRef(onInitial)
  const candleRef = useRef(onCandle)
  initialRef.current = onInitial
  candleRef.current = onCandle

  useEffect(() => {
    if (!symbol || !interval) return

    dataClient.connect().catch(() => {})

    dataClient.fetchKlines(symbol, interval).then(res => {
      if (res?.klines) {
        initialRef.current(res.klines)
      }
    }).catch(() => {})

    const unsub = dataClient.subscribeCandle(symbol, interval, (kline) => {
      candleRef.current({
        time: kline.time,
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close,
        volume: kline.volume,
      })
    })

    return unsub
  }, [symbol, interval])
}
