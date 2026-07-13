import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { tradingApi, accountApi } from '../../utils/api.ts'
import { useTranslation } from 'react-i18next'
import Layout from '../../components/Layout.tsx'
import type { TradeHistory, Account } from '../../../shared/types'
import { th, td, pageBtn } from '../../utils/cssConstants.ts'

export default function TradingHistoryPage() {
  const { t } = useTranslation('common')
  const { user, loading: authLoading } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [trades, setTrades] = useState<TradeHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    symbol: '',
    side: '',
    dateFrom: '',
    dateTo: '',
    profit: '',
  })
  const totalPages = 1

  useEffect(() => {
    if (user) {
      accountApi
        .getAll()
        .then((data) => {
          const userAccounts = data.accounts || []
          setAccounts(userAccounts)
          if (userAccounts.length > 0) {
            setSelectedAccount(userAccounts[0].id)
            loadTrades()
          }
        })
        .catch(() => {})
    }
  }, [user])

  const loadTrades = () => {
    if (!selectedAccount) return
    setLoading(true)
    tradingApi
      .getHistory(selectedAccount, page, 50)
      .then((data) => {
        setTrades(data.trades || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const getFilteredTrades = () => {
    return trades.filter((t) => {
      if (filters.symbol && t.symbol !== filters.symbol) return false
      if (filters.side && t.side !== filters.side) return false
      if (filters.profit === 'win' && Number(t.profit) <= 0) return false
      if (filters.profit === 'loss' && Number(t.profit) >= 0) return false
      if (filters.dateFrom && new Date(t.closeTime) < new Date(filters.dateFrom)) return false
      if (filters.dateTo && new Date(t.closeTime) > new Date(filters.dateTo + 'T23:59:59')) return false
      return true
    })
  }

  if (authLoading)
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('actions.loading')}</div>
      </Layout>
    )

  const filteredTrades = getFilteredTrades()
  const totalPnl = filteredTrades.reduce((sum, t) => sum + Number(t.profit), 0)
  const wins = filteredTrades.filter((t) => Number(t.profit) > 0).length
  const losses = filteredTrades.filter((t) => Number(t.profit) < 0).length

  return (
    <Layout>
      <div style={{ maxWidth: 1200 }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>{t('tradingHistory.title')}</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0' }}>{t('tradingHistory.description')}</p>
          </div>
        </div>

        {accounts.length > 0 && (
          <div
            style={{
              background: '#111827',
              borderRadius: 12,
              padding: 16,
              border: '1px solid #1f2937',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ display: 'block', color: '#6b7280', fontSize: 12, marginBottom: 4 }}>
                  {t('tradingHistory.account')}
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => {
                    setSelectedAccount(e.target.value)
                    setPage(1)
                    loadTrades()
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: 6,
                    color: '#e0e0e0',
                    fontSize: 13,
                  }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      ${a.accountSize.toLocaleString()} - {a.phase || a.status}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: 140 }}>
                <label style={{ display: 'block', color: '#6b7280', fontSize: 12, marginBottom: 4 }}>
                  {t('tradingHistory.symbol')}
                </label>
                <select
                  value={filters.symbol}
                  onChange={(e) => setFilters((prev) => ({ ...prev, symbol: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: 6,
                    color: '#e0e0e0',
                    fontSize: 13,
                  }}
                >
                  <option value="">{t('tradingHistory.allSymbols')}</option>
                  {[
                    'BTCUSDT',
                    'ETHUSDT',
                    'SOLUSDT',
                    'XRPUSDT',
                    'ADAUSDT',
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: 100 }}>
                <label style={{ display: 'block', color: '#6b7280', fontSize: 12, marginBottom: 4 }}>
                  {t('tradingHistory.side')}
                </label>
                <select
                  value={filters.side}
                  onChange={(e) => setFilters((prev) => ({ ...prev, side: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: 6,
                    color: '#e0e0e0',
                    fontSize: 13,
                  }}
                >
                  <option value="">{t('tradingHistory.all')}</option>
                  <option value="buy">{t('tradingHistory.buy')}</option>
                  <option value="sell">{t('tradingHistory.sell')}</option>
                </select>
              </div>

              <div style={{ minWidth: 100 }}>
                <label style={{ display: 'block', color: '#6b7280', fontSize: 12, marginBottom: 4 }}>
                  {t('tradingHistory.result')}
                </label>
                <select
                  value={filters.profit}
                  onChange={(e) => setFilters((prev) => ({ ...prev, profit: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: 6,
                    color: '#e0e0e0',
                    fontSize: 13,
                  }}
                >
                  <option value="">{t('tradingHistory.all')}</option>
                  <option value="win">{t('tradingHistory.wins')}</option>
                  <option value="loss">{t('tradingHistory.losses')}</option>
                </select>
              </div>

              <div style={{ minWidth: 140 }}>
                <label style={{ display: 'block', color: '#6b7280', fontSize: 12, marginBottom: 4 }}>
                  {t('tradingHistory.dateFrom')}
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: 6,
                    color: '#e0e0e0',
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ minWidth: 140 }}>
                <label style={{ display: 'block', color: '#6b7280', fontSize: 12, marginBottom: 4 }}>
                  {t('tradingHistory.dateTo')}
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: 6,
                    color: '#e0e0e0',
                    fontSize: 13,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div
          className="trade-stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <StatCard label={t('tradingHistory.totalTrades')} value={filteredTrades.length} color="#3b82f6" />
          <StatCard label={t('tradingHistory.wins')} value={wins} color="#22c55e" />
          <StatCard label={t('tradingHistory.losses')} value={losses} color="#ef4444" />
          <StatCard
            label={t('tradingHistory.netPnl')}
            value={`${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}`}
            color={totalPnl >= 0 ? '#22c55e' : '#ef4444'}
          />
        </div>

        <div
          style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflowX: 'auto' }}
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('tradingHistory.loading')}</div>
          ) : filteredTrades.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('tradingHistory.noTrades')}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0a0e17' }}>
                  <th style={th}>{t('tradingHistory.date')}</th>
                  <th style={th}>{t('tradingHistory.symbol')}</th>
                  <th style={th}>{t('tradingHistory.side')}</th>
                  <th style={th}>{t('tradingHistory.volume')}</th>
                  <th style={th}>{t('tradingHistory.open')}</th>
                  <th style={th}>{t('tradingHistory.close')}</th>
                  <th style={th}>{t('tradingHistory.pnl')}</th>
                  <th style={th}>{t('tradingHistory.swap')}</th>
                  <th style={th}>{t('tradingHistory.comm')}</th>
                  <th style={th}>{t('tradingHistory.duration')}</th>
                  <th style={th}>{t('tradingHistory.reason')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((t) => (
                  <tr key={t.id} style={{ borderTop: '1px solid #1f2937' }}>
                    <td style={td}>{new Date(t.closeTime).toLocaleString()}</td>
                    <td style={td}>{t.symbol}</td>
                    <td style={{ ...td, color: t.side === 'buy' ? '#22c55e' : '#ef4444' }}>
                      {t.side.toUpperCase()}
                    </td>
                    <td style={td}>{t.volume}</td>
                    <td style={td}>{t.openPrice}</td>
                    <td style={td}>{t.closePrice}</td>
                    <td
                      style={{ ...td, fontWeight: 600, color: Number(t.profit) >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      ${Number(t.profit).toFixed(2)}
                    </td>
                    <td style={td}>${Number(t.swap).toFixed(2)}</td>
                    <td style={td}>${Number(t.commission).toFixed(2)}</td>
                    <td style={td}>{formatDuration(t.duration)}</td>
                    <td style={{ ...td, color: '#6b7280', fontSize: 12 }}>{t.closeReason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pageBtn}>
              {t('tradingHistory.previous')}
            </button>
            <span style={{ padding: '8px 16px', color: '#6b7280', fontSize: 13 }}>
              {t('tradingHistory.pageOf', { page, totalPages })}
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={pageBtn}>
              {t('tradingHistory.next')}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: '#111827', borderRadius: 8, padding: '16px 20', border: '1px solid #1f2937' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function formatDuration(seconds: number | undefined) {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
}