import { subscribers, symbolTimers } from './engine.js'

const POLL_INTERVALS = { crypto: 2000 }

export { symbolTimers }

export function startPolling(symbol) {
  if (symbolTimers.has(symbol)) return symbolTimers.get(symbol)

  const interval = setInterval(async () => {
    if (!subscribers.has(symbol) || subscribers.get(symbol).size === 0) {
      stopPolling(symbol)
      return
    }

    try {
    } catch (err) {
      console.error(`[Polling] Error for ${symbol}:`, err.message)
    }
  }, POLL_INTERVALS.crypto)

  symbolTimers.set(symbol, interval)
  return interval
}

export function stopPolling(symbol) {
  const timer = symbolTimers.get(symbol)
  if (timer) {
    clearInterval(timer)
    symbolTimers.delete(symbol)
  }
}
