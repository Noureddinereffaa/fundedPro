import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createChart, LineSeries } from 'lightweight-charts'
import type { PortfolioSummary } from '../../shared/types'
import { accountApi } from '../utils/api'
import Layout from '../components/Layout'

const format$ = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function PortfolioPage() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const [data, setData] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [sortKey, setSortKey] = useState<'balance' | 'equity' | 'phase' | 'status' | 'createdAt' | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [equityData, setEquityData] = useState<{ date: string; equity: number }[]>([])
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<ReturnType<typeof createChart> | null>(null)

  useEffect(() => {
    accountApi.getSummary().then((res: unknown) => {
      setData(res as typeof data)
      setLoading(false)
    })
    accountApi.getPortfolioEquity().then((res: unknown) => setEquityData(res as typeof equityData))
  }, [])

  useEffect(() => {
    if (!chartRef.current || equityData.length === 0) return
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = createChart(chartRef.current, {
        width: chartRef.current.clientWidth,
        height: 300,
        layout: { background: { color: 'transparent' }, textColor: '#9ca3af' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.08)' },
      })
      const series = chartInstanceRef.current.addSeries(LineSeries, {
        color: '#26a69a', lineWidth: 2, lastValueVisible: true, priceFormat: { type: 'price', precision: 2 },
      })
      series.setData(equityData.map((d) => ({ time: d.date, value: d.equity })))
    }
    const handleResize = () => {
      if (chartRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.resize(chartRef.current.clientWidth, 300)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [equityData])

  const filtered = useMemo(() => {
    if (!data) return []
    let list = data.accounts
    if (filter) {
      const f = filter.toLowerCase()
      list = list.filter(
        (a) =>
          a.id.toLowerCase().includes(f) ||
          a.phase?.toLowerCase().includes(f) ||
          a.status.toLowerCase().includes(f),
      )
    }
    return list
  }, [data, filter])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'balance') cmp = a.balance - b.balance
      else if (sortKey === 'equity') cmp = a.equity - b.equity
      else if (sortKey === 'phase') cmp = (a.phase || '').localeCompare(b.phase || '')
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
      else if (sortKey === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortAsc ? cmp : -cmp
    })
  }, [filtered, sortKey, sortAsc])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) { setSortAsc(!sortAsc) } else { setSortKey(key); setSortAsc(true) }
  }

  const totalPnL = data ? data.totalEquity - data.totalBalance : 0

  const exportCsv = useCallback(() => {
    if (!data) return
    const header = 'ID,Size,Balance,Equity,Phase,Status,Created'
    const rows = data.accounts.map((a) =>
      `${a.id},${a.accountSize},${a.balance},${a.equity},${a.phase || ''},${a.status},${a.createdAt}`,
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'portfolio.csv'; a.click()
    URL.revokeObjectURL(url)
  }, [data])

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>{t('portfolio.loading')}</div>
      </Layout>
    )
  }

  if (!data || data.totalAccounts === 0) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
          {t('portfolio.noAccounts')} <a href="/pricing" style={{ color: '#26a69a' }}>{t('accounts.purchaseFirst')}</a>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f3f4f6' }}>{t('portfolio.title')}</h1>
          <button onClick={exportCsv} style={{
            padding: '8px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid #374151',
            borderRadius: 6, color: '#9ca3af', cursor: 'pointer', fontSize: 12,
          }}>Export CSV</button>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
          {[
            { label: t('portfolio.totalBalance'), value: `$${format$(data.totalBalance)}`, color: '#f3f4f6' },
            { label: t('portfolio.totalEquity'), value: `$${format$(data.totalEquity)}`, color: totalPnL >= 0 ? '#26a69a' : '#ef5350' },
            { label: 'Total P&L', value: `${totalPnL >= 0 ? '+' : ''}$${format$(totalPnL)}`, color: totalPnL >= 0 ? '#26a69a' : '#ef5350' },
            { label: t('terms.margin'), value: `$${format$(data.totalMarginUsed)}`, color: '#ffb74d' },
            { label: t('terms.freeMargin'), value: `$${format$(data.totalFreeMargin)}`, color: '#f3f4f6' },
            { label: t('openPositions'), value: String(data.totalOpenPositions), color: '#f3f4f6' },
            { label: t('accounts.title'), value: `${data.activeAccounts}/${data.totalAccounts}`, color: data.activeAccounts > 0 ? '#26a69a' : '#9ca3af' },
            { label: 'Funded', value: String(data.fundedAccounts), color: data.fundedAccounts > 0 ? '#26a69a' : '#9ca3af' },
          ].map((c) => (
            <div key={c.label} style={{
              padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Equity Chart */}
        {equityData.length > 0 && (
          <div style={{ marginBottom: 24, background: 'rgba(255,255,255,0.01)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', padding: 16 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>{t('portfolio.equityCurve')}</div>
            <div ref={chartRef} style={{ width: '100%', height: 300 }} />
          </div>
        )}

        {/* Filter */}
        <input
          placeholder={t('portfolio.searchPlaceholder')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', marginBottom: 16, borderRadius: 6, border: '1px solid #374151',
            background: 'rgba(255,255,255,0.04)', color: '#f3f4f6', fontSize: 13, outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { key: null as any, label: '#' },
                  { key: null, label: t('portfolio.size') },
                  { key: 'balance', label: t('terms.balance') },
                  { key: 'equity', label: t('terms.equity') },
                  { key: 'phase', label: t('portfolio.phase') },
                  { key: 'status', label: t('portfolio.status') },
                  { key: null, label: t('portfolio.progress') },
                  { key: 'createdAt', label: t('portfolio.created') },
                  { key: null, label: '' },
                ].map((col) => (
                  <th
                    key={col.label}
                    onClick={col.key ? () => toggleSort(col.key) : undefined}
                    style={{
                      padding: '8px 12px', textAlign: 'left', color: '#9ca3af', fontWeight: 600, fontSize: 11,
                      cursor: col.key ? 'pointer' : 'default', whiteSpace: 'nowrap',
                    }}
                  >
                    {col.label}
                    {col.key && sortKey === col.key ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((acc, i) => {
                const progress = acc.profitTarget && acc.accountSize
                  ? Math.min(100, ((acc.balance - acc.accountSize) / ((acc.profitTarget / 100) * acc.accountSize)) * 100)
                  : 0
                return (
                  <tr
                    key={acc.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#f3f4f6' }}>
                      ${acc.accountSize.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#f3f4f6' }}>${format$(acc.balance)}</td>
                    <td style={{
                      padding: '10px 12px', fontWeight: 600,
                      color: acc.equity >= acc.balance ? '#26a69a' : '#ef5350',
                    }}>
                      ${format$(acc.equity)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: acc.phase === 'funded' ? 'rgba(38,166,154,0.15)' : 'rgba(255,183,77,0.15)',
                        color: acc.phase === 'funded' ? '#26a69a' : '#ffb74d',
                      }}>
                        {acc.phase || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: acc.status === 'active' ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)',
                        color: acc.status === 'active' ? '#26a69a' : '#ef5350',
                      }}>
                        {acc.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${Math.min(progress, 100)}%`, height: '100%',
                            background: progress >= 100 ? '#26a69a' : '#ffb74d', borderRadius: 2,
                          }} />
                        </div>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>{progress.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {new Date(acc.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => navigate(`/trade/${acc.id}`)}
                          style={{
                            padding: '4px 10px', border: '1px solid #26a69a', borderRadius: 4,
                            background: 'rgba(38,166,154,0.1)', color: '#26a69a', fontSize: 10,
                            cursor: 'pointer', fontWeight: 600,
                          }}
                        >{t('trade')}</button>
                        <button
                          onClick={() => navigate(`/account/${acc.id}`)}
                          style={{
                            padding: '4px 10px', border: '1px solid #374151', borderRadius: 4,
                            background: 'transparent', color: '#9ca3af', fontSize: 10,
                            cursor: 'pointer', fontWeight: 600,
                          }}
                        >{t('portfolio.details')}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {sorted.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>{t('portfolio.noAccounts')}</div>
        )}
      </div>
    </Layout>
  )
}

export default PortfolioPage
