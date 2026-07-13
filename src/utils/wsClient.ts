import type { Kline, MarketStatus, ConnectionStatus } from '../../shared/types'

interface WsTick { type: 'tick'; symbol: string; price: number; change: number; marketStatus?: MarketStatus }
interface WsInitial { type: 'initial'; symbol: string; interval?: string; klines: Kline[]; price: number; change: number; marketStatus?: MarketStatus }
interface WsCandle { type: 'candle' | 'candle_update'; symbol: string; interval: string; kline: Kline }
interface WsPing { type: 'ping' }
interface WsPong { type: 'pong' }
interface WsError { type: 'error'; message: string }
type WsMessage = WsTick | WsInitial | WsCandle | WsPing | WsPong | WsError

interface WorkerStatus { type: '_status'; status: ConnectionStatus }
interface WorkerReconnected { type: '_reconnected' }
type WorkerMessage = WsMessage | WorkerStatus | WorkerReconnected

type TickerCallback = (price: number, change: number) => void
type KlineCallback = (kline: Kline) => void

interface PendingRequest {
  resolve: (data: { klines: Kline[]; price: number; change: number }) => void
  reject: () => void
  timer: ReturnType<typeof setTimeout>
}

interface LateInitialData {
  klines: Kline[]; price: number; change: number; time: number
}

const WS_URL = (import.meta.env.VITE_WS_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? `wss://${window.location.hostname}/ws` : 'ws://localhost:3002')).trim()

function supportsSharedWorker(): boolean {
  return typeof SharedWorker !== 'undefined'
}

function connectWorker(url: string): SharedWorker | null {
  if (!supportsSharedWorker()) return null
  try {
    return new SharedWorker(url, { name: 'pro-fundx-ws' })
  } catch {
    return null
  }
}

class DataClient {
  private status: ConnectionStatus = 'disconnected'
  private worker: SharedWorker | null = null
  private ws: WebSocket | null = null
  private usingWorker = false
  private connectQueue: Array<() => void> = []
  private connectTimeout: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private readonly url: string
  private readonly CONNECT_TIMEOUT_MS = 15000
  private pendingRequests = new Map<string, PendingRequest>()
  private tickerListeners = new Map<string, Set<TickerCallback>>()
  private candleListeners = new Map<string, Map<string, Set<KlineCallback>>>()
  private pendingSymbols = new Set<string>()
  private statusListeners = new Set<(status: ConnectionStatus) => void>()
  private subscribedPairs = new Set<string>()
  private marketStatuses = new Map<string, MarketStatus>()
  private marketStatusListeners = new Map<string, Set<(status: MarketStatus) => void>>()
  private lateInitialCache = new Map<string, LateInitialData>()
  private closed = false

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private lastPongTime = 0
  private readonly HEARTBEAT_INTERVAL = 30000
  private readonly HEARTBEAT_TIMEOUT = 15000
  private readonly MAX_RECONNECT_ATTEMPTS = 20

  constructor(url = WS_URL) {
    this.url = url
    this.worker = connectWorker('/ws-worker.js')
    if (this.worker) {
      this.usingWorker = true
      this.worker.port.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const msg = event.data
        if (msg.type === '_status') {
          this.status = msg.status
          this.statusListeners.forEach((cb) => cb(this.status))
          if (msg.status === 'connected') {
            this.reconnectAttempt = 0
            this.flushConnectQueue()
          }
          return
        }
        if (msg.type === '_reconnected') {
          this.resubscribeAll()
          return
        }
        this.handleMessage(msg)
      }
      this.worker.port.start()
    }
  }

  private postToWorker(msg: Record<string, unknown>): void {
    this.worker?.port.postMessage(msg)
  }

  private sendToWorker(payload: Record<string, unknown>): void {
    this.postToWorker({ type: 'send', payload })
  }

  getMarketStatus(symbol: string): MarketStatus | undefined {
    return this.marketStatuses.get(symbol)
  }

  onMarketStatus(symbol: string, cb: (status: MarketStatus) => void): () => void {
    if (!this.marketStatusListeners.has(symbol)) this.marketStatusListeners.set(symbol, new Set())
    this.marketStatusListeners.get(symbol)!.add(cb)
    const current = this.marketStatuses.get(symbol)
    if (current) cb(current)
    return () => this.marketStatusListeners.get(symbol)?.delete(cb)
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
    this.statusListeners.forEach((cb) => cb(s))
  }

  private flushConnectQueue() {
    const q = this.connectQueue
    this.connectQueue = []
    q.forEach((fn) => fn())
  }

  connect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.status === 'connected') { resolve(); return }
      if (this.status === 'connecting') { this.connectQueue.push(resolve); return }

      if (this.usingWorker) {
        this.postToWorker({ type: 'connect' })
        this.setStatus('connecting')
        this.connectTimeout = setTimeout(() => {
          this.connectTimeout = null
          this.setStatus('disconnected')
          resolve()
          this.flushConnectQueue()
        }, this.CONNECT_TIMEOUT_MS)

        const checkConnected = () => {
          if (this.status === 'connected') {
            if (this.connectTimeout) { clearTimeout(this.connectTimeout); this.connectTimeout = null }
            resolve()
            this.flushConnectQueue()
            return
          }
          if (this.status === 'disconnected') {
            if (this.connectTimeout) { clearTimeout(this.connectTimeout); this.connectTimeout = null }
            resolve()
            this.flushConnectQueue()
            return
          }
          setTimeout(checkConnected, 100)
        }
        setTimeout(checkConnected, 200)
      } else {
        this.fallbackConnect(resolve)
      }
    })
  }

  private fallbackConnect(onOpen?: () => void) {
    if (this.closed) return
    this.setStatus('connecting')

    this.connectTimeout = setTimeout(() => {
      this.connectTimeout = null
      if (this.ws) { this.ws.close(); this.ws = null }
      this.setStatus('disconnected')
      onOpen?.()
      this.flushConnectQueue()
    }, this.CONNECT_TIMEOUT_MS)

    this.fallbackConnectInternal(() => {
      if (this.connectTimeout) { clearTimeout(this.connectTimeout); this.connectTimeout = null }
      this.setStatus('connected')
      this.reconnectAttempt = 0
      this.startHeartbeat()
      this.resubscribeAll()
      onOpen?.()
      this.flushConnectQueue()
    })
  }

  private fallbackConnectInternal(onOpen?: () => void) {
    if (this.closed) return
    try { this.ws = new WebSocket(this.url) } catch (e) {
      console.error('[DataClient] WS constructor failed:', e)
      this.setStatus('disconnected')
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.setStatus('connected')
      this.reconnectAttempt = 0
      this.lastPongTime = Date.now()
      this.resubscribeAll()
      onOpen?.()
    }

    this.ws.onmessage = (event) => {
      try { this.handleMessage(JSON.parse(event.data)) } catch {}
    }

    this.ws.onclose = () => {
      this.setStatus('disconnected')
      this.stopHeartbeat()
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {}
  }

  private scheduleReconnect() {
    if (this.closed || this.reconnectTimer) return
    if (this.reconnectAttempt >= this.MAX_RECONNECT_ATTEMPTS) return
    const baseDelay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempt))
    const jitter = baseDelay * (0.7 + Math.random() * 0.6)
    this.reconnectAttempt++
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.setStatus('connecting')
      this.fallbackConnectInternal()
    }, Math.round(jitter))
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.lastPongTime = Date.now()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        if (Date.now() - this.lastPongTime > this.HEARTBEAT_TIMEOUT) {
          this.ws.close()
          return
        }
        try { this.ws.send(JSON.stringify({ type: 'ping' })) } catch {}
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null }
  }

  private resubscribeAll() {
    for (const pair of this.subscribedPairs) {
      const [symbol, interval] = pair.split('|')
      if (interval) {
        const msgPayload = { type: 'subscribe', symbols: [symbol], interval, needsInitial: false }
        if (this.usingWorker) {
          this.sendToWorker(msgPayload)
        } else {
          this.ws?.send(JSON.stringify(msgPayload))
        }
      }
    }
    for (const symbol of this.pendingSymbols) {
      if (!Array.from(this.subscribedPairs).some((p) => p.startsWith(symbol + '|'))) {
        const msgPayload = { type: 'subscribe', symbols: [symbol] }
        if (this.usingWorker) {
          this.sendToWorker(msgPayload)
        } else {
          this.ws?.send(JSON.stringify(msgPayload))
        }
      }
    }
  }

  private handleMessage(msg: WsMessage) {
    if (msg.type === 'ping') {
      if (this.usingWorker) {
        this.sendToWorker({ type: 'pong' })
      } else if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'pong' }))
      }
      return
    }

    if (msg.type === 'pong') {
      this.lastPongTime = Date.now()
      return
    }

    switch (msg.type) {
      case 'initial': {
        const key = `${msg.symbol}_${msg.interval || '60'}_initial`
        const pending = this.pendingRequests.get(key)
        if (pending) {
          clearTimeout(pending.timer)
          pending.resolve({ klines: msg.klines || [], price: msg.price, change: msg.change })
          this.pendingRequests.delete(key)
        } else {
          this.lateInitialCache.set(key, { klines: msg.klines || [], price: msg.price, change: msg.change, time: Date.now() })
        }
        const tickerListeners = this.tickerListeners.get(msg.symbol)
        if (tickerListeners) { for (const cb of tickerListeners) cb(msg.price, msg.change) }
        if ('marketStatus' in msg) this.handleMarketStatus(msg)
        break
      }

      case 'tick': {
        const listeners = this.tickerListeners.get(msg.symbol)
        if (listeners) { for (const cb of listeners) cb(msg.price, msg.change) }
        if ('marketStatus' in msg) this.handleMarketStatus(msg)
        break
      }

      case 'candle':
      case 'candle_update': {
        const symbolListeners = this.candleListeners.get(msg.symbol)
        if (symbolListeners) {
          const intervalListeners = symbolListeners.get(msg.interval)
          if (intervalListeners) { for (const cb of intervalListeners) cb(msg.kline) }
        }
        break
      }

      case 'error':
        console.warn(`[DataClient] Server error:`, msg.message)
        break
    }
  }

  private handleMarketStatus(msg: WsMessage) {
    if (msg.type === 'ping' || msg.type === 'pong' || msg.type === 'error' || msg.type === 'candle' || msg.type === 'candle_update') return
    const ms = msg as WsTick | WsInitial
    if (!ms.marketStatus || !ms.symbol) return
    this.marketStatuses.set(ms.symbol, ms.marketStatus)
    const listeners = this.marketStatusListeners.get(ms.symbol)
    if (listeners) { for (const cb of listeners) cb(ms.marketStatus) }
  }

  async fetchKlines(symbol: string, interval: string): Promise<{ klines: Kline[]; price: number; change: number } | null> {
    const lateKey = `${symbol}_${interval}_initial`
    const lateData = this.lateInitialCache.get(lateKey)
    if (lateData && Date.now() - lateData.time < 30000) {
      this.lateInitialCache.delete(lateKey)
      return lateData
    }
    this.lateInitialCache.delete(lateKey)

    if (this.status !== 'connected') {
      const connectPromise = this.connect().catch(() => {})
      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 5000))
      await Promise.race([connectPromise, timeoutPromise])
    }

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

        const msgPayload = { type: 'subscribe', symbols: [symbol], interval, needsInitial: true }
        if (this.usingWorker) {
          this.sendToWorker(msgPayload)
        } else if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(msgPayload))
        } else {
          resolve({ klines: [], price: 0, change: 0 })
        }
      }).catch(() => null)
    }

    return null
  }

  subscribeTicker(symbol: string, callback: TickerCallback): () => void {
    if (!this.tickerListeners.has(symbol)) this.tickerListeners.set(symbol, new Set())
    this.tickerListeners.get(symbol)!.add(callback)
    this.pendingSymbols.add(symbol)

    if (this.status === 'connected') {
      const msgPayload = { type: 'subscribe', symbols: [symbol] }
      if (this.usingWorker) {
        this.sendToWorker(msgPayload)
      } else {
        this.ws?.send(JSON.stringify(msgPayload))
      }
    } else {
      this.connect().catch(() => {})
    }

    return () => {
      this.tickerListeners.get(symbol)?.delete(callback)
      if (!this.tickerListeners.get(symbol)?.size) {
        this.pendingSymbols.delete(symbol)
        const msgPayload = { type: 'unsubscribe', symbols: [symbol] }
        if (this.usingWorker) {
          this.sendToWorker(msgPayload)
        } else if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(msgPayload))
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

    if (!this.subscribedPairs.has(pairKey)) {
      this.subscribedPairs.add(pairKey)
      if (this.status === 'connected') {
        const msgPayload = { type: 'subscribe', symbols: [symbol], interval, needsInitial: false }
        if (this.usingWorker) {
          this.sendToWorker(msgPayload)
        } else {
          this.ws?.send(JSON.stringify(msgPayload))
        }
      } else {
        this.connect().catch(() => {})
      }
    }

    return () => {
      symbolListeners.get(interval)?.delete(callback)
      if (!symbolListeners.get(interval)?.size) {
        symbolListeners.delete(interval)
        this.subscribedPairs.delete(pairKey)
        const msgPayload = { type: 'unsubscribe', symbols: [symbol], interval }
        if (this.usingWorker) {
          this.sendToWorker(msgPayload)
        } else if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(msgPayload))
        }
      }
    }
  }

  close() {
    this.closed = true
    this.stopHeartbeat()
    if (this.connectTimeout) { clearTimeout(this.connectTimeout); this.connectTimeout = null }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.usingWorker) {
      this.postToWorker({ type: 'disconnect' })
    } else if (this.ws) {
      this.ws.onclose = null; this.ws.onerror = null; this.ws.close(); this.ws = null
    }
    this.setStatus('disconnected')
    for (const pending of this.pendingRequests.values()) { clearTimeout(pending.timer); pending.reject() }
    this.pendingRequests.clear(); this.pendingSymbols.clear(); this.lateInitialCache.clear()
    this.subscribedPairs.clear(); this.tickerListeners.clear(); this.candleListeners.clear()
    this.marketStatusListeners.clear(); this.statusListeners.clear()
  }
}

export const dataClient = new DataClient()
