import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TradeHistory } from '../../../shared/types'
import styles from '../../styles/trade.module.css'

interface HistoryTableProps {
  history: TradeHistory[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

function HistoryTable({ history, page, totalPages, onPageChange }: HistoryTableProps) {
  const { t } = useTranslation('trading')
  const stats = useMemo(() => {
    const total = history.length
    const wins = history.filter((h) => Number(h.profit) >= 0).length
    const losses = total - wins
    const totalPnl = history.reduce((s, h) => s + Number(h.profit), 0)
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'
    const avgWin = wins > 0 ? history.filter((h) => Number(h.profit) >= 0).reduce((s, h) => s + Number(h.profit), 0) / wins : 0
    const avgLoss = losses > 0 ? history.filter((h) => Number(h.profit) < 0).reduce((s, h) => s + Number(h.profit), 0) / losses : 0
    const bestTrade = history.length > 0 ? Math.max(...history.map((h) => Number(h.profit))) : 0
    const worstTrade = history.length > 0 ? Math.min(...history.map((h) => Number(h.profit))) : 0
    return { total, wins, losses, totalPnl, winRate, avgWin, avgLoss, bestTrade, worstTrade }
  }, [history])

  if (history.length === 0) {
    return <div className={styles['trade-empty']}>{t('phrases.noHistory')}</div>
  }

  return (
    <div>
      <div className={styles['trade-history-stats']}>
        <div className={styles['trade-history-stat']}>
          <span className={styles['trade-history-stat-label']}>{t('phrases.totalTrades')}</span>
          <span className={styles['trade-history-stat-value']}>{stats.total}</span>
        </div>
        <div className={styles['trade-history-stat']}>
          <span className={styles['trade-history-stat-label']}>{t('phrases.winRate')}</span>
          <span className={styles['trade-history-stat-value']} style={{ color: Number(stats.winRate) >= 50 ? '#26a69a' : '#ef5350' }}>
            {stats.winRate}%
          </span>
        </div>
        <div className={styles['trade-history-stat']}>
          <span className={styles['trade-history-stat-label']}>{t('phrases.totalPnl')}</span>
          <span className={styles['trade-history-stat-value']} style={{ color: stats.totalPnl >= 0 ? '#26a69a' : '#ef5350' }}>
            {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
          </span>
        </div>
        <div className={styles['trade-history-stat']}>
          <span className={styles['trade-history-stat-label']}>{t('phrases.avgWin')}</span>
          <span className={styles['trade-history-stat-value']} style={{ color: '#26a69a' }}>+${stats.avgWin.toFixed(2)}</span>
        </div>
        <div className={styles['trade-history-stat']}>
          <span className={styles['trade-history-stat-label']}>{t('phrases.avgLoss')}</span>
          <span className={styles['trade-history-stat-value']} style={{ color: '#ef5350' }}>${stats.avgLoss.toFixed(2)}</span>
        </div>
        <div className={styles['trade-history-stat']}>
          <span className={styles['trade-history-stat-label']}>{t('phrases.bestWorst')}</span>
          <span className={styles['trade-history-stat-value']}>
            <span style={{ color: '#26a69a' }}>+${stats.bestTrade.toFixed(2)}</span>
            {' / '}
            <span style={{ color: '#ef5350' }}>${stats.worstTrade.toFixed(2)}</span>
          </span>
        </div>
      </div>
      <div className={styles['trade-positions-table']}>
        <div className={styles['trade-pos-header']}>
          <span>{t('terms.symbol')}</span>
          <span>{t('terms.side')}</span>
          <span>{t('terms.volume')}</span>
          <span>{t('phrases.open')}</span>
          <span>{t('phrases.close')}</span>
          <span>{t('terms.swap')}</span>
          <span>{t('terms.commission')}</span>
          <span>{t('phrases.duration')}</span>
          <span>{t('phrases.reason')}</span>
          <span>{t('terms.pnl')}</span>
        </div>
        {history.map((h: TradeHistory) => {
          const duration = h.duration || 0
          const hours = Math.floor(duration / 3600)
          const mins = Math.floor((duration % 3600) / 60)
          const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
          const reasonLabel =
            h.closeReason === 'stop_loss' ? 'SL' :
            h.closeReason === 'take_profit' ? 'TP' :
            h.closeReason === 'partial' ? 'Partial' :
            h.closeReason || 'Manual'
          const reasonColor =
            h.closeReason === 'stop_loss' ? '#ef5350' :
            h.closeReason === 'take_profit' ? '#26a69a' :
            '#787b86'
          return (
            <div key={h.id} className={styles['trade-pos-row']}>
              <span data-label="Symbol" className={styles['trade-pos-symbol']}>{h.symbol}</span>
              <span data-label="Side" className={`${styles['trade-pos-side']} ${styles[h.side as keyof typeof styles]}`}>
                {h.side.toUpperCase()}
              </span>
              <span data-label="Vol">{h.volume}</span>
              <span data-label="Open">{h.openPrice}</span>
              <span data-label="Close">{h.closePrice}</span>
              <span data-label="Swap">{h.swap != null ? `$${Number(h.swap).toFixed(2)}` : '—'}</span>
              <span data-label="Comm">{h.commission != null ? `$${Number(h.commission).toFixed(2)}` : '—'}</span>
              <span data-label="Duration">{durStr}</span>
              <span data-label="Reason" style={{ color: reasonColor, fontWeight: 600 }}>{reasonLabel}</span>
              <span className={`${styles['trade-pos-pnl']} ${Number(h.profit) >= 0 ? styles.up : styles.down}`}>
                {Number(h.profit) >= 0 ? '+' : ''}${Number(h.profit).toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>
      {totalPages > 1 && (
        <div className={styles['trade-history-pagination']}>
          <button
            className={styles['trade-history-page-btn']}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            {t('phrases.prev')}
          </button>
          <span className={styles['trade-history-page-info']}>
            {t('phrases.pageOf', { page, totalPages })}
          </span>
          <button
            className={styles['trade-history-page-btn']}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {t('phrases.next')}
          </button>
        </div>
      )}
    </div>
  )
}

export default memo(HistoryTable)
