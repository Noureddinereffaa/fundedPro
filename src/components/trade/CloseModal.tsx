import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Position } from '../../../shared/types'
import styles from '../../styles/trade.module.css'

interface CloseModalProps {
  position: Position
  closeVolume: string
  onVolumeChange: (v: string) => void
  onVolumeDecrement: () => void
  onVolumeIncrement: () => void
  onSubmit: () => void
  onClose: () => void
  submitting: boolean
}

function CloseModal({
  position,
  closeVolume,
  onVolumeChange,
  onVolumeDecrement,
  onVolumeIncrement,
  onSubmit,
  onClose,
  submitting,
}: CloseModalProps) {
  const { t } = useTranslation('trading')
  return (
    <div className={styles['trade-modal-overlay']}>
      <div className={styles['trade-modal']}>
        <div className={styles['trade-modal-header']}>
          <h3>{t('phrases.closeTitle', { symbol: position.symbol })}</h3>
          <button className={styles['trade-modal-close']} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles['trade-modal-content']}>
          <div className={styles['trade-field']}>
            <label className={styles['trade-field-label']}>{t('phrases.volumeToClose', { max: position.volume })}</label>
            <div className={styles['trade-volume-row']}>
              <button className={styles['trade-vol-btn']} onClick={onVolumeDecrement}>
                −
              </button>
              <input
                className={styles['trade-field-input']}
                value={closeVolume}
                onChange={(e) => onVolumeChange(e.target.value)}
              />
              <button className={styles['trade-vol-btn']} onClick={onVolumeIncrement}>
                +
              </button>
            </div>
          </div>
        </div>
        <div className={styles['trade-modal-footer']}>
          <button className={`${styles['trade-submit-btn']} sell`} onClick={onSubmit} disabled={submitting}>
            {submitting ? t('phrases.closing') : t('phrases.closeLots', { volume: closeVolume })}
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(CloseModal)