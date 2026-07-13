import { memo } from 'react'
import { useLivePrice } from '../../utils/useRealtime'
import { formatPrice } from '../../utils/trading'
import { useTranslation } from 'react-i18next'
import styles from '../../styles/trade.module.css'

interface Props {
  symbol: string
  type?: 'price' | 'change' | 'both'
  className?: string
}

function LivePrice({ symbol, type = 'both', className = '' }: Props) {
  const { t } = useTranslation('trading')
  const livePrice = useLivePrice(symbol)

  if (!livePrice) return <span className={className}>{t('phrases.noData')}</span>

  const isPositive = livePrice.change >= 0
  const colorClass = isPositive ? 'up text-up' : 'down text-down'

  if (type === 'price') {
    return <span className={className}>{formatPrice(livePrice.price, symbol)}</span>
  }

  if (type === 'change') {
    return (
      <span className={`${className} ${colorClass}`}>
        {isPositive ? '+' : ''}
        {livePrice.change.toFixed(2)}%
      </span>
    )
  }

  return (
    <div className={`${styles['trade-topbar-price']} ${className}`}>
      <span className={styles['trade-topbar-price-val']}>{formatPrice(livePrice.price, symbol)}</span>
      <span className={`${styles['trade-topbar-change']} ${colorClass}`}>
        {isPositive ? '+' : ''}
        {livePrice.change.toFixed(2)}%
      </span>
    </div>
  )
}

export default memo(LivePrice)