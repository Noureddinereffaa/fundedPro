import { memo, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Virtuoso } from 'react-virtuoso'
import type { Position } from '../../../shared/types'
import LivePrice from './LivePrice'
import LivePnl from './LivePnl'
import styles from '../../styles/trade.module.css'
import { useDebounce } from '../../utils/useDebounce.ts'

interface PositionsTableProps {
  positions: Position[]
  onReverse: (p: Position) => void
  onModify: (p: Position) => void
  onClose: (p: Position) => void
  onCloseAll: () => void
}

type SortKey = 'symbol' | 'side' | 'volume' | 'openPrice' | 'swap' | 'pnl'

function PositionsTable({ positions, onReverse, onModify, onClose, onCloseAll }: PositionsTableProps) {
  const { t } = useTranslation('trading')
  const [filter, setFilter] = useState('')
  const debouncedFilter = useDebounce(filter, 200)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [confirmingReverseId, setConfirmingReverseId] = useState<string | null>(null)

  const handleReverseClick = useCallback((p: Position) => {
    setConfirmingReverseId(p.id)
  }, [])

  const handleConfirmReverse = useCallback((p: Position) => {
    setConfirmingReverseId(null)
    onReverse(p)
  }, [onReverse])

  const handleCancelReverse = useCallback(() => {
    setConfirmingReverseId(null)
  }, [])

  const filtered = useMemo(() => {
    let list = positions
    if (debouncedFilter) {
      const f = debouncedFilter.toUpperCase()
      list = list.filter((p) => p.symbol.toUpperCase().includes(f))
    }
    return list
  }, [positions, debouncedFilter])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'symbol') cmp = a.symbol.localeCompare(b.symbol)
      else if (sortKey === 'side') cmp = a.side.localeCompare(b.side)
      else if (sortKey === 'volume') cmp = a.volume - b.volume
      else if (sortKey === 'openPrice') cmp = a.openPrice - b.openPrice
      else if (sortKey === 'swap') cmp = Number(a.swap) - Number(b.swap)
      else if (sortKey === 'pnl') cmp = 0
      return sortAsc ? cmp : -cmp
    })
  }, [filtered, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortAsc ? ' ▲' : ' ▼'
  }

  if (positions.length === 0) {
    return <div className={styles['trade-empty']}>{t('phrases.noPositions')}</div>
  }

  return (
    <div className={styles['trade-positions-table']}>
      <div style={{ padding: '4px 8px' }}>
        <input
          className={styles['trade-field-input']}
          placeholder={t('phrases.filterSymbol')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: '100%', fontSize: 11, padding: '4px 8px' }}
        />
      </div>
      <div className={styles['trade-pos-header']}>
        <span onClick={() => toggleSort('symbol')} style={{ cursor: 'pointer' }}>
          {t('terms.symbol')}{sortArrow('symbol')}
        </span>
        <span onClick={() => toggleSort('side')} style={{ cursor: 'pointer' }}>
          {t('terms.side')}{sortArrow('side')}
        </span>
        <span onClick={() => toggleSort('volume')} style={{ cursor: 'pointer' }}>
          {t('phrases.vol')}{sortArrow('volume')}
        </span>
        <span onClick={() => toggleSort('openPrice')} style={{ cursor: 'pointer' }}>
          {t('phrases.open')}{sortArrow('openPrice')}
        </span>
        <span>{t('phrases.current')}</span>
        <span>{t('phrases.sl')}</span>
        <span>{t('phrases.tp')}</span>
        <span onClick={() => toggleSort('swap')} style={{ cursor: 'pointer' }}>
          {t('terms.swap')}{sortArrow('swap')}
        </span>
        <span>{t('terms.pnl')}</span>
        <div style={{ textAlign: 'right' }}>
          <button className={styles['trade-close-all-btn']} onClick={onCloseAll}>
            {t('phrases.closeAll')}
          </button>
        </div>
      </div>
      <Virtuoso
        style={{ height: Math.min(sorted.length * 38, 380) }}
        totalCount={sorted.length}
        itemContent={(index) => {
          const p = sorted[index]
          return (
            <div className={styles['trade-pos-row']}>
              <span data-label="Symbol" className={styles['trade-pos-symbol']}>
                {p.symbol}
              </span>
              <span data-label="Side" className={`${styles['trade-pos-side']} ${styles[p.side as keyof typeof styles]}`}>
                {p.side.toUpperCase()}
              </span>
              <span data-label="Vol">{p.volume}</span>
              <span data-label="Open">{p.openPrice}</span>
              <span data-label="Current">
                <LivePrice symbol={p.symbol} type="price" />
              </span>
              <span data-label="SL">{p.stopLoss || '—'}</span>
              <span data-label="TP">{p.takeProfit || '—'}</span>
              <span data-label="Swap" className={`${styles['trade-pos-swap']} ${Number(p.swap) < 0 ? styles.down : styles.up}`}>
                {Number(p.swap) !== 0 ? `$${Number(p.swap).toFixed(2)}` : '—'}
              </span>
              <span data-label="P&L">
                <LivePnl position={p} />
              </span>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                {confirmingReverseId === p.id ? (
                  <>
                    <button
                      className={`${styles['trade-pos-action-btn']} ${styles['trade-pos-rev-confirm']}`}
                      onClick={() => handleConfirmReverse(p)}
                    >
                      {t('phrases.reverse')}
                    </button>
                    <button
                      className={`${styles['trade-pos-action-btn']} ${styles['trade-pos-rev-cancel']}`}
                      onClick={handleCancelReverse}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <button
                    className={`${styles['trade-pos-action-btn']} ${styles.reverse}`}
                    title={t('phrases.reversePosition')}
                    onClick={() => handleReverseClick(p)}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </button>
                )}
                <button className={`${styles['trade-pos-action-btn']} modify`} onClick={() => onModify(p)}>
                  {t('phrases.modify')}
                </button>
                <button className={`${styles['trade-pos-action-btn']} ${styles.close}`} onClick={() => onClose(p)}>
                  {t('phrases.close')}
                </button>
              </div>
            </div>
          )
        }}
      />
    </div>
  )
}

export default memo(PositionsTable)
