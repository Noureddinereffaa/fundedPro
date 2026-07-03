import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout.tsx'
import { accountApi, riskApi, tradingApi, reportApi } from '../utils/api.ts'

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [account, setAccount] = useState<any>(null)
  const [risk, setRisk] = useState<any>(null)
  const [positions, setPositions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [equity, setEquity] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [tab, setTab] = useState<'positions' | 'history' | 'stats'>('positions')

  useEffect(() => {
    if (!id) return
    accountApi.getById(id).then(setAccount).catch(() => {})
    riskApi.getStatus(id).then(setRisk).catch(() => {})
    tradingApi.getPositions(id).then(setPositions).catch(() => {})
    tradingApi.getStats(id).then(setStats).catch(() => {})
    reportApi.getEquity(id, 30).then(setEquity).catch(() => {})
    tradingApi.getHistory(id, 1, 50).then(res => setHistory(res.data || [])).catch(() => {})
  }, [id])

  if (!id || !account) {
    return <Layout><div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</div></Layout>
  }

  return (
    <Layout>
      <div style={{ maxWidth: 1200 }}>
        <Link to="/dashboard" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 13, display: 'inline-block', marginBottom: 16 }}>
          &larr; Back to Dashboard
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>
              ${Number(account.accountSize).toLocaleString()} Account
            </h1>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{account.platform} | {account.phase || account.status}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/trade/${id}`} style={{
              padding: '10px 20px', background: '#22c55e', color: '#fff',
              borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
            }}>
              Trade Now
            </Link>
          </div>
        </div>

        {/* Risk Status Bar */}
        {risk && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12,
            marginBottom: 24,
          }}>
            <RiskCard label="Balance" value={`$${Number(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
            <RiskCard label="Equity" value={`$${Number(account.equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
            <RiskCard
              label="Daily P&L"
              value={`$${risk.dailyPnl}`}
              sub={`${risk.dailyLossPercent}%`}
              color={Number(risk.dailyPnl) >= 0 ? '#22c55e' : '#ef4444'}
            />
            <RiskCard
              label="Overall P&L"
              value={`$${risk.overallPnl}`}
              sub={`${risk.overallLossPercent}%`}
              color={Number(risk.overallPnl) >= 0 ? '#22c55e' : '#ef4444'}
            />
            {risk.profitTargetProgress && (
              <RiskCard label="Target Progress" value={`${risk.profitTargetProgress}%`} color="#3b82f6" />
            )}
            <RiskCard label="Open Positions" value={`${risk.openPositions}`} sub={`Max: ${risk.maxOpenTrades || '∞'}`} />
            <RiskCard label="Free Margin" value={`$${risk.freeMargin}`} />
            <RiskCard label="Trading Days" value={`${risk.tradingDaysCount}`} sub={`Min: ${risk.minTradingDays || 0}`} />
          </div>
        )}

        {/* Equity Chart (simple sparkline) */}
        {equity.length > 0 && (
          <div style={{ marginBottom: 24, padding: 20, background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
            <h3 style={{ fontSize: 14, color: '#9ca3af', marginBottom: 12, fontWeight: 500 }}>Equity Curve (30 Days)</h3>
            <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 100 }}>
              {equity.map((point: any, i: number) => {
                const values = equity.map((e: any) => Number(e.equity))
                const min = Math.min(...values)
                const max = Math.max(...values)
                const range = max - min || 1
                const height = ((Number(point.equity) - min) / range) * 80 + 20
                const isPositive = Number(point.dailyPnl) >= 0
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{
                      width: '100%', height, minHeight: 2,
                      background: isPositive ? '#22c55e' : '#ef4444',
                      borderRadius: 2, opacity: 0.8,
                    }} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {(['positions', 'history', 'stats'] as const).map(t => (
            <button
              key={t} onClick={() => setTab(t)}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: 'none', textTransform: 'capitalize',
                background: tab === t ? '#2563eb' : '#1f2937',
                color: tab === t ? '#fff' : '#9ca3af',
              }}
            >
              {t} {t === 'positions' ? `(${positions.length})` : ''}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflow: 'hidden' }}>
          {tab === 'positions' && (
            positions.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <h3 style={{ color: '#e0e0e0', fontSize: 16, margin: '0 0 8px' }}>No Open Positions</h3>
                <p style={{ color: '#6b7280', margin: '0 0 24px', fontSize: 14 }}>You don't have any active trades right now.</p>
                <Link to={`/trade/${id}`} style={{
                  padding: '10px 20px', background: '#2563eb', color: '#fff',
                  borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
                }}>
                  Open a Position
                </Link>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#0a0e17' }}>
                    <th style={thStyle}>Symbol</th>
                    <th style={thStyle}>Side</th>
                    <th style={thStyle}>Volume</th>
                    <th style={thStyle}>Open</th>
                    <th style={thStyle}>Current</th>
                    <th style={thStyle}>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p: any) => (
                    <tr key={p.id} style={{ borderTop: '1px solid #1f2937' }}>
                      <td style={tdStyle}>{p.symbol}</td>
                      <td style={{ ...tdStyle, color: p.side === 'buy' ? '#22c55e' : '#ef4444' }}>{p.side}</td>
                      <td style={tdStyle}>{p.volume}</td>
                      <td style={tdStyle}>{p.openPrice}</td>
                      <td style={tdStyle}>{p.currentPrice || '-'}</td>
                      <td style={{ ...tdStyle, color: Number(p.profit) >= 0 ? '#22c55e' : '#ef4444' }}>
                        ${Number(p.profit).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === 'stats' && (stats ? (
            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <StatItem label="Total Trades" value={stats.totalTrades} />
              <StatItem label="Win Rate" value={`${stats.winRate}%`} />
              <StatItem label="Profit Factor" value={stats.profitFactor} />
              <StatItem label="Average Win" value={`$${stats.averageWin}`} />
              <StatItem label="Average Loss" value={`$${stats.averageLoss}`} />
              <StatItem label="Best Trade" value={`$${stats.bestTrade}`} />
              <StatItem label="Worst Trade" value={`$${stats.worstTrade}`} />
              <StatItem label="Net P&L" value={`$${stats.netPnl}`} color={Number(stats.netPnl) >= 0 ? '#22c55e' : '#ef4444'} />
            </div>
          ) : (
             <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
               <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
               <div>No statistics available yet.</div>
             </div>
          ))}

          {tab === 'history' && (
            history.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📜</div>
                <h3 style={{ color: '#e0e0e0', fontSize: 16, margin: '0 0 8px' }}>No Trading History</h3>
                <p style={{ color: '#6b7280', margin: 0, fontSize: 14 }}>Your closed trades will appear here.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#0a0e17' }}>
                    <th style={thStyle}>Symbol</th>
                    <th style={thStyle}>Side</th>
                    <th style={thStyle}>Volume</th>
                    <th style={thStyle}>Open</th>
                    <th style={thStyle}>Close</th>
                    <th style={thStyle}>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((t: any) => (
                    <tr key={t.id} style={{ borderTop: '1px solid #1f2937' }}>
                      <td style={tdStyle}>{t.symbol}</td>
                      <td style={{ ...tdStyle, color: t.side === 'buy' ? '#22c55e' : '#ef4444' }}>{t.side}</td>
                      <td style={tdStyle}>{t.volume}</td>
                      <td style={tdStyle}>{t.openPrice}</td>
                      <td style={tdStyle}>{t.closePrice}</td>
                      <td style={{ ...tdStyle, color: Number(t.profit) >= 0 ? '#22c55e' : '#ef4444' }}>
                        ${Number(t.profit).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </Layout>
  )
}

function RiskCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#111827', borderRadius: 8, padding: '12px 16px', border: '1px solid #1f2937' }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || '#e0e0e0' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function StatItem({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || '#e0e0e0' }}>{value}</div>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }
const tdStyle: React.CSSProperties = { padding: '10px 14px', color: '#e0e0e0' }
