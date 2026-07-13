import { memo, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLivePrice } from '../../utils/useRealtime'
import styles from '../../styles/trade.module.css'
import { getContractSize, formatPrice, getPipSize } from '../../utils/trading'

interface OrderPanelProps {
  symbol: string
  side: 'buy' | 'sell'
  orderType: 'market' | 'limit' | 'stop'
  volume: string
  price: string
  sl: string
  tp: string
  orderError: string
  submitting: boolean
  isStale: boolean
  onSideChange: (s: 'buy' | 'sell') => void
  onOrderTypeChange: (t: 'market' | 'limit' | 'stop') => void
  onVolumeChange: (v: string) => void
  onPriceChange: (v: string) => void
  onSlChange: (v: string) => void
  onTpChange: (v: string) => void
  onCopyPrice: (p: string) => void
  onCopySl: (p: string) => void
  onCopyTp: (p: string) => void
  onSubmit: (p: number | undefined) => void
}

function OrderPanel({
  symbol,
  side,
  orderType,
  volume,
  price,
  sl,
  tp,
  orderError,
  submitting,
  isStale,
  onSideChange,
  onOrderTypeChange,
  onVolumeChange,
  onPriceChange,
  onSlChange,
  onTpChange,
  onCopyPrice,
  onCopySl,
  onCopyTp,
  onSubmit,
}: OrderPanelProps) {
  const { t } = useTranslation('trading')
  const livePriceObj = useLivePrice(symbol)
  const displayPrice = livePriceObj?.price
  const displayChange = livePriceObj?.change || 0
  const isPositive = displayChange >= 0
  const [confirming, setConfirming] = useState(false)

  const pipSize = getPipSize(symbol)
  const contractSize = getContractSize(symbol)

  const riskAmount = useMemo(() => {
    if (!sl || !displayPrice || Number(sl) <= 0) return 0
    const diff = Math.abs(displayPrice - Number(sl))
    let risk = diff * Number(volume) * contractSize
    if (symbol.startsWith('USD') && symbol.length === 6 && displayPrice > 0) {
      risk /= displayPrice
    }
    return risk
  }, [sl, displayPrice, volume, symbol, contractSize])

  const rewardAmount = useMemo(() => {
    if (!tp || !displayPrice || Number(tp) <= 0) return 0
    const diff = Math.abs(Number(tp) - displayPrice)
    let reward = diff * Number(volume) * contractSize
    if (symbol.startsWith('USD') && symbol.length === 6 && displayPrice > 0) {
      reward /= displayPrice
    }
    return reward
  }, [tp, displayPrice, volume, symbol, contractSize])

  const slPips = useMemo(() => {
    if (!sl || !displayPrice || Number(sl) <= 0) return 0
    return Math.abs(displayPrice - Number(sl)) / pipSize
  }, [sl, displayPrice, pipSize])

  const tpPips = useMemo(() => {
    if (!tp || !displayPrice || Number(tp) <= 0) return 0
    return Math.abs(Number(tp) - displayPrice) / pipSize
  }, [tp, displayPrice, pipSize])

  const handleFirstClick = useCallback(() => {
    setConfirming(true)
  }, [])

  const handleConfirm = useCallback(() => {
    setConfirming(false)
    onSubmit(displayPrice)
  }, [onSubmit, displayPrice])

  const handleCancel = useCallback(() => {
    setConfirming(false)
  }, [])

  return (
    <div className={styles['trade-order-panel']}>
      <div className={styles['trade-order-header']}>
        <div>
          <div className={styles['trade-order-symbol']}>{symbol}</div>
          <div className={`${styles['trade-order-badge']} ${isPositive ? styles.up : styles.down}`}>
            {isPositive ? '▲' : '▼'} {t('phrases.live')}
          </div>
        </div>
        {isStale ? (
          <div className={styles['trade-order-price-block']}>
            <div className={styles['trade-order-live-price']} style={{ color: '#ffb74d' }}>
              {displayPrice ? formatPrice(displayPrice, symbol) : '—'}
            </div>
            <div className={styles['trade-order-change']} style={{ color: '#ffb74d', fontSize: 10 }}>
              ⚠ {t('phrases.stale')}
            </div>
          </div>
        ) : displayPrice != null ? (
          <div className={styles['trade-order-price-block']}>
            <div className={styles['trade-order-live-price']}>{formatPrice(displayPrice, symbol)}</div>
            <div className={`${styles['trade-order-change']} ${isPositive ? styles.up : styles.down}`}>
              {isPositive ? '+' : ''}
              {displayChange.toFixed(2)}%
            </div>
          </div>
        ) : (
          <div className={styles['trade-order-price-block']}>
            <div className={styles['trade-order-live-price']} style={{ color: '#787b86' }}>
              {t('phrases.offline')}
            </div>
          </div>
        )}
      </div>

      <div className={styles['trade-side-btns']}>
        <button
          className={`${styles['trade-side-btn']} ${styles.buy} ${side === 'buy' ? styles.active : ''}`}
          onClick={() => { onSideChange('buy'); setConfirming(false) }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          {t('terms.buy').toUpperCase()}
        </button>
        <button
          className={`${styles['trade-side-btn']} ${styles.sell} ${side === 'sell' ? styles.active : ''}`}
          onClick={() => { onSideChange('sell'); setConfirming(false) }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {t('terms.sell').toUpperCase()}
        </button>
      </div>

      <div className={styles['trade-order-type-btns']}>
        {(['market', 'limit', 'stop'] as const).map((ot) => (
          <button
            key={ot}
            className={`${styles['trade-order-type-btn']} ${orderType === ot ? styles.active : ''}`}
            onClick={() => { onOrderTypeChange(ot); setConfirming(false) }}
          >
            {t(`terms.${ot}`)}
          </button>
        ))}
      </div>

      <div className={styles['trade-field']}>
        <label className={styles['trade-field-label']}>{t('phrases.volumeLots')}</label>
        <div className={styles['trade-volume-row']}>
          <button
            className={styles['trade-vol-btn']}
            onClick={() => { onVolumeChange(Math.max(0.01, Number(volume) - 0.01).toFixed(2)); setConfirming(false) }}
          >
            −
          </button>
          <input
            className={styles['trade-field-input']}
            value={volume}
            onChange={(e) => { onVolumeChange(e.target.value); setConfirming(false) }}
          />
          <button
            className={styles['trade-vol-btn']}
            onClick={() => { onVolumeChange((Number(volume) + 0.01).toFixed(2)); setConfirming(false) }}
          >
            +
          </button>
        </div>
        <div className={styles['trade-vol-presets']}>
          {['0.01', '0.05', '0.10', '0.50', '1.00'].map((v) => (
            <button
              key={v}
              className={`${styles['trade-vol-preset']} ${volume === v ? styles.active : ''}`}
              onClick={() => { onVolumeChange(v); setConfirming(false) }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {orderType !== 'market' && (
        <div className={styles['trade-field']}>
          <label className={styles['trade-field-label']}>{t('terms.entryPrice')}</label>
          <div className={styles['trade-input-with-icon']}>
            <input
              className={styles['trade-field-input']}
              value={price}
              onChange={(e) => { onPriceChange(e.target.value); setConfirming(false) }}
              placeholder={t('phrases.enterPrice')}
            />
            <button
              className={styles['trade-copier-btn']}
              onClick={() => displayPrice && onCopyPrice(displayPrice.toString())}
              title={t('phrases.copyLivePrice')}
            >
              🎯
            </button>
          </div>
        </div>
      )}

      <div className={styles['trade-sl-tp-row']}>
        <div className={styles['trade-field']} style={{ flex: 1 }}>
          <label className={styles['trade-field-label']}>
            {t('terms.stopLoss')}
            {slPips > 0 && <span style={{ color: '#ef5350', marginLeft: 4, fontSize: 10 }}>({slPips.toFixed(1)} pips)</span>}
          </label>
          <div className={styles['trade-input-with-icon']}>
            <input
              className={styles['trade-field-input']}
              value={sl}
              onChange={(e) => { onSlChange(e.target.value); setConfirming(false) }}
              placeholder={t('phrases.sl')}
            />
            <button
              className={styles['trade-copier-btn']}
              onClick={() => displayPrice && onCopySl(displayPrice.toString())}
              title={t('phrases.copyLivePrice')}
            >
              🎯
            </button>
          </div>
        </div>
        <div className={styles['trade-field']} style={{ flex: 1 }}>
          <label className={styles['trade-field-label']}>
            {t('terms.takeProfit')}
            {tpPips > 0 && <span style={{ color: '#26a69a', marginLeft: 4, fontSize: 10 }}>({tpPips.toFixed(1)} pips)</span>}
          </label>
          <div className={styles['trade-input-with-icon']}>
            <input
              className={styles['trade-field-input']}
              value={tp}
              onChange={(e) => { onTpChange(e.target.value); setConfirming(false) }}
              placeholder={t('phrases.tp')}
            />
            <button
              className={styles['trade-copier-btn']}
              onClick={() => displayPrice && onCopyTp(displayPrice.toString())}
              title="Copy Live Price"
            >
              🎯
            </button>
          </div>
        </div>
      </div>

      {(riskAmount > 0 || rewardAmount > 0) && (
        <div className={styles['trade-risk-calculator']}>
          {riskAmount > 0 && (
            <span>{t('phrases.risk')}: <strong style={{ color: '#ef5350' }}>${riskAmount.toFixed(2)}</strong> </span>
          )}
          {rewardAmount > 0 && (
            <span>{t('phrases.reward')}: <strong style={{ color: '#26a69a' }}>${rewardAmount.toFixed(2)}</strong></span>
          )}
          {riskAmount > 0 && rewardAmount > 0 && (
            <span style={{ marginLeft: 8, color: '#9ca3af' }}>{t('phrases.rr')} {(rewardAmount / riskAmount).toFixed(1)}</span>
          )}
        </div>
      )}

      {orderError && <div className={styles['trade-error']}>{orderError}</div>}

      {confirming ? (
        <div className={styles['trade-confirm-row']}>
          <button
            className={`${styles['trade-confirm-btn']} ${styles.confirm}`}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? <span className={styles['trade-spinner']} /> : t('phrases.confirm')}
          </button>
          <button
            className={`${styles['trade-confirm-btn']} ${styles.cancel}`}
            onClick={handleCancel}
            disabled={submitting}
          >
            {t('phrases.cancel')}
          </button>
        </div>
      ) : (
        <button
          className={`${styles['trade-submit-btn']} ${styles[side]}`}
          onClick={handleFirstClick}
          disabled={(orderType === 'market' && displayPrice == null)}
        >
          {side === 'buy' ? '▲' : '▼'} {side.toUpperCase()} {volume} {symbol}
        </button>
      )}
    </div>
  )
}

export default memo(OrderPanel)
