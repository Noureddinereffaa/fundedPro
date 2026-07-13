import redis from '../redis.js'
import {
  SYMBOL_MAP,
  subscribers,
  priceCache,
  addActiveInterval,
  removeActiveInterval,
  activeSubMinute,
  tickBuffers,
  candleStates,
  klinesCache,
  cacheTTL,
  getTicks,
  getRecentCandles,
  seedTickBuffer,
  enhanceCandles,
  broadcastTo,
  COMMON_INTERVALS,
} from './engine.js'
import { fetchBinanceKlines, subscribeBinance, unsubscribeBinance } from '../data-sources/binance.js'

export async function handleSubscribe(ws, msg) {
  const rawSymbols = msg.symbols || msg.symbol
  const symbols = Array.isArray(rawSymbols) ? rawSymbols : [rawSymbols]
  const interval = msg.interval
  const isSubMinute = interval && ['1s', '5s', '15s', '30s'].includes(interval)
  const needsInitial = !!msg.needsInitial

  for (const symbol of symbols) {
    const info = SYMBOL_MAP[symbol]
    if (!info || info.type !== 'crypto') {
      broadcastTo(ws, { type: 'error', message: `Unsupported symbol: ${symbol}` })
      continue
    }

    if (!subscribers.has(symbol)) subscribers.set(symbol, new Set())
    subscribers.get(symbol).add(ws)
    if (interval) addActiveInterval(symbol, interval)
    redis.addActiveSymbol(symbol)

    if (isSubMinute) activeSubMinute.add(symbol)

    subscribeBinance(symbol)

    if (needsInitial) {
      try {
        await fetchInitialKlines(ws, symbol, interval, isSubMinute)
      } catch (err) {
        console.error(`[Initial] Error fetching klines for ${symbol}:`, err.message)
        const cached = priceCache.get(symbol)
        const quote = cached ? { price: cached.price, change: cached.change } : null
        broadcastTo(ws, {
          type: 'initial',
          symbol,
          interval,
          klines: [],
          price: quote?.price || 0,
          change: quote?.change || 0,
          marketStatus: { open: true, text: 'Open 24/7' },
        })
      }
    }
  }
}

async function fetchInitialKlines(ws, symbol, interval, isSubMinute) {
  let klines = null
  const cacheKey = `${symbol}_${interval}`

  const cachedKlines = klinesCache.get(cacheKey)
  if (cachedKlines && Date.now() - cachedKlines.time < cacheTTL(interval)) {
    klines = cachedKlines.klines
  }

  if (!klines) {
    klines = await fetchBinanceKlines(symbol, interval)
    if (isSubMinute && klines && klines.length > 0) {
      const toSec = { '1s': 1, '5s': 5, '15s': 15, '30s': 30 }[interval]
      seedTickBuffer(symbol, klines, toSec)
    }

    if (klines && klines.length > 0) {
      klines = enhanceCandles(klines)
      klinesCache.set(cacheKey, { klines, time: Date.now() })
    }

    if (!klines || klines.length === 0) {
      const recent = getRecentCandles(symbol, interval, 300)
      if (recent.length > 10) {
        klines = recent
        klinesCache.set(cacheKey, { klines, time: Date.now() })
      } else if (recent.length > 0) {
        klines = recent
      }
    }
  }

  const sc = candleStates.get(symbol)
  if (sc && sc.has(interval) && klines && klines.length > 0) {
    const liveCandle = sc.get(interval)
    const lastIdx = klines.length - 1
    const lastKline = klines[lastIdx]
    if (liveCandle && liveCandle.time >= lastKline.time) {
      if (liveCandle.time === lastKline.time) {
        klines[lastIdx] = { ...lastKline, ...liveCandle, volume: liveCandle.volume || lastKline.volume }
      } else {
        klines.push({ ...liveCandle })
      }
    }
  }

  const cached = priceCache.get(symbol)
  let quote = cached ? { price: cached.price, change: cached.change } : null

  broadcastTo(ws, {
    type: 'initial',
    symbol,
    interval,
    klines: klines || [],
    price: quote?.price || 0,
    change: quote?.change || 0,
    marketStatus: { open: true, text: 'Open 24/7' },
  })

  if (klines && klines.length > 0 && !isSubMinute) {
    for (const ci of COMMON_INTERVALS) {
      if (ci === interval) continue
      const ciKey = `${symbol}_${ci}`
      const ciCached = klinesCache.get(ciKey)
      if (ciCached && Date.now() - ciCached.time < cacheTTL(ci)) continue
      const doPreCache = async () => {
        let ck = await fetchBinanceKlines(symbol, ci)
        if (ck && ck.length > 0) {
          klinesCache.set(ciKey, { klines: enhanceCandles(ck), time: Date.now() })
        }
      }
      doPreCache().catch((e) => console.warn(`[PreCache] Error for ${symbol} ${ci}:`, e?.message || e))
    }
  }
}

export function handleUnsubscribe(ws, msg) {
  const symbols = Array.isArray(msg.symbols) ? msg.symbols : [msg.symbols]
  if (!symbols.length || symbols.some((s) => !s)) return
  const interval = msg.interval
  for (const symbol of symbols) {
    const clients = subscribers.get(symbol)
    if (clients) {
      clients.delete(ws)
      if (interval) removeActiveInterval(symbol, interval)
      if (clients.size === 0) {
        unsubscribeBinance(symbol)
        redis.removeActiveSymbol(symbol)
      }
    }
  }
}
