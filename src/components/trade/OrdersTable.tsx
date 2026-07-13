import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Virtuoso } from 'react-virtuoso'
import type { Order } from '../../../shared/types'
import styles from '../../styles/trade.module.css'

interface OrdersTableProps {
  orders: Order[]
  accountId: string
  onCancel: (orderId: string) => Promise<void>
  onModify?: (order: Order) => void
}

function OrdersTable({ orders, onCancel, onModify }: OrdersTableProps) {
  const { t } = useTranslation('trading')
  if (orders.length === 0) {
    return <div className={styles['trade-empty']}>{t('phrases.noOrders')}</div>
  }

  return (
    <div className={styles['trade-positions-table']}>
      <div className={styles['trade-pos-header']}>
        <span>{t('terms.symbol')}</span>
        <span>{t('terms.orderType')}</span>
        <span>{t('terms.side')}</span>
        <span>{t('terms.volume')}</span>
        <span>{t('phrases.targetPrice')}</span>
        <span>{t('phrases.sl')}</span>
        <span>{t('phrases.tp')}</span>
        <span>{t('phrases.time')}</span>
        <span></span>
      </div>
      <Virtuoso
        style={{ height: Math.min(orders.length * 38, 380) }}
        totalCount={orders.length}
        itemContent={(index) => {
          const o = orders[index]
          return (
            <div key={o.id} className={styles['trade-pos-row']}>
              <span data-label="Symbol" className={styles['trade-pos-symbol']}>
                {o.symbol}
              </span>
              <span data-label="Type">{o.type.toUpperCase()}</span>
              <span data-label="Side" className={`${styles['trade-pos-side']} ${styles[o.side as keyof typeof styles]}`}>
                {o.side.toUpperCase()}
              </span>
              <span data-label="Vol">{o.volume}</span>
              <span data-label="Target">{o.price}</span>
              <span data-label="SL">{o.stopLoss || '—'}</span>
              <span data-label="TP">{o.takeProfit || '—'}</span>
              <span data-label="Time">{new Date(o.createdAt).toLocaleString()}</span>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                {onModify && (
                  <button className={`${styles['trade-pos-action-btn']} ${styles['modify']}`} onClick={() => onModify(o)}>
                    {t('phrases.modify')}
                  </button>
                )}
                <button className={`${styles['trade-pos-action-btn']} ${styles['close']}`} onClick={() => onCancel(o.id)}>
                  {t('phrases.cancel')}
                </button>
              </div>
            </div>
          )
        }}
      />
    </div>
  )
}

export default memo(OrdersTable)
