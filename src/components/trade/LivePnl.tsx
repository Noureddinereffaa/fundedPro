import { memo } from 'react'
import type { Position } from '../../../shared/types'
import { useLivePrice } from '../../utils/useRealtime'
import { calcPnl, getQuoteToUsdRate } from '../../utils/trading'

interface Props {
  position: Position
  className?: string
}

function LivePnl({ position, className = '' }: Props) {
  const livePrice = useLivePrice(position.symbol)
  const quotePrice = useLivePrice(
    position.symbol.endsWith('USD') || position.symbol.endsWith('USDT')
      ? ''
      : position.symbol.startsWith('USD')
        ? `USD${position.symbol.slice(3)}`
        : `${position.symbol.slice(3)}USD`,
  )
  const lp = livePrice?.price || position.currentPrice || position.openPrice
  const rate = getQuoteToUsdRate(position.symbol, (sym) => {
    if (sym === position.symbol) return livePrice?.price
    return quotePrice?.price
  })
  const pnl = calcPnl(position.side, Number(position.openPrice), lp, Number(position.volume), position.symbol, rate)
  const isPositive = pnl >= 0

  return (
    <span className={`${className} ${isPositive ? 'up text-up' : 'down text-down'}`}>
      {isPositive ? '+' : ''}${pnl.toFixed(2)}
    </span>
  )
}

export default memo(LivePnl)
