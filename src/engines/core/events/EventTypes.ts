export const ChartEvents = {
  CHART_CREATED: 'chart:created',
  CHART_DESTROYED: 'chart:destroyed',
  CHART_RESIZED: 'chart:resized',
  CHART_THEME_CHANGED: 'chart:theme-changed',
  CHART_OPTIONS_CHANGED: 'chart:options-changed',
} as const

export const SeriesEvents = {
  SERIES_CREATED: 'series:created',
  SERIES_DESTROYED: 'series:destroyed',
  SERIES_DATA_CHANGED: 'series:data-changed',
  SERIES_DATA_UPDATED: 'series:data-updated',
  SERIES_OPTIONS_CHANGED: 'series:options-changed',
} as const

export const TimeScaleEvents = {
  TIMESCALE_RANGE_CHANGED: 'timescale:range-changed',
  TIMESCALE_SCROLLED: 'timescale:scrolled',
  TIMESCALE_ZOOMED: 'timescale:zoomed',
} as const

export const PriceScaleEvents = {
  PRICESCALE_RANGE_CHANGED: 'pricescale:range-changed',
  PRICESCALE_OPTIONS_CHANGED: 'pricescale:options-changed',
} as const

export const CrosshairEvents = {
  CROSSHAIR_MOVED: 'crosshair:moved',
  CROSSHAIR_HIDDEN: 'crosshair:hidden',
} as const

export const DrawingEvents = {
  DRAWING_CREATED: 'drawing:created',
  DRAWING_DESTROYED: 'drawing:destroyed',
  DRAWING_MODIFIED: 'drawing:modified',
  DRAWING_SELECTED: 'drawing:selected',
  DRAWING_DESELECTED: 'drawing:deselected',
  DRAWING_MODE_CHANGED: 'drawing:mode-changed',
} as const

export const IndicatorEvents = {
  INDICATOR_ADDED: 'indicator:added',
  INDICATOR_REMOVED: 'indicator:removed',
  INDICATOR_UPDATED: 'indicator:updated',
  INDICATOR_ERROR: 'indicator:error',
} as const

export const MarketDataEvents = {
  CANDLE_RECEIVED: 'marketdata:candle-received',
  TICK_RECEIVED: 'marketdata:tick-received',
  SYMBOL_CHANGED: 'marketdata:symbol-changed',
  INTERVAL_CHANGED: 'marketdata:interval-changed',
  DATA_LOADED: 'marketdata:data-loaded',
  DATA_REQUEST_FAILED: 'marketdata:request-failed',
} as const

export const InteractionEvents = {
  CLICK: 'interaction:click',
  DOUBLE_CLICK: 'interaction:double-click',
  MOUSE_MOVE: 'interaction:mouse-move',
  MOUSE_DOWN: 'interaction:mouse-down',
  MOUSE_UP: 'interaction:mouse-up',
  MOUSE_LEAVE: 'interaction:mouse-leave',
  SCROLL: 'interaction:scroll',
  CONTEXT_MENU: 'interaction:context-menu',
} as const

export const AnimationEvents = {
  ANIMATION_START: 'animation:start',
  ANIMATION_FRAME: 'animation:frame',
  ANIMATION_END: 'animation:end',
} as const

export const PluginEvents = {
  PLUGIN_REGISTERED: 'plugin:registered',
  PLUGIN_UNREGISTERED: 'plugin:unregistered',
  PLUGIN_LOADED: 'plugin:loaded',
  PLUGIN_ERROR: 'plugin:error',
} as const

export const WorkspaceEvents = {
  WORKSPACE_SAVED: 'workspace:saved',
  WORKSPACE_LOADED: 'workspace:loaded',
  WORKSPACE_CHANGED: 'workspace:changed',
} as const

export const OrderEvents = {
  ORDER_SUBMITTED: 'order:submitted',
  ORDER_FILLED: 'order:filled',
  ORDER_CANCELLED: 'order:cancelled',
  ORDER_MODIFIED: 'order:modified',
  ORDER_REJECTED: 'order:rejected',
} as const

export const RiskEvents = {
  RISK_LIMIT_HIT: 'risk:limit-hit',
  RISK_WARNING: 'risk:warning',
  RISK_VIOLATION: 'risk:violation',
} as const

export const AlertEvents = {
  ALERT_CREATED: 'alert:created',
  ALERT_TRIGGERED: 'alert:triggered',
  ALERT_DELETED: 'alert:deleted',
} as const

export const StrategyEvents = {
  STRATEGY_STARTED: 'strategy:started',
  STRATEGY_STOPPED: 'strategy:stopped',
  STRATEGY_ERROR: 'strategy:error',
  STRATEGY_SIGNAL: 'strategy:signal',
} as const
