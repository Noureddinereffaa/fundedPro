import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { accountApi, riskApi } from '../utils/api.ts'
import Layout from '../components/Layout.tsx'
import { useRealtimePrices } from '../utils/useRealtime.ts'

interface Account {
  id: string
  accountSize: number
  balance: number
  equity: number
  status: string
  phase: string
  platform: string
  createdAt: string
}

interface RiskStatus {
  dailyPnl: string
  dailyLossPercent: string
  profitTargetProgress: string
  openPositions: number
}

const TICKER_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSDT', 'ETHUSDT', 'DJI', 'NDX', 'SPX']

export default function DashboardPage() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const { prices } = useRealtimePrices(TICKER_SYMBOLS)

  useEffect(() => {
    accountApi.getAll().then(data => {
      setAccounts(data.accounts || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <div style={{ maxWidth: 1200 }}>
        {/* Live Price Ticker */}
        <div style={{ 
          background: '#111827', borderRadius: 8, padding: '10px 16px', marginBottom: 20,
          border: '1px solid #1f2937', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', whiteSpace: 'nowrap' }}>
            {TICKER_SYMBOLS.map(sym => {
              const p = prices[sym]
              if (!p) return <span key={sym} style={{ color: '#4b5563' }}>{sym}: —</span>
              return (
                <span key={sym} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ color: '#9ca3af', fontWeight: 500 }}>{sym}</span>
                  <span style={{
                    fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                    color: '#e0e0e0',
                  }}>
                    {p.price.toFixed(sym.includes('JPY') ? 3 : sym.includes('BTC') ? 2 : 5)}
                  </span>
                </span>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>
              Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
            </h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 14 }}>
              Manage your funded accounts
            </p>
          </div>
          <Link to="/pricing" style={{
            padding: '10px 20px', background: '#2563eb', color: '#fff',
            borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
          }}>
            + Get New Account
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 60, background: '#111827', borderRadius: 12,
            border: '1px solid #1f2937',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h2 style={{ color: '#e0e0e0', fontSize: 20, marginBottom: 8 }}>No accounts yet</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>Start your funded trading journey today</p>
            <Link to="/pricing" style={{
              display: 'inline-block', padding: '12px 28px', background: '#2563eb',
              color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600,
            }}>
              View Plans
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
            {accounts.map(account => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

function AccountCard({ account }: { account: Account }) {
  const [risk, setRisk] = useState<RiskStatus | null>(null)

  useEffect(() => {
    riskApi.getStatus(account.id).then(setRisk).catch(() => {})
  }, [account.id])

  const statusColor: Record<string, string> = {
    active: '#22c55e', funded: '#3b82f6', evaluation: '#f59e0b', failed: '#ef4444', passed: '#22c55e',
  }

  return (
    <Link to={`/account/${account.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#111827', borderRadius: 12, border: '1px solid #1f2937',
        padding: 20, cursor: 'pointer', transition: 'border-color 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#1f2937')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e0e0e0' }}>
              ${account.accountSize.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{account.platform}</div>
          </div>
          <span style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: `${statusColor[account.status] || '#6b7280'}20`,
            color: statusColor[account.status] || '#6b7280',
            textTransform: 'uppercase',
          }}>
            {account.phase || account.status}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Balance</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0' }}>
                ${Number(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Equity</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0' }}>
                ${Number(account.equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          
          <Link 
            to={`/trade/${account.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{ 
              padding: '6px 12px', background: '#2563eb', color: '#fff',
              borderRadius: 6, textDecoration: 'none', fontSize: 12, fontWeight: 600,
            }}
          >
            Trade
          </Link>
        </div>

        {risk && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1f2937' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Daily P&L</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: Number(risk.dailyPnl) >= 0 ? '#22c55e' : '#ef4444' }}>
                ${risk.dailyPnl} ({risk.dailyLossPercent}%)
              </span>
            </div>
            {risk.profitTargetProgress && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Target Progress</span>
                  <span style={{ fontSize: 12, color: '#3b82f6' }}>{risk.profitTargetProgress}%</span>
                </div>
                <div style={{ height: 4, background: '#1f2937', borderRadius: 2 }}>
                  <div style={{
                    height: '100%', borderRadius: 2, background: '#3b82f6',
                    width: `${Math.min(Number(risk.profitTargetProgress), 100)}%`,
                  }} />
                </div>
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
              Open Positions: {risk.openPositions}
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
