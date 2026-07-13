import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Position } from '../../../shared/types'
import styles from '../../styles/trade.module.css'

interface ModifyModalProps {
  position: Position
  modifySl: string
  modifyTp: string
  onSlChange: (v: string) => void
  onTpChange: (v: string) => void
  onSubmit: () => void
  onClose: () => void
  submitting: boolean
}

function ModifyModal({
  position,
  modifySl,
  modifyTp,
  onSlChange,
  onTpChange,
  onSubmit,
  onClose,
  submitting,
}: ModifyModalProps) {
  const { t } = useTranslation('trading')
  return (
    <div className={styles['trade-modal-overlay']}>
      <div className={styles['trade-modal']}>
        <div className={styles['trade-modal-header']}>
          <h3>{t('phrases.modifyTitle', { symbol: position.symbol })}</h3>
          <button className={styles['trade-modal-close']} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles['trade-modal-content']}>
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
          <button className={`${styles['trade-submit-btn']} buy`} onClick={onSubmit} disabled={submitting}>
            {submitting ? t('phrases.saving') : t('phrases.saveModifications')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(ModifyModal)