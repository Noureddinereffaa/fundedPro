import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Position } from '../../../shared/types'
import { useSmoothTotalFloatingPnl } from '../../utils/useRealtime'
import styles from '../../styles/trade.module.css'

interface AccountSummaryProps {
  balance: number
  liveMarginUsed: number
  positions: Position[]
  maxDailyLoss?: number
}

function AccountSummary({ balance, liveMarginUsed, positions, maxDailyLoss }: AccountSummaryProps) {
  const { t } = useTranslation('trading')
  const totalFloatingPnl = useSmoothTotalFloatingPnl(positions)
  const liveEquity = balance + totalFloatingPnl
  const liveFreeMargin = liveEquity - liveMarginUsed
  const marginLevel = liveMarginUsed > 0 ? (liveEquity / liveMarginUsed) * 100 : 0
  const marginLevelColor = marginLevel >= 200 ? '#26a69a' : marginLevel >= 100 ? '#ffb74d' : '#ef5350'

  const dailyLossLimit = maxDailyLoss ? (Number(maxDailyLoss) / 100) * balance : 0
  const unrealizedPnl = totalFloatingPnl
  const dailyLossUsed = unrealizedPnl < 0 ? Math.abs(unrealizedPnl) : 0
  const dailyLossPercent = dailyLossLimit > 0 ? (dailyLossUsed / dailyLossLimit) * 100 : 0
  const dailyLossColor = dailyLossPercent >= 80 ? '#ef5350' : dailyLossPercent >= 50 ? '#ffb74d' : '#26a69a'

  return (
    <div className={styles['trade-account-card']}>
      <div className={styles['trade-account-row']}>
        <span className={styles['trade-account-label']}>{t('terms.balance')}</span>
        <span className={styles['trade-account-value']}>
          ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="trade-account-row">
        <span className="trade-account-label">{t('terms.equity')}</span>
        <span className={`${styles['trade-account-value']} ${totalFloatingPnl >= 0 ? 'text-up' : 'text-down'}`}>
          ${liveEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className={styles['trade-account-divider']} />
      <div className={styles['trade-account-row']}>
        <span className={styles['trade-account-label']}>{t('terms.floatingPnl')}</span>
        <span className={`${styles['trade-account-pnl']} ${totalFloatingPnl >= 0 ? styles.up : styles.down}`}>
          {totalFloatingPnl >= 0 ? '+$' : '-$'}
          {Math.abs(totalFloatingPnl).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
      <div className={styles['trade-account-row']}>
        <span className={styles['trade-account-label']}>{t('phrases.marginUsed')}</span>
        <span className={styles['trade-account-value']}>
          ${liveMarginUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className={styles['trade-account-row']}>
        <span className={styles['trade-account-label']}>{t('terms.freeMargin')}</span>
        <span className={styles['trade-account-value']}>
          ${liveFreeMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      {liveMarginUsed > 0 && (
        <div className={styles['trade-account-row']}>
          <span className={styles['trade-account-label']}>{t('terms.marginLevel')}</span>
          <span className={styles['trade-account-value']} style={{ color: marginLevelColor, fontWeight: 600 }}>
            {marginLevel.toFixed(0)}%
          </span>
        </div>
      )}
      {dailyLossLimit > 0 && (
        <>
          <div className={styles['trade-account-divider']} />
          <div className={styles['trade-account-row']}>
            <span className={styles['trade-account-label']}>{t('phrases.dailyLoss')}</span>
            <span className={styles['trade-account-value']} style={{ color: dailyLossColor, fontWeight: 600 }}>
              {dailyLossPercent.toFixed(1)}%
            </span>
          </div>
          <div className={styles['trade-account-bar-wrap']}>
            <div
              className={styles['trade-account-bar']}
              style={{ width: `${Math.min(dailyLossPercent, 100)}%`, backgroundColor: dailyLossColor }}
            />
          </div>
          <div className={styles['trade-account-row']}>
            <span className={styles['trade-account-label']} style={{ fontSize: '10px', color: '#999' }}>
              ${dailyLossUsed.toFixed(2)} / ${dailyLossLimit.toFixed(2)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default memo(AccountSummary)
