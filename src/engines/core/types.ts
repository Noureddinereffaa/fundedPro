export type EventHandler<T = unknown> = (event: T) => void
export type UnsubscribeFn = () => void
export type PluginId = string
export type EngineId = string
export type SeriesId = string
export type PaneId = string
export type DrawingId = string
export type IndicatorId = string
export type Symbol = string
export type Timeframe = string
export type Timestamp = number

export interface IDisposable {
  dispose(): void
}

export interface IInitializable {
  initialize(): Promise<void>
}

export interface IEngine extends IDisposable, IInitializable {
  readonly id: EngineId
  readonly name: string
  readonly version: string
  isReady(): boolean
}

export interface IConfigurable<TConfig> {
  configure(config: TConfig): void
  getConfig(): TConfig
}

export type MarketType = 
  | 'crypto' 
  | 'stocks' 
  | 'forex' 
  | 'etf' 
  | 'futures' 
  | 'options' 
  | 'indices' 
  | 'bonds' 
  | 'commodities' 
  | 'synthetic'

export type ChartType =
  | 'candlestick'
  | 'ohlc'
  | 'line'
  | 'area'
  | 'baseline'
  | 'histogram'
  | 'mountain'
  | 'stepLine'
  | 'heikinAshi'
  | 'renko'
  | 'rangeBars'
  | 'kagi'
  | 'lineBreak'
  | 'pointAndFigure'
  | 'tickChart'
  | 'volumeBar'
  | 'deltaBar'
  | 'footprint'
  | 'volumeProfile'
  | 'marketProfile'
  | 'orderFlow'
  | 'dom'
  | 'heatmap'

export type Interval = 
  | '1' | '3' | '5' | '15' | '30'
  | '60' | '120' | '180' | '240' | '360' | '480'
  | '1D' | '3D' | '1W' | '1M' | '1Q' | '1Y'

export interface CandleData {
  time: Timestamp
  open: number
  high: number
  low: number
  close: number
  volume: number
  [key: string]: unknown
}

export interface TickData {
  symbol: string
  price: number
  volume: number
  bid: number
  ask: number
  time: Timestamp
}

export interface OHLCData {
  time: Timestamp
  open: number
  high: number
  low: number
  close: number
}

export interface Point {
  x: number
  y: number
}

export interface LogicalPoint {
  time: Timestamp
  price: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface VisibleRange {
  from: Timestamp
  to: Timestamp
}

export interface PriceRange {
  from: number
  to: number
}

export interface ScaleMargins {
  top: number
  bottom: number
}

export type LineStyle = 'solid' | 'dotted' | 'dashed' | 'largeDashed' | 'sparseDotted'

export type HorizontalAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'center' | 'bottom'

export interface TextStyle {
  color: string
  fontSize: number
  fontFamily: string
  fontStyle?: 'normal' | 'italic' | 'bold'
  align?: HorizontalAlign
  valign?: VerticalAlign
  wordWrap?: 'normal' | 'breakAll'
  lineHeight?: number
}

export interface MouseEvent {
  x: number
  y: number
  time?: Timestamp
  price?: number
  point?: Point
  originalEvent: globalThis.Event
}

export interface KeyEvent {
  key: string
  code: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}
