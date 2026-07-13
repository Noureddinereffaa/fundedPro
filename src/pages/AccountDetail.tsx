import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout.tsx'
import { useAuth } from '../contexts/AuthContext.tsx'
import { accountApi, riskApi, tradingApi, reportApi } from '../utils/api.ts'
import type { Account, Position, TradeHistory } from '../../shared/types'
import { th as baseTh, td as baseTd } from '../utils/cssConstants.ts'

interface RiskDetail {
  dailyPnl: string
  dailyLossPercent: string
  profitTargetProgress: string
  openPositions: number
  overallPnl: string
  overallLossPercent: string
  maxOpenTrades: number
  freeMargin: string
  tradingDaysCount: number
  minTradingDays: number
}

interface EquityPoint {
  date: string
  equity: number
  balance: number
  dailyPnl: number
}

interface TradingStats {
  totalTrades: number
  winRate: number
  profitFactor: number
  averageWin: number
  averageLoss: number
  bestTrade: number
  worstTrade: number
  netPnl: number
}

export default function AccountDetailPage() {
  const { t, i18n } = useTranslation('common')
  const lang = i18n.language
  const { id } = useParams<{ id: string }>()
  const [account, setAccount] = useState<Account | null>(null)
  const [risk, setRisk] = useState<RiskDetail | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [stats, setStats] = useState<TradingStats | null>(null)
  const [equity, setEquity] = useState<EquityPoint[]>([])
  const [history, setHistory] = useState<TradeHistory[]>([])
  const [tab, setTab] = useState<'positions' | 'history' | 'stats'>('positions')
  const [showCertificate, setShowCertificate] = useState(false)

  useEffect(() => {
    if (!id) return
    accountApi.getById(id).then(setAccount).catch(() => {})
    riskApi.getStatus(id).then(setRisk).catch(() => {})
    tradingApi.getPositions(id).then(setPositions).catch(() => {})
    tradingApi.getStats(id).then(setStats).catch(() => {})
    reportApi.getEquity(id, 30).then(setEquity).catch(() => {})
    tradingApi.getHistory(id, 1, 50).then((res) => setHistory(res.data || [])).catch(() => {})
  }, [id])

  if (!id || !account) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>{t('actions.loading')}</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ maxWidth: 1200 }}>
        <Link
          to={`/${lang}/dashboard`}
          style={{
            color: '#3b82f6',
            textDecoration: 'none',
            fontSize: 13,
            display: 'inline-block',
            marginBottom: 16,
          }}
        >
          {t('accountDetail.backToDashboard')}
        </Link>

        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>
              ${Number(account.accountSize).toLocaleString()} {t('nav.trade')}
            </h1>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {account.platform} | {account.phase || account.status}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(account.status === 'passed' || account.status === 'funded') && (
              <button
                onClick={() => setShowCertificate(true)}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                📜 Certificate
              </button>
            )}
            <Link
              to={`/${lang}/trade/${id}`}
              style={{
                padding: '10px 20px',
                background: '#22c55e',
                color: '#fff',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {t('accountDetail.tradeNow')}
            </Link>
          </div>
        </div>

        {risk && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 24,
            }}
          >
            <RiskCard label={t('accountDetail.balance')} value={`$${Number(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
            <RiskCard label={t('accountDetail.equity')} value={`$${Number(account.equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
            <RiskCard label={t('accountDetail.dailyPnl')} value={`$${risk.dailyPnl}`} sub={`${risk.dailyLossPercent}%`} color={Number(risk.dailyPnl) >= 0 ? '#22c55e' : '#ef4444'} />
            <RiskCard label={t('accountDetail.overallPnl')} value={`$${risk.overallPnl}`} sub={`${risk.overallLossPercent}%`} color={Number(risk.overallPnl) >= 0 ? '#22c55e' : '#ef4444'} />
            {risk.profitTargetProgress && (
              <RiskCard label={t('accountDetail.targetProgress')} value={`${risk.profitTargetProgress}%`} color="#3b82f6" />
            )}
            <RiskCard label={t('accountDetail.openPositions')} value={`${risk.openPositions}`} sub={t('accountDetail.maxOpen', { count: risk.maxOpenTrades || '∞' })} />
            <RiskCard label={t('accountDetail.freeMargin')} value={`$${risk.freeMargin}`} />
            <RiskCard label={t('accountDetail.tradingDays')} value={`${risk.tradingDaysCount}`} sub={t('accountDetail.minDays', { count: risk.minTradingDays || 0 })} />
          </div>
        )}

        {equity.length > 0 && (
          <div
            style={{
              marginBottom: 24,
              padding: 20,
              background: '#111827',
              borderRadius: 12,
              border: '1px solid #1f2937',
            }}
          >
            <h3 style={{ fontSize: 14, color: '#9ca3af', marginBottom: 12, fontWeight: 500 }}>
              {t('accountDetail.equityCurve', { days: 30 })}
            </h3>
            <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 100 }}>
              {equity.map((point: EquityPoint, i: number) => {
                const values = equity.map((e: EquityPoint) => Number(e.equity))
                const min = Math.min(...values)
                const max = Math.max(...values)
                const range = max - min || 1
                const height = ((Number(point.equity) - min) / range) * 80 + 20
                const isPositive = Number(point.dailyPnl) >= 0
                return (
                  <div
                    key={i}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                  >
                    <div
                      style={{
                        width: '100%', height, minHeight: 2,
                        background: isPositive ? '#22c55e' : '#ef4444',
                        borderRadius: 2, opacity: 0.8,
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {(['positions', 'history', 'stats'] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', border: 'none', textTransform: 'capitalize',
                background: tab === tabKey ? '#2563eb' : '#1f2937',
                color: tab === tabKey ? '#fff' : '#9ca3af',
              }}
            >
              {tabKey === 'positions' ? t('accountDetail.positionsTab', { count: positions.length }) :
               tabKey === 'history' ? t('accountDetail.historyTab') : t('accountDetail.statsTab')}
            </button>
          ))}
        </div>

        <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflow: 'hidden' }}>
          {tab === 'positions' &&
            (positions.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <h3 style={{ color: '#e0e0e0', fontSize: 16, margin: '0 0 8px' }}>{t('accountDetail.noPositionsTitle')}</h3>
                <p style={{ color: '#6b7280', margin: '0 0 24px', fontSize: 14 }}>
                  {t('accountDetail.noPositionsDesc')}
                </p>
                <Link
                  to={`/${lang}/trade/${id}`}
                  style={{
                    padding: '10px 20px', background: '#2563eb', color: '#fff',
                    borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
                  }}
                >
                  {t('accountDetail.openPosition')}
                </Link>
              </div>
            ) : (
              <div className="table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#0a0e17' }}>
                      <th style={thStyle}>{t('accountDetail.symbol')}</th>
                      <th style={thStyle}>{t('accountDetail.side')}</th>
                      <th style={thStyle}>{t('accountDetail.volume')}</th>
                      <th style={thStyle}>{t('accountDetail.open')}</th>
                      <th style={thStyle}>{t('accountDetail.current')}</th>
                      <th style={thStyle}>{t('accountDetail.pnl')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p: Position) => (
                      <tr key={p.id} style={{ borderTop: '1px solid #1f2937' }}>
                        <td style={tdStyle}>{p.symbol}</td>
                        <td style={{ ...tdStyle, color: p.side === 'buy' ? '#22c55e' : '#ef4444' }}>{p.side}</td>
                        <td style={tdStyle}>{p.volume}</td>
                        <td style={tdStyle}>{p.openPrice}</td>
                        <td style={tdStyle}>{p.currentPrice || '-'}</td>
                        <td style={{ ...tdStyle, color: Number(p.profit) >= 0 ? '#22c55e' : '#ef4444' }}>${Number(p.profit).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {tab === 'stats' &&
            (stats ? (
              <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                <StatItem label={t('accountDetail.totalTrades')} value={stats.totalTrades} />
                <StatItem label={t('accountDetail.winRate')} value={`${stats.winRate}%`} />
                <StatItem label={t('accountDetail.profitFactor')} value={stats.profitFactor} />
                <StatItem label={t('accountDetail.averageWin')} value={`$${stats.averageWin}`} />
                <StatItem label={t('accountDetail.averageLoss')} value={`$${stats.averageLoss}`} />
                <StatItem label={t('accountDetail.bestTrade')} value={`$${stats.bestTrade}`} />
                <StatItem label={t('accountDetail.worstTrade')} value={`$${stats.worstTrade}`} />
                <StatItem label={t('accountDetail.netPnl')} value={`$${stats.netPnl}`} color={Number(stats.netPnl) >= 0 ? '#22c55e' : '#ef4444'} />
              </div>
            ) : (
              <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
                <div>{t('accountDetail.noStats')}</div>
              </div>
            ))}

          {tab === 'history' &&
            (history.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📜</div>
                <h3 style={{ color: '#e0e0e0', fontSize: 16, margin: '0 0 8px' }}>{t('accountDetail.noHistoryTitle')}</h3>
                <p style={{ color: '#6b7280', margin: 0, fontSize: 14 }}>
                  {t('accountDetail.noHistoryDesc')}
                </p>
              </div>
            ) : (
              <div className="table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#0a0e17' }}>
                      <th style={thStyle}>{t('accountDetail.symbol')}</th>
                      <th style={thStyle}>{t('accountDetail.side')}</th>
                      <th style={thStyle}>{t('accountDetail.volume')}</th>
                      <th style={thStyle}>{t('accountDetail.open')}</th>
                      <th style={thStyle}>{t('tradingHistory.close')}</th>
                      <th style={thStyle}>{t('accountDetail.pnl')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((th: TradeHistory) => (
                      <tr key={th.id} style={{ borderTop: '1px solid #1f2937' }}>
                        <td style={tdStyle}>{th.symbol}</td>
                        <td style={{ ...tdStyle, color: th.side === 'buy' ? '#22c55e' : '#ef4444' }}>{th.side}</td>
                        <td style={tdStyle}>{th.volume}</td>
                        <td style={tdStyle}>{th.openPrice}</td>
                        <td style={tdStyle}>{th.closePrice}</td>
                        <td style={{ ...tdStyle, color: Number(th.profit) >= 0 ? '#22c55e' : '#ef4444' }}>${Number(th.profit).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      </div>

      {showCertificate && account && (
        <CertificateModal
          account={account}
          stats={stats}
          onClose={() => setShowCertificate(false)}
        />
      )}
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

function StatItem({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || '#e0e0e0' }}>{value}</div>
    </div>
  )
}

const thStyle: React.CSSProperties = { ...baseTh, padding: '10px 14px' }
const tdStyle: React.CSSProperties = { ...baseTd, padding: '10px 14px' }

// ── CertificateModal ─────────────────────────────────────────────────────────
function CertificateModal({
  account,
  stats,
  onClose,
}: {
  account: Account
  stats: TradingStats | null
  onClose: () => void
}) {
  const { user } = useAuth()
  const certRef = { current: null as HTMLDivElement | null }

  const handleDownload = async () => {
    const el = certRef.current
    if (!el) return

    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(el, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `ProFundX-Certificate-${account.id.slice(0, 8)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      // Fallback: open print dialog
      window.print()
    }
  }

  const passedDate = account.passedAt
    ? new Date(account.passedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

  const traderName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.email || 'Trader'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{ maxWidth: 700, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Certificate Card */}
        <div
          ref={(el) => { certRef.current = el }}
          style={{
            background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            borderRadius: 20,
            padding: 40,
            border: '2px solid #fbbf24',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Gold corner decorations */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: 80, height: 80,
            borderTop: '3px solid #fbbf24', borderLeft: '3px solid #fbbf24',
            borderTopLeftRadius: 20,
          }} />
          <div style={{
            position: 'absolute', top: 0, right: 0, width: 80, height: 80,
            borderTop: '3px solid #fbbf24', borderRight: '3px solid #fbbf24',
            borderTopRightRadius: 20,
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, width: 80, height: 80,
            borderBottom: '3px solid #fbbf24', borderLeft: '3px solid #fbbf24',
            borderBottomLeftRadius: 20,
          }} />
          <div style={{
            position: 'absolute', bottom: 0, right: 0, width: 80, height: 80,
            borderBottom: '3px solid #fbbf24', borderRight: '3px solid #fbbf24',
            borderBottomRightRadius: 20,
          }} />

          {/* Content */}
          <div style={{ textAlign: 'center', position: 'relative' }}>
            {/* Logo */}
            <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6', marginBottom: 4 }}>
              ProFundX
            </div>
            <div style={{
              fontSize: 10, color: '#fbbf24', textTransform: 'uppercase',
              letterSpacing: 4, marginBottom: 24,
            }}>
              Certificate of Achievement
            </div>

            {/* Trophy */}
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏆</div>

            {/* Title */}
            <div style={{
              fontSize: 13, color: '#94a3b8', marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: 2,
            }}>
              This is to certify that
            </div>

            {/* Trader Name */}
            <div style={{
              fontSize: 28, fontWeight: 800, color: '#fff',
              marginBottom: 8,
              background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {traderName}
            </div>

            {/* Achievement */}
            <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24, lineHeight: 1.6 }}>
              Has successfully {account.status === 'funded' ? 'completed the evaluation and received funding' : 'passed the trading challenge'}
              <br />
              on a <strong style={{ color: '#fff' }}>${Number(account.accountSize).toLocaleString()}</strong> account
            </div>

            {/* Stats Row */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 32,
              marginBottom: 28, padding: '16px 0',
              borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b',
            }}>
              {stats && (
                <>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                      {stats.winRate.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Win Rate</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                      ${stats.netPnl.toFixed(0)}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Net Profit</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
                      {stats.totalTrades}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Trades</div>
                  </div>
                </>
              )}
            </div>

            {/* Date & Signature */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 20px' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Date Issued</div>
                <div style={{ fontSize: 13, color: '#e0e0e0', fontWeight: 600 }}>{passedDate}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 14, fontStyle: 'italic', color: '#fbbf24',
                  fontFamily: 'Georgia, serif',
                }}>
                  ProFundX Team
                </div>
                <div style={{ width: 120, height: 1, background: '#374151', margin: '4px auto 0' }} />
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Authorized Signature</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Account ID</div>
                <div style={{ fontSize: 11, color: '#e0e0e0', fontFamily: 'monospace' }}>
                  {account.id.slice(0, 8).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
          <button
            onClick={handleDownload}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📥 Download Certificate
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 28px',
              background: '#1f2937',
              color: '#9ca3af',
              border: '1px solid #374151',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
