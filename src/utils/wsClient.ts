import type { Kline } from './marketData'

type TickerCallback = (price: number, change: number) => void
type KlineCallback = (kline: Kline) => void

interface PendingRequest {
  resolve: (data: { klines: Kline[]; price: number; change: number }) => void
  reject: () => void
  timer: ReturnType<typeof setTimeout>
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

class DataClient {
  private ws: WebSocket | null = null
  private status: ConnectionStatus = 'disconnected'
  private connectQueue: Array<() => void> = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private readonly url: string
  private pendingRequests = new Map<string, PendingRequest>()
  private tickerListeners = new Map<string, Set<TickerCallback>>()
  private candleListeners = new Map<string, Map<string, Set<KlineCallback>>>()
  private pendingSymbols = new Set<string>()
  private statusListeners = new Set<(status: ConnectionStatus) => void>()
  private subscribedPairs = new Set<string>() // track which symbol+interval we've subscribed

  constructor(url = 'ws://localhost:3002') {
    this.url = url
  }

  get connectionStatus(): ConnectionStatus {
    return this.status
  }

  onStatusChange(cb: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(cb)
    cb(this.status)
    return () => this.statusListeners.delete(cb)
  }

  private setStatus(s: ConnectionStatus) {
    if (this.status === s) return
    this.status = s
    this.statusListeners.forEach(cb => cb(s))
  }

  connect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.status === 'connected') { resolve(); return }
      if (this.status === 'connecting') {
        this.connectQueue.push(resolve)
        return
      }
      this.setStatus('connecting')
      this.connectInternal(() => {
        this.setStatus('connected')
        this.reconnectAttempt = 0
        resolve()
        const q = this.connectQueue
        this.connectQueue = []
        q.forEach(fn => fn())
      })
    })
  }

  private connectInternal(onOpen?: () => void) {
    try {
      this.ws = new WebSocket(this.url)
    } catch {
      this.scheduleReconnect()
      onOpen?.()
      return
    }

    this.ws.onopen = () => {
      this.setStatus('connected')
      this.reconnectAttempt = 0
      // Resubscribe all pending symbols on reconnect
      for (const pair of this.subscribedPairs) {
        const [symbol, interval] = pair.split('|')
        this.ws?.send(JSON.stringify({ type: 'subscribe', symbols: [symbol], interval, needsInitial: false }))
      }
      for (const symbol of this.pendingSymbols) {
        if (!Array.from(this.subscribedPairs).some(p => p.startsWith(symbol + '|'))) {
          this.ws?.send(JSON.stringify({ type: 'subscribe', symbols: [symbol] }))
        }
      }
      onOpen?.()
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        this.handleMessage(msg)
      } catch {}
    }

    this.ws.onclose = () => {
      this.setStatus('disconnected')
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempt))
    this.reconnectAttempt++
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.setStatus('connecting')
      this.connectInternal()
    }, delay)
  }

  private handleMessage(msg: any) {
    if (msg.type === 'ping') {
      this.ws?.send(JSON.stringify({ type: 'pong' }))
      return
    }

    if (msg.type === 'initial') {
      const key = `${msg.symbol}_${msg.interval || '60'}_initial`
      const pending = this.pendingRequests.get(key)
      if (pending) {
        pending.resolve({ klines: msg.klines || [], price: msg.price, change: msg.change })
        this.pendingRequests.delete(key)
      }
      const tickerListeners = this.tickerListeners.get(msg.symbol)
      if (tickerListeners) {
        for (const cb of tickerListeners) cb(msg.price, msg.change)
      }
    }

    if (msg.type === 'tick') {
      const listeners = this.tickerListeners.get(msg.symbol)
      if (listeners) {
        for (const cb of listeners) cb(msg.price, msg.change)
      }
    }

    if (msg.type === 'candle' || msg.type === 'candle_update') {
      const symbolListeners = this.candleListeners.get(msg.symbol)
      if (symbolListeners) {
        const intervalListeners = symbolListeners.get(msg.interval)
        if (intervalListeners) {
          for (const cb of intervalListeners) cb(msg.kline)
        }
      }
    }

    if (msg.type === 'error') {
      console.warn(`[DataClient] Server error:`, msg.message)
    }
  }

  async fetchKlines(symbol: string, interval: string): Promise<{ klines: Kline[]; price: number; change: number } | null> {
    if (this.status !== 'connected') await this.connect().catch(() => {})

    if (this.status === 'connected') {
      const pairKey = `${symbol}|${interval}`
      this.subscribedPairs.add(pairKey)
      this.pendingSymbols.add(symbol)

      return new Promise<{ klines: Kline[]; price: number; change: number }>((resolve, reject) => {
        const key = `${symbol}_${interval}_initial`
        const timer = setTimeout(() => {
          this.pendingRequests.delete(key)
          resolve({ klines: [], price: 0, change: 0 })
        }, 15000)

        this.pendingRequests.set(key, { resolve, reject: () => { clearTimeout(timer); reject() }, timer })
        this.ws!.send(JSON.stringify({ type: 'subscribe', symbols: [symbol], interval, needsInitial: true }))
      }).catch(() => null)
    }

    return null
  }

  subscribeTicker(symbol: string, callback: TickerCallback): () => void {
    if (!this.tickerListeners.has(symbol)) this.tickerListeners.set(symbol, new Set())
    this.tickerListeners.get(symbol)!.add(callback)
    this.pendingSymbols.add(symbol)

    if (this.status === 'connected') {
      this.ws?.send(JSON.stringify({ type: 'subscribe', symbols: [symbol] }))
    } else {
      this.connect().catch(() => {})
    }

    return () => {
      this.tickerListeners.get(symbol)?.delete(callback)
      if (!this.tickerListeners.get(symbol)?.size) {
        this.pendingSymbols.delete(symbol)
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'unsubscribe', symbols: [symbol] }))
        }
      }
    }
  }

  subscribeCandle(symbol: string, interval: string, callback: KlineCallback): () => void {
    if (!this.candleListeners.has(symbol)) this.candleListeners.set(symbol, new Map())
    const symbolListeners = this.candleListeners.get(symbol)!
    if (!symbolListeners.has(interval)) symbolListeners.set(interval, new Set())
    symbolListeners.get(interval)!.add(callback)

    const pairKey = `${symbol}|${interval}`
    this.pendingSymbols.add(symbol)

    // Only send subscribe if we haven't already (avoid dual-fetch)
    if (!this.subscribedPairs.has(pairKey)) {
      this.subscribedPairs.add(pairKey)
      if (this.status === 'connected') {
        this.ws?.send(JSON.stringify({ type: 'subscribe', symbols: [symbol], interval, needsInitial: false }))
      } else {
        this.connect().catch(() => {})
      }
    }

    return () => {
      symbolListeners.get(interval)?.delete(callback)
      if (!symbolListeners.get(interval)?.size) {
        symbolListeners.delete(interval)
        this.subscribedPairs.delete(pairKey)
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'unsubscribe', symbols: [symbol], interval }))
        }
      }
    }
  }

  close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.setStatus('disconnected')
    this.pendingSymbols.clear()
  }
}

export const dataClient = new DataClient()
