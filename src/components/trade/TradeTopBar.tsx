import { Link } from 'react-router-dom'
import { ALL_SYMBOLS } from '../../utils/marketData'
import LivePrice from './LivePrice'
import { useTranslation } from 'react-i18next'
import type { ConnectionStatus } from '../../../shared/types'
import styles from '../../styles/trade.module.css'

interface TradeTopBarProps {
  id: string
  symbol: string
  chartInterval: string
  onIntervalChange: (interval: string) => void
  connectionStatus: ConnectionStatus
  marketOpen: boolean
  isStale: boolean
  isFullscreen: boolean
  showMarketWatch: boolean
  showRightPanel: boolean
  showFullscreenPanel: boolean
  indicators: string[]
  onToggleIndicator: (indicator: string) => void
  onToggleMarketWatch: () => void
  onToggleRightPanel: () => void
  onToggleFullscreen: () => void
  onToggleFullscreenPanel: () => void
}

const INTERVAL_GROUPS = [
  { label: '1m', value: '60' },
  { label: '5m', value: '300' },
  { label: '15m', value: '900' },
  { label: '30m', value: '1800' },
  { label: '1H', value: '3600' },
  { label: '2H', value: '7200' },
  { label: '4H', value: '14400' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
]

export function TradeTopBar({
  id,
  symbol,
  chartInterval,
  onIntervalChange,
  connectionStatus,
  marketOpen,
  isStale,
  isFullscreen,
  showMarketWatch,
  showRightPanel,
  showFullscreenPanel,
  indicators,
  onToggleIndicator,
  onToggleMarketWatch,
  onToggleRightPanel,
  onToggleFullscreen,
  onToggleFullscreenPanel,
}: TradeTopBarProps) {
  const { t } = useTranslation('trading')
  const statusColor =
    connectionStatus === 'connected' ? '#26a69a' : connectionStatus === 'connecting' ? '#ffb74d' : '#ef5350'
  const statusLabel =
    connectionStatus === 'connected'
      ? t('phrases.liveStatus')
      : connectionStatus === 'connecting'
        ? t('phrases.connectingStatus')
        : t('phrases.offlineStatus')

  const groups = [INTERVAL_GROUPS.slice(0, 4), INTERVAL_GROUPS.slice(4, 7), INTERVAL_GROUPS.slice(7)]

  return (
    <div className={styles['trade-topbar']}>
      {!isFullscreen && (
        <Link to={`/account/${id}`} className={styles['trade-back-link']}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('phrases.account')}
        </Link>
      )}

      <div className={styles['trade-symbol-wrap']}>
        <div className={styles['trade-symbol-label']}>
          <span className={styles['trade-symbol-code']}>{symbol}</span>
          <span className={styles['trade-symbol-full']}>
            {ALL_SYMBOLS.find((s) => s.symbol === symbol)?.name ?? symbol}
          </span>
        </div>
      </div>

      <div className={styles['trade-intervals']}>
        {groups.map((group, gi) => (
          <span key={gi} style={{ display: 'contents' }}>
            {gi > 0 && <div className="toolbar-divider" />}
            <div className="toolbar-group">
              {group.map((i) => (
                <button
                  key={i.value}
                  onClick={() => onIntervalChange(i.value)}
                  className={`toolbar-btn ${chartInterval === i.value ? 'active' : ''}`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </span>
        ))}
      </div>

      <div className={styles['trade-topbar-right']}>
        {isFullscreen && (
          <>
            <button
              onClick={onToggleMarketWatch}
              className={`${styles['trade-topbar-btn']} ${showMarketWatch ? styles['trade-topbar-btn-active'] : ''}`}
              title={showMarketWatch ? t('phrases.hideMarketWatch') : t('phrases.showMarketWatch')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              <span>{t('phrases.mkts')}</span>
            </button>

            <button
              onClick={onToggleRightPanel}
              className={`${styles['trade-topbar-btn']} ${showRightPanel ? styles['trade-topbar-btn-active'] : ''}`}
              title={showRightPanel ? t('phrases.hideRightPanel') : t('phrases.showRightPanel')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
              <span>{t('phrases.panel')}</span>
            </button>
          </>
        )}

        <div className={styles['trade-topbar-status']}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          <span>{statusLabel}</span>
        </div>

        {isStale && connectionStatus === 'connected' && (
          <span className={`${styles['trade-topbar-badge']} ${styles['trade-topbar-badge-amber']}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {t('phrases.staleData')}
          </span>
        )}

        <LivePrice symbol={symbol} type="both" />

        {isFullscreen && (
          <button
            onClick={onToggleFullscreenPanel}
            className={`${styles['trade-topbar-btn']} ${showFullscreenPanel ? styles['trade-topbar-btn-active'] : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
            <span>{t('phrases.order')}</span>
          </button>
        )}

        {isFullscreen && (
          <div className={styles['trade-topbar-layout']}>
            <button
              onClick={() => {
                if (showMarketWatch) onToggleMarketWatch()
                if (showRightPanel) onToggleRightPanel()
              }}
              className={`${styles['trade-layout-btn']} ${!showMarketWatch && !showRightPanel ? styles['trade-layout-btn-active'] : ''}`}
              title={t('phrases.chartOnly')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (!showMarketWatch) onToggleMarketWatch()
                if (showRightPanel) onToggleRightPanel()
              }}
              className={`${styles['trade-layout-btn']} ${showMarketWatch && !showRightPanel ? styles['trade-layout-btn-active'] : ''}`}
              title={t('phrases.chartPlusMarkets')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (showMarketWatch) onToggleMarketWatch()
                if (!showRightPanel) onToggleRightPanel()
              }}
              className={`${styles['trade-layout-btn']} ${!showMarketWatch && showRightPanel ? styles['trade-layout-btn-active'] : ''}`}
              title={t('phrases.chartPlusPanel')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (!showMarketWatch) onToggleMarketWatch()
                if (!showRightPanel) onToggleRightPanel()
              }}
              className={`${styles['trade-layout-btn']} ${showMarketWatch && showRightPanel ? styles['trade-layout-btn-active'] : ''}`}
              title={t('phrases.fullSplit')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </button>
          </div>
        )}

        <div className={styles['trade-topbar-indicators']}>
          {['RSI', 'MACD', 'BB', 'MA'].map((ind) => (
            <button
              key={ind}
              onClick={() => onToggleIndicator(ind)}
              className={`${styles['trade-topbar-btn']} ${indicators.includes(ind) ? styles['trade-topbar-btn-active'] : ''}`}
              title={indicators.includes(ind) ? t('phrases.hideIndicator', { indicator: ind }) : t('phrases.showIndicator', { indicator: ind })}
              style={{ fontSize: 10, padding: '2px 6px' }}
            >
              {ind}
            </button>
          ))}
        </div>

        <button onClick={onToggleFullscreen} className={styles['trade-fullscreen-btn']} title={isFullscreen ? t('phrases.exitFullscreen') : t('phrases.fullscreen')}>
          {isFullscreen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}