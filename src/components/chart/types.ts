import type { Candle, Position, Order, ConnectionStatus } from '../../../shared/types'

export interface ProfessionalChartProps {
  symbol: string
  interval: string
  theme?: 'dark' | 'light'
  onPriceSelect?: (price: number) => void
  positions?: Position[]
  orders?: Order[]
  locale?: 'ar' | 'en'
  indicators?: string[]
  connectionStatus?: ConnectionStatus
  showVolume?: boolean
  showDrawingTools?: boolean
  onModifyPosition?: (positionId: string, data: { stopLoss?: number; takeProfit?: number }) => void
  onModifyOrder?: (orderId: string, data: { price?: number; stopLoss?: number; takeProfit?: number }) => void
}

export type DrawingMode = 'none' | 'hline' | 'trend'
export type AdjustingTarget = { positionId: string; type: 'sl' | 'tp' }
export type PulseState = { direction: 'up' | 'down' | 'flat'; intensity: number }

export interface PaneLayoutConfig {
  main: { top: number; height: number }
  volume: { top: number; height: number }
  rsi: { top: number; height: number }
  macd: { top: number; height: number }
}

export const PROXIMITY_PX = 8