import type { Candle, ConnectionStatus } from '../../shared/types'

type TickerCallback = (price: number, change: number) => void
type CandleCallback = (candle: Candle) => void

const WS_V2_URL = (import.meta.env.VITE_WS_V2_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? `wss://${window.location.hostname}/ws2`
  : 'ws://localhost:3003')).trim()

class WsV2Client {
  private ws: WebSocket | null = null
  private status: ConnectionStatus = 'disconnected'
  private tickerListeners = new Map<string, Set<TickerCallback>>()
  private candleListeners = new Map<string, Map<string, Set<CandleCallback>>>()
  private pendingSymbols = new Set<string>()
  private subscribedPairs = new Set<string>()
  private statusListeners = new Set<(status: ConnectionStatus) => void>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private closed = false
  private readonly MAX_RECONNECT = 10

  get connectionStatus(): ConnectionStatus { return this.status }

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

  connect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.status === 'connected') { resolve(); return }
      if (this.status === 'connecting') { resolve(); return }

      this.setStatus('connecting')
      try {
        this.ws = new WebSocket(WS_V2_URL)
      } catch {
        this.setStatus('disconnected')
        this.scheduleReconnect()
        resolve()
        return
      }

      this.ws.onopen = () => {
        this.setStatus('connected')
        this.reconnectAttempt = 0
        this.resubscribeAll()
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          this.handleMessage(msg)
        } catch { /* ignore */ }
      }

      this.ws.onclose = () => {
        this.setStatus('disconnected')
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.setStatus('disconnected')
      }
    })
  }

  private handleMessage(msg: { type: string; symbol?: string; resolution?: string; price?: number; change?: number; timestamp?: number; open?: number; high?: number; low?: number; close?: number; volume?: number }) {
    if ((msg.type === 'tick' || msg.type === 'ticker') && msg.symbol) {
      const listeners = this.tickerListeners.get(msg.symbol)
      if (listeners) {
        for (const cb of listeners) cb(msg.price ?? 0, msg.change ?? 0)
      }
    } else if (msg.type === 'candle' && msg.symbol && msg.resolution) {
      const symbolListeners = this.candleListeners.get(msg.symbol)
      if (symbolListeners) {
        const intervalListeners = symbolListeners.get(msg.resolution)
        if (intervalListeners) {
          const candle: Candle = {
            time: Math.floor((msg.timestamp || Date.now()) / 1000),
            open: msg.open ?? 0,
            high: msg.high ?? 0,
            low: msg.low ?? 0,
            close: msg.close ?? 0,
            volume: msg.volume ?? 0,
          }
          for (const cb of intervalListeners) cb(candle)
        }
      }
    }
  }

  private resubscribeAll() {
    if (this.pendingSymbols.size === 0 && this.subscribedPairs.size === 0) return
    const symbols = Array.from(this.pendingSymbols)
    const msgs: { type: string; symbols: string[]; interval?: string }[] = []
    if (symbols.length > 0) {
      msgs.push({ type: 'subscribe', symbols })
    }
    for (const pair of this.subscribedPairs) {
      const [symbol, interval] = pair.split('|')
      msgs.push({ type: 'subscribe', symbols: [symbol], interval })
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      for (const msg of msgs) {
        this.ws.send(JSON.stringify(msg))
      }
    }
  }

  subscribeTicker(symbol: string, callback: TickerCallback): () => void {
    if (!this.tickerListeners.has(symbol)) this.tickerListeners.set(symbol, new Set())
    this.tickerListeners.get(symbol)!.add(callback)
    this.pendingSymbols.add(symbol)

    if (this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbols: [symbol] }))
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

  subscribeCandle(symbol: string, interval: string, callback: CandleCallback): () => void {
    if (!this.candleListeners.has(symbol)) this.candleListeners.set(symbol, new Map())
    const symbolListeners = this.candleListeners.get(symbol)!
    if (!symbolListeners.has(interval)) symbolListeners.set(interval, new Set())
    symbolListeners.get(interval)!.add(callback)

    const pairKey = `${symbol}|${interval}`
    this.pendingSymbols.add(symbol)

    if (!this.subscribedPairs.has(pairKey)) {
      this.subscribedPairs.add(pairKey)
      if (this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'subscribe', symbols: [symbol], interval }))
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

  private scheduleReconnect() {
    if (this.closed || this.reconnectTimer) return
    if (this.reconnectAttempt >= this.MAX_RECONNECT) return
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempt))
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectAttempt++
      this.connect().catch(() => {})
    }, delay)
  }

  close() {
    this.closed = true
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    if (this.ws) { this.ws.onclose = null; this.ws.onerror = null; this.ws.close(); this.ws = null }
    this.setStatus('disconnected')
  }
}

export const wsV2Client = new WsV2Client()
