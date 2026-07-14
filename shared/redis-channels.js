// Redis channel name constants shared between API (TypeScript) and WS server (JS)
// All market data real-time channels use the `market:` prefix.

export const CHANNELS = {
  TICKER: (symbol) => `market:ticker:${symbol}`,
  CANDLE: (symbol, resolution) => `market:candle:${symbol}:${resolution}`,
  ORDERBOOK: (symbol) => `market:orderbook:${symbol}`,

  // Control channel for WS server commands
  CONTROL: 'market:control',

  // Subscription request (WS → API)
  SUBSCRIBE: 'market:subscribe',
  UNSUBSCRIBE: 'market:unsubscribe',

  // Active symbols tracking (Redis Set key)
  ACTIVE_SYMBOLS: 'market:active:symbols',
  ACTIVE_SUBSCRIBERS: 'market:active:subscribers',
}

export const MESSAGE_TYPES = {
  TICKER: 'ticker',
  CANDLE: 'candle',
  ORDERBOOK: 'orderbook',
  INITIAL: 'initial',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',
}

export const KEY_PREFIXES = {
  STATE: 'market:state:',
  CACHE: 'market:cache:',
  INSTANCE: 'market:instance:',
}
