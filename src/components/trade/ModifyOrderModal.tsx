import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Order } from '../../../shared/types'
import styles from '../../styles/trade.module.css'

interface ModifyOrderModalProps {
  order: Order
  modifyPrice: string
  modifySl: string
  modifyTp: string
  onPriceChange: (v: string) => void
  onSlChange: (v: string) => void
  onTpChange: (v: string) => void
  onSubmit: () => void
  onClose: () => void
  submitting: boolean
}

function ModifyOrderModal({
  order,
  modifyPrice,
  modifySl,
  modifyTp,
  onPriceChange,
  onSlChange,
  onTpChange,
  onSubmit,
  onClose,
  submitting,
}: ModifyOrderModalProps) {
  const { t } = useTranslation('trading')
  const isBuy = order.side === 'buy'
  const typeLabel = isBuy ? t('terms.buy') : t('terms.sell')
  const orderTypeLabel = order.type === 'market' ? t('terms.market') : order.type === 'limit' ? t('terms.limit') : t('terms.stop')
  return (
    <div className={styles['trade-modal-overlay']}>
      <div className={styles['trade-modal']}>
        <div className={styles['trade-modal-header']}>
          <h3>{t('phrases.modifyOrderTitle', { type: typeLabel, symbol: order.symbol })}</h3>
          <button className={styles['trade-modal-close']} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles['trade-modal-content']}>
          <div className={styles['trade-field']}>
            <label className={styles['trade-field-label']}>{t('phrases.priceLabel')} ({orderTypeLabel})</label>
            <input
              className={styles['trade-field-input']}
              value={modifyPrice}
              onChange={(e) => onPriceChange(e.target.value)}
              placeholder="0.00000"
            />
          </div>
          <div className={styles['trade-field']}>
            <label className={styles['trade-field-label']}>{t('phrases.stopLossLabel')}</label>
            <input
              className={styles['trade-field-input']}
              value={modifySl}
              onChange={(e) => onSlChange(e.target.value)}
              placeholder="0.00000"
            />
          </div>
          <div className={styles['trade-field']}>
            <label className={styles['trade-field-label']}>{t('phrases.takeProfitLabel')}</label>
            <input
              className={styles['trade-field-input']}
              value={modifyTp}
              onChange={(e) => onTpChange(e.target.value)}
              placeholder="0.00000"
            />
          </div>
        </div>
        <div className={styles['trade-modal-footer']}>
          <button className={`${styles['trade-submit-btn']} ${isBuy ? 'buy' : 'sell'}`} onClick={onSubmit} disabled={submitting}>
            {submitting ? t('phrases.saving') : t('phrases.saveModifications')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(ModifyOrderModal)