import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { dataClient } from './wsClient'
import { ALL_SYMBOLS, getMarketInfo, getLookbackDays } from './marketData'
import { getCachedKlines, setCachedKlines } from './klineCache'
import { getMarketStatus } from './marketHours'
import type { MarketStatus } from '../../shared/types'
import { calcPnl, getQuoteToUsdRate } from './trading'
import { generateMockKlines } from './mockData'
import type { Candle, Tick, ConnectionStatus, Position } from '../../shared/types'
import { apiErrorHandler } from './logger'

// ── Global price cache (shared across all hooks) ─────────────
const priceCache = new Map<string, Tick>()
const cacheListeners = new Set<() => void>()

function notifyListeners() {
  cacheListeners.forEach((fn) => fn())
}

export function useRealtimePrices(symbols: string[]) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(dataClient.connectionStatus)
  const symbolsKey = useMemo(() => JSON.stringify(symbols), [symbols])

  useEffect(() => {
    const unsubStatus = dataClient.onStatusChange(setConnectionStatus)
    dataClient.connect().catch(apiErrorHandler('useRealtime'))
    return unsubStatus
  }, [])

  useEffect(() => {
    if (symbols.length === 0) return

    const unsubs = symbols.map((symbol) =>
      dataClient.subscribeTicker(symbol, (price, change) => {
        const tick: Tick = { symbol, price, change, time: Date.now() }
        priceCache.set(symbol, tick)
        notifyListeners() // Notify external store listeners
      }),
    )

    return () => {
      unsubs.forEach((fn) => fn())
    }
  }, [symbolsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Provide a snapshot of current prices (non-reactive to avoid parent re-renders)
  const getPrices = useCallback(() => {
    const p: Record<string, Tick> = {}
    symbols.forEach((s) => {
      const t = priceCache.get(s)
      if (t) p[s] = t
    })
    return p
  }, [symbolsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return { getPrices, connectionStatus }
}

import { useSyncExternalStore } from 'react'

export function useLivePrice(symbol: string): Tick | undefined {
  const subscribe = useCallback((onStoreChange: () => void) => {
    cacheListeners.add(onStoreChange)
    return () => { cacheListeners.delete(onStoreChange) }
  }, [])
  const getSnapshot = useCallback(() => priceCache.get(symbol), [symbol])
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function useTotalFloatingPnl(positions: Position[]): number {
  const positionsRef = useRef(positions)
  positionsRef.current = positions
  const cacheRef = useRef<{ positionsKey: string; total: number } | null>(null)

  const subscribe = useCallback((onStoreChange: () => void) => {
    cacheListeners.add(onStoreChange)
    return () => { cacheListeners.delete(onStoreChange) }
  }, [])
  const getSnapshot = useCallback(() => {
    const current = positionsRef.current
    const key = current.map((p) => `${p.id}_${p.openPrice}_${p.volume}`).join('|')
    if (cacheRef.current && cacheRef.current.positionsKey === key) return cacheRef.current.total
    let total = 0
    for (const p of current) {
      const lp = priceCache.get(p.symbol)?.price ?? Number(p.currentPrice) ?? Number(p.openPrice)
      const getPrice = (sym: string) => priceCache.get(sym)?.price
      const rate = getQuoteToUsdRate(p.symbol, getPrice)
      total += calcPnl(p.side, Number(p.openPrice), lp, Number(p.volume), p.symbol, rate)
    }
    const result = Number(total.toFixed(4))
    cacheRef.current = { positionsKey: key, total: result }
    return result
  }, [])
  return useSyncExternalStore(subscribe, getSnapshot)
}

// ── Smooth P&L: client-side tick interpolation ────────────────
function applySmoothWalk(price: number, volatility: number): number {
  const walk = (Math.random() - 0.5) * 2 * volatility * price
  return price + walk
}

export function useSmoothTotalFloatingPnl(positions: Position[]): number {
  const positionsRef = useRef(positions)
  positionsRef.current = positions
  const [pnl, setPnl] = useState(0)
  const smoothPricesRef = useRef<Map<string, number>>(new Map())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const listener = () => {
      for (const p of positionsRef.current) {
        const real = priceCache.get(p.symbol)?.price
        if (real !== undefined) {
          smoothPricesRef.current.set(p.symbol, real)
        }
      }
    }
    cacheListeners.add(listener)
    return () => { cacheListeners.delete(listener) }
  }, [])

  // Seed smooth prices from open prices
  useEffect(() => {
    for (const p of positions) {
      if (!smoothPricesRef.current.has(p.symbol)) {
        smoothPricesRef.current.set(p.symbol, Number(p.openPrice))
      }
    }
  }, [positions])

  useEffect(() => {
    if (positionsRef.current.length === 0) return

    timerRef.current = setInterval(() => {
      let total = 0
      for (const p of positionsRef.current) {
        const real = priceCache.get(p.symbol)?.price
        let sp: number
        if (real !== undefined) {
          sp = real
          const vol = p.symbol.includes('XAU') || p.symbol.includes('XAG') ? 0.0005 : 0.00015
          sp = applySmoothWalk(sp, vol)
          smoothPricesRef.current.set(p.symbol, sp)
        } else {
          sp = smoothPricesRef.current.get(p.symbol) ?? Number(p.openPrice)
        }
        total += calcPnl(p.side, Number(p.openPrice), sp, Number(p.volume), p.symbol, getQuoteToUsdRate(p.symbol, (sym) => priceCache.get(sym)?.price))
      }
      setPnl(Number(total.toFixed(2)))
    }, 80)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (positions.length === 0) return 0
  return pnl
}

// ── useAllMarketPrices: subscribes to ALL symbols at once ─────
export function useAllMarketPrices() {
  const [prices, setPrices] = useState<Record<string, Tick>>(() => {
    const initial: Record<string, Tick> = {}
    priceCache.forEach((tick, symbol) => {
      initial[symbol] = tick
    })
    return initial
  })
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(dataClient.connectionStatus)
  const pendingRef = useRef<Record<string, Tick>>({})
  const rafRef = useRef<number | null>(null)

  const flushUpdates = useCallback(() => {
    const updates = pendingRef.current
    if (Object.keys(updates).length === 0) return
    pendingRef.current = {}
    setPrices((prev) => ({ ...prev, ...updates }))
    rafRef.current = null
  }, [])

  useEffect(() => {
    const unsubStatus = dataClient.onStatusChange(setConnectionStatus)
    dataClient.connect().catch(apiErrorHandler('useRealtime'))
    return unsubStatus
  }, [])

  useEffect(() => {
    const allSymbols = ALL_SYMBOLS.map((s) => s.symbol)

    const unsubs = allSymbols.map((symbol) =>
      dataClient.subscribeTicker(symbol, (price, change) => {
        const tick: Tick = { symbol, price, change, time: Date.now() }
        priceCache.set(symbol, tick)
        pendingRef.current[symbol] = tick
        notifyListeners()

        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(flushUpdates)
        }
      }),
    )

    return () => {
      unsubs.forEach((fn) => fn())
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [flushUpdates])

  const getCachedPrice = useCallback((symbol: string) => priceCache.get(symbol), [])

  return { prices, connectionStatus, getCachedPrice }
}

export function useRealtimeCandles(
  symbol: string,
  interval: string,
  onInitial: (candles: Candle[]) => void,
  onCandle: (candle: Candle) => void,
): { isLoading: boolean } {
  const initialRef = useRef(onInitial)
  const candleRef = useRef(onCandle)
  initialRef.current = onInitial
  candleRef.current = onCandle
  const [isLoading, setIsLoading] = useState(true)
  const keyRef = useRef('')
  const cleanupRef = useRef<(() => void) | null>(null)
  const loadCandlesRef = useRef<((sym: string, int: string) => void) | null>(null)

  const loadCandles = useCallback((sym: string, int: string) => {
    cleanupRef.current?.()
    const currentKey = `${sym}|${int}`
    keyRef.current = currentKey
    setIsLoading(true)

    const cached = getCachedKlines(sym, int)
    let loaded = false
    if (cached && cached.length > 0) {
      loaded = true
      initialRef.current(cached)
    }

    let localStatus: any
    try {
      localStatus = getMarketStatus(sym)
    } catch {
      localStatus = { open: true }
    }

    if (!localStatus.open) {
      if (keyRef.current === currentKey) setIsLoading(false)
      return
    }

    dataClient.connect().catch(apiErrorHandler('useRealtime'))

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    const tryMockFallback = (source: string) => {
      if (keyRef.current !== currentKey || loaded) return
      const to = Math.floor(Date.now() / 1000)
      const lookback = getLookbackDays(int)
      const from = to - lookback * 86400
      if (import.meta.env.DEV) console.warn(`[useRealtimeCandles] ${source} for ${sym}, using mock data`)
      const klines = generateMockKlines(sym, int, from, to)
      if (klines && klines.length > 0 && keyRef.current === currentKey) {
        loaded = true
        setCachedKlines(sym, int, klines)
        initialRef.current(klines)
      }
      if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
    }

    fallbackTimer = setTimeout(() => tryMockFallback('WS timeout (4s)'), 4000)

    dataClient
      .fetchKlines(sym, int)
      .then((res) => {
        if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
        if (keyRef.current !== currentKey) return
        if (res?.klines && res.klines.length > 0) {
          loaded = true
          setCachedKlines(sym, int, res.klines)
          initialRef.current(res.klines)
        } else if (!cached || cached.length === 0) {
          tryMockFallback('WS returned empty')
        }
      })
      .catch((err) => {
        if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
        if (keyRef.current !== currentKey) return
        apiErrorHandler('useRealtime')(err)
        tryMockFallback('WS error')
      })
      .finally(() => {
        if (keyRef.current === currentKey) setIsLoading(false)
      })

    const unsub = dataClient.subscribeCandle(sym, int, (kline) => {
      if (keyRef.current !== currentKey) return
      candleRef.current({
        time: Number(kline.time) || Math.floor(Date.now() / 1000),
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close,
        volume: kline.volume,
      })
    })

    cleanupRef.current = () => {
      if (fallbackTimer) clearTimeout(fallbackTimer)
      unsub()
    }
  }, [])

  loadCandlesRef.current = loadCandles

  useEffect(() => {
    if (!symbol || !interval) {
      setIsLoading(false)
      return
    }
    loadCandles(symbol, interval)
    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [symbol, interval, loadCandles])

  return { isLoading }
}

export function useMarketStatus(_symbol: string): MarketStatus {
  return { open: true, text: 'Open 24/7', nextOpen: null, nextClose: null }
}
