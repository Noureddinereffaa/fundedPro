import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.tsx'
import { accountApi, riskApi } from '../utils/api.ts'
import Layout from '../components/Layout.tsx'
import { useRealtimePrices, useLivePrice } from '../utils/useRealtime.ts'
import { EquityChart } from '../components/EquityChart.tsx'
import type { Account, RiskStatus } from '../../shared/types'

const TICKER_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT']

export default function DashboardPage() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation('dashboard')
  const [accounts, setAccounts] = useState<Account[]>([])
  // Risk map: { [accountId]: RiskStatus } — loaded in ONE batch request
  const [riskMap, setRiskMap] = useState<Record<string, RiskStatus>>({})
  const [loading, setLoading] = useState(true)
  const lang = i18n.language
  useRealtimePrices(TICKER_SYMBOLS)

  const loadData = useCallback(async () => {
    try {
      const [accountsResult, riskResult] = await Promise.allSettled([
        accountApi.getAll(),
        riskApi.getBatch(),
      ])

      if (accountsResult.status === 'fulfilled') {
        setAccounts(accountsResult.value.data || [])
      }
      if (riskResult.status === 'fulfilled') {
        setRiskMap(riskResult.value || {})
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <Layout>
      <div className="dash-page" style={{ maxWidth: 1200 }}>
        {/* Live Ticker */}
        <div
          className="dash-ticker"
          style={{
            background: '#111827',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 20,
            border: '1px solid #1f2937',
            overflow: 'hidden',
          }}
        >
          <div
            className="dash-ticker-inner"
            style={{ display: 'flex', gap: 24, alignItems: 'center', whiteSpace: 'nowrap' }}
          >
            {TICKER_SYMBOLS.map((sym) => (
              <TickerItem key={sym} sym={sym} />
            ))}
          </div>
        </div>

        {/* Header */}
        <div
          className="dash-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>
              {t('welcomeBack')}{user?.firstName ? `, ${user.firstName}` : ''}
            </h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 14 }}>{t('manageAccounts')}</p>
          </div>
          <Link
            to={`/${lang}/pricing`}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {t('getNewAccount')}
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>{t('loadingAccounts')}</div>
        ) : accounts.length === 0 ? (
          <div
            className="dash-empty"
            style={{
              textAlign: 'center',
              padding: 60,
              background: '#111827',
              borderRadius: 12,
              border: '1px solid #1f2937',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h2 style={{ color: '#e0e0e0', fontSize: 20, marginBottom: 8 }}>{t('noAccountsTitle')}</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>{t('noAccountsDesc')}</p>
            <Link
              to={`/${lang}/pricing`}
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                background: '#2563eb',
                color: '#fff',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {t('viewPlans')}
            </Link>
          </div>
        ) : (
          <>
            <div
              className="dash-cards"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: 16,
              }}
            >
              {accounts.map((account) => (
                // Pass pre-fetched risk data — no per-card API call needed
                <AccountCard key={account.id} account={account} risk={riskMap[account.id] ?? null} />
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <EquityChart accountId={accounts[0]?.id} />
            </div>
            <LeaderboardWidget />
          </>
        )}
      </div>
    </Layout>
  )
}

// ── AccountCard ──────────────────────────────────────────────────────────────
// Receives risk as a prop (no internal fetch) — eliminates N+1 requests.
function AccountCard({ account, risk }: { account: Account; risk: RiskStatus | null }) {
  const { t, i18n } = useTranslation('dashboard')
  const lang = i18n.language

  const statusColor: Record<string, string> = {
    active:     '#22c55e',
    funded:     '#3b82f6',
    evaluation: '#f59e0b',
    failed:     '#ef4444',
    passed:     '#22c55e',
  }

  return (
    <div
      onClick={() => (window.location.href = `/${lang}/account/${account.id}`)}
      style={{ textDecoration: 'none', cursor: 'pointer' }}
    >
      <div
        style={{
          background: '#111827',
          borderRadius: 12,
          border: '1px solid #1f2937',
          padding: 20,
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1f2937')}
      >
        {/* Top row */}
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e0e0e0' }}>
              ${account.accountSize.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{account.platform}</div>
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: `${statusColor[account.status] || '#6b7280'}20`,
              color: statusColor[account.status] || '#6b7280',
              textTransform: 'uppercase',
            }}
          >
            {account.phase || account.status}
          </span>
        </div>

        {/* Balance / Equity + Trade button */}
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{t('balanceLabel')}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0' }}>
                ${Number(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{t('equityLabel')}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0' }}>
                ${Number(account.equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <Link
            to={`/${lang}/trade/${account.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '6px 12px',
              background: '#2563eb',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {t('trade')}
          </Link>
        </div>

        {/* Risk info from batch response */}
        {risk && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1f2937' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{t('dailyPnl')}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: Number(risk.dailyPnl) >= 0 ? '#22c55e' : '#ef4444',
                }}
              >
                ${risk.dailyPnl} ({risk.dailyLossPercent}%)
              </span>
            </div>
            {risk.profitTargetProgress && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{t('targetProgress')}</span>
                  <span style={{ fontSize: 12, color: '#3b82f6' }}>{risk.profitTargetProgress}%</span>
                </div>
                <div style={{ height: 4, background: '#1f2937', borderRadius: 2 }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 2,
                      background: '#3b82f6',
                      width: `${Math.min(Number(risk.profitTargetProgress), 100)}%`,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
              {t('openPositions')}: {risk.openPositions}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── TickerItem ───────────────────────────────────────────────────────────────
function TickerItem({ sym }: { sym: string }) {
  const p = useLivePrice(sym)
  if (!p) return <span style={{ color: '#4b5563' }}>{sym}: —</span>
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ color: '#9ca3af', fontWeight: 500 }}>{sym}</span>
      <span
        style={{
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: '#e0e0e0',
        }}
      >
        {p.price.toFixed(sym.includes('JPY') ? 3 : sym.includes('BTC') ? 2 : 5)}
      </span>
    </span>
  )
}

// ── LeaderboardWidget ────────────────────────────────────────────────────────
function LeaderboardWidget() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [top, setTop] = useState<{ displayName: string; totalProfit: number; profitPct: number }[]>([])

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'https://profundx.com/api'}/leaderboard`)
      .then((r) => r.json())
      .then((d) => setTop((d.leaderboard || []).slice(0, 5)))
      .catch(() => {})
  }, [])

  if (top.length === 0) return null

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div
      style={{
        marginTop: 20,
        background: '#111827',
        borderRadius: 12,
        border: '1px solid #1f2937',
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>🏆 Top Traders</h3>
        <Link
          to={`/${lang}/leaderboard`}
          style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}
        >
          View All →
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {top.map((t, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 8,
              background: i < 3 ? 'rgba(59,130,246,0.05)' : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: i < 3 ? 18 : 13, width: 24, textAlign: 'center', color: '#6b7280', fontWeight: 700 }}>
                {i < 3 ? medals[i] : i + 1}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#e0e0e0' }}>{t.displayName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>
                +${t.totalProfit.toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(16,185,129,0.1)',
                  color: '#10b981',
                  fontWeight: 600,
                }}
              >
                {t.profitPct.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
