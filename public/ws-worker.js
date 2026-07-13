// WebSocket Shared Worker — survives page navigation
// Keeps a single WebSocket connection alive across route changes

const defaultWsPath = '/ws'
let WS_URL = 'ws://localhost:3002'
const CONNECT_TIMEOUT = 15000
const HEARTBEAT_INTERVAL = 30000
const HEARTBEAT_TIMEOUT = 15000
const MAX_RECONNECT_ATTEMPTS = 20

try {
  const base = new URL(defaultWsPath, self.location).href
  WS_URL = base.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
} catch (e) {
  console.warn('[WS-Worker] Could not resolve WS URL from worker location', e)
}

let ws = null
let status = 'disconnected'
let connectTimeout = null
let reconnectTimer = null
let reconnectAttempt = 0
let heartbeatTimer = null
let lastPongTime = 0
let intentionalClose = false

const ports = new Set()

function broadcast(msg) {
  for (const port of ports) {
    try { port.postMessage(msg) } catch {}
  }
}

function setStatus(s) {
  if (status === s) return
  status = s
  broadcast({ type: '_status', status: s })
}

function connect() {
  if (status === 'connecting' || status === 'connected') return
  setStatus('connecting')
  intentionalClose = false

  connectTimeout = setTimeout(() => {
    connectTimeout = null
    if (ws) { ws.close(); ws = null }
    setStatus('disconnected')
  }, CONNECT_TIMEOUT)

  try {
    ws = new WebSocket(WS_URL)
  } catch (e) {
    clearTimeout(connectTimeout)
    connectTimeout = null
    setStatus('disconnected')
    scheduleReconnect()
    return
  }

  ws.onopen = () => {
    clearTimeout(connectTimeout)
    connectTimeout = null
    setStatus('connected')
    reconnectAttempt = 0
    lastPongTime = Date.now()
    startHeartbeat()
    broadcast({ type: '_reconnected' })
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      if (msg.type === 'ping') {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong' }))
        }
        return
      }
      if (msg.type === 'pong') {
        lastPongTime = Date.now()
        return
      }
      broadcast(msg)
    } catch {}
  }

  ws.onclose = () => {
    clearTimeout(connectTimeout)
    connectTimeout = null
    setStatus('disconnected')
    stopHeartbeat()
    if (!intentionalClose) scheduleReconnect()
  }

  ws.onerror = () => {}
}

function scheduleReconnect() {
  if (reconnectTimer) return
  if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[WS-Worker] Max reconnect attempts reached')
    return
  }
  const baseDelay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt))
  const jitter = baseDelay * (0.7 + Math.random() * 0.6)
  reconnectAttempt++
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, Math.round(jitter))
}

function startHeartbeat() {
  stopHeartbeat()
  lastPongTime = Date.now()
  heartbeatTimer = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      if (Date.now() - lastPongTime > HEARTBEAT_TIMEOUT) {
        ws.close()
        return
      }
      try { ws.send(JSON.stringify({ type: 'ping' })) } catch {}
    }
  }, HEARTBEAT_INTERVAL)
}

function stopHeartbeat() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
}

function disconnect() {
  intentionalClose = true
  stopHeartbeat()
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null }
  if (ws) { ws.onclose = null; ws.onerror = null; ws.close(); ws = null }
  setStatus('disconnected')
}

// ── Message handling from pages ──────────────────────────────

self.onconnect = (event) => {
  const port = event.ports[0]
  ports.add(port)
  port.postMessage({ type: '_status', status })

  port.onmessage = (e) => {
    const msg = e.data
    switch (msg.type) {
      case 'connect':
        connect()
        break
      case 'send':
        if (ws?.readyState === WebSocket.OPEN) {
          try { ws.send(JSON.stringify(msg.payload)) } catch {}
        }
        break
      case 'disconnect':
        disconnect()
        break
      case 'getStatus':
        port.postMessage({ type: '_status', status })
        break
    }
  }

  port.onclose = () => {
    ports.delete(port)
  }
}
