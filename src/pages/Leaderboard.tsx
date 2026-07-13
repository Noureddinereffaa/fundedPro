import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout.tsx'
import { Trophy, TrendingUp, DollarSign, Users, Medal, ChevronUp, Globe } from 'lucide-react'

interface LeaderEntry {
  displayName: string
  country: string | null
  totalProfit: number
  profitPct: number
  totalTrades: number
  accountSize: number
  status: string
  phase: string | null
}

interface PayoutEntry {
  displayName: string
  country: string | null
  amount: number
  date: string
}

interface LeaderboardData {
  leaderboard: LeaderEntry[]
  topPayouts: PayoutEntry[]
  stats: {
    totalTraders: number
    totalPayouts: number
    totalFunded: number
  }
}

const FLAG_MAP: Record<string, string> = {
  US: '🇺🇸', UK: '🇬🇧', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', SA: '🇸🇦', AE: '🇦🇪',
  EG: '🇪🇬', MA: '🇲🇦', TR: '🇹🇷', IN: '🇮🇳', BR: '🇧🇷', NG: '🇳🇬', JP: '🇯🇵',
  KR: '🇰🇷', AU: '🇦🇺', CA: '🇨🇦', MX: '🇲🇽', ZA: '🇿🇦', PH: '🇵🇭', ID: '🇮🇩',
  TH: '🇹🇭', VN: '🇻🇳', PK: '🇵🇰', BD: '🇧🇩', MY: '🇲🇾', SG: '🇸🇬', NL: '🇳🇱',
  IT: '🇮🇹', ES: '🇪🇸', PT: '🇵🇹', PL: '🇵🇱', RO: '🇷🇴', UA: '🇺🇦', RU: '🇷🇺',
  DZ: '🇩🇿', TN: '🇹🇳', IQ: '🇮🇶', JO: '🇯🇴', KW: '🇰🇼', QA: '🇶🇦', BH: '🇧🇭',
  OM: '🇴🇲', LB: '🇱🇧', LY: '🇱🇾', SD: '🇸🇩', YE: '🇾🇪',
}

function getFlag(country: string | null) {
  if (!country) return '🌍'
  const code = country.toUpperCase().trim()
  return FLAG_MAP[code] || '🌍'
}

function getRankBadge(rank: number) {
  if (rank === 1) return { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', icon: '🥇' }
  if (rank === 2) return { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)', icon: '🥈' }
  if (rank === 3) return { color: '#cd7f32', bg: 'rgba(205,127,50,0.1)', border: 'rgba(205,127,50,0.3)', icon: '🥉' }
  return { color: '#6b7280', bg: 'transparent', border: 'transparent', icon: '' }
}

export default function LeaderboardPage() {
  const { t } = useTranslation('common')
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'traders' | 'payouts'>('traders')

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'https://profundx.com/api'}/leaderboard`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            marginBottom: 16, boxShadow: '0 8px 32px rgba(251,191,36,0.3)'
          }}>
            <Trophy style={{ width: 32, height: 32, color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
            Leaderboard
          </h1>
          <p style={{ color: '#6b7280', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
            Top performing traders on Pro FundX. Rise to the top and showcase your trading skills.
          </p>
        </div>

        {/* Platform Stats */}
        {data && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16, marginBottom: 40
          }}>
            {[
              { label: 'Total Traders', value: data.stats.totalTraders.toLocaleString(), icon: Users, color: '#3b82f6' },
              { label: 'Total Payouts', value: `$${data.stats.totalPayouts.toLocaleString()}`, icon: DollarSign, color: '#10b981' },
              { label: 'Funded Accounts', value: data.stats.totalFunded.toLocaleString(), icon: Medal, color: '#f59e0b' },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: '#111827', borderRadius: 12, padding: '20px 24px',
                border: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: 16,
                transition: 'border-color 0.2s',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: `${stat.color}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <stat.icon style={{ width: 22, height: 22, color: stat.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#111827', borderRadius: 10, padding: 4 }}>
          {(['traders', 'payouts'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
                background: tab === t ? '#1f2937' : 'transparent',
                color: tab === t ? '#fff' : '#6b7280',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {t === 'traders' ? '🏆 Top Traders' : '💰 Biggest Payouts'}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="app-spinner" />
          </div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
            Failed to load leaderboard data
          </div>
        ) : tab === 'traders' ? (
          <div style={{
            background: '#111827', borderRadius: 16, border: '1px solid #1f2937',
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '60px 1fr 120px 120px 100px',
              padding: '14px 20px', background: '#0d1117', fontSize: 11,
              fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const,
              letterSpacing: '0.05em', borderBottom: '1px solid #1f2937',
            }}>
              <div>Rank</div>
              <div>Trader</div>
              <div style={{ textAlign: 'right' }}>Profit</div>
              <div style={{ textAlign: 'right' }}>ROI</div>
              <div style={{ textAlign: 'right' }}>Trades</div>
            </div>

            {data.leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
                <Trophy style={{ width: 40, height: 40, color: '#374151', margin: '0 auto 12px' }} />
                <p>No traders on the leaderboard yet. Be the first!</p>
              </div>
            ) : (
              data.leaderboard.map((entry, i) => {
                const rank = i + 1
                const badge = getRankBadge(rank)
                return (
                  <div
                    key={i}
                    style={{
                      display: 'grid', gridTemplateColumns: '60px 1fr 120px 120px 100px',
                      padding: '16px 20px', alignItems: 'center',
                      borderBottom: '1px solid #1a1f2e',
                      background: rank <= 3 ? badge.bg : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1a1f2e')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = rank <= 3 ? badge.bg : 'transparent')}
                  >
                    <div>
                      {rank <= 3 ? (
                        <span style={{ fontSize: 22 }}>{badge.icon}</span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, borderRadius: 8, background: '#1f2937',
                          fontSize: 13, fontWeight: 700, color: '#6b7280',
                        }}>
                          {rank}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, #1e3a5f, #1f2937)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                      }}>
                        {getFlag(entry.country)}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                          {entry.displayName}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          ${entry.accountSize.toLocaleString()} Account
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: 14, fontWeight: 700,
                        color: entry.totalProfit >= 0 ? '#10b981' : '#ef4444',
                      }}>
                        {entry.totalProfit >= 0 ? '+' : ''}${entry.totalProfit.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 6,
                        background: entry.profitPct >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: entry.profitPct >= 0 ? '#10b981' : '#ef4444',
                        fontSize: 13, fontWeight: 600,
                      }}>
                        <ChevronUp style={{
                          width: 14, height: 14,
                          transform: entry.profitPct < 0 ? 'rotate(180deg)' : 'none',
                        }} />
                        {Math.abs(entry.profitPct).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 14, color: '#9ca3af' }}>
                      {entry.totalTrades}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          /* Top Payouts Tab */
          <div style={{
            background: '#111827', borderRadius: 16, border: '1px solid #1f2937',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '60px 1fr 150px 140px',
              padding: '14px 20px', background: '#0d1117', fontSize: 11,
              fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const,
              letterSpacing: '0.05em', borderBottom: '1px solid #1f2937',
            }}>
              <div>#</div>
              <div>Trader</div>
              <div style={{ textAlign: 'right' }}>Payout Amount</div>
              <div style={{ textAlign: 'right' }}>Date</div>
            </div>

            {data.topPayouts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
                <DollarSign style={{ width: 40, height: 40, color: '#374151', margin: '0 auto 12px' }} />
                <p>No payouts yet. Complete a challenge and be the first!</p>
              </div>
            ) : (
              data.topPayouts.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid', gridTemplateColumns: '60px 1fr 150px 140px',
                    padding: '16px 20px', alignItems: 'center',
                    borderBottom: '1px solid #1a1f2e',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#1a1f2e')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: 8, background: '#1f2937',
                      fontSize: 13, fontWeight: 700, color: '#6b7280',
                    }}>
                      {i + 1}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'linear-gradient(135deg, #065f46, #1f2937)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16,
                    }}>
                      {getFlag(entry.country)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                      {entry.displayName}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>
                      ${entry.amount.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: '#6b7280' }}>
                    {new Date(entry.date).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
