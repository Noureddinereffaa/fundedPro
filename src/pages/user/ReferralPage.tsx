import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { authApi } from '../../utils/api.ts'
import Layout from '../../components/Layout.tsx'
import { useToast } from '../../contexts/ToastContext.tsx'

interface ReferralStats {
  totalReferrals: number
  activeReferrals: number
  totalEarnings: number
  pendingEarnings: number
  commissionRate: number
  referralCode: string
}

export default function ReferralPage() {
  const { user, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    try {
      const profile = await authApi.getProfile()
      setStats({
        totalReferrals: profile.referralStats?.totalReferrals || 0,
        activeReferrals: profile.referralStats?.activeReferrals || 0,
        totalEarnings: profile.referralStats?.totalEarnings || 0,
        pendingEarnings: profile.referralStats?.pendingEarnings || 0,
        commissionRate: profile.referralStats?.commissionRate || 10,
        referralCode: profile.referralCode || generateCode(user.id),
      })
      setReferrals(profile.referrals || [])
    } catch {}
    setLoading(false)
  }

  const generateCode = (id: string) => 'FP' + id.slice(0, 6).toUpperCase()

  const copyCode = () => {
    navigator.clipboard.writeText(stats?.referralCode || '')
    setCopied(true)
    addToast('Referral code copied!', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = () => {
    const url = `${window.location.origin}/register?ref=${stats?.referralCode}`
    navigator.clipboard.writeText(url)
    addToast('Referral link copied!', 'success')
  }

  if (authLoading || loading) return <Layout><div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div></Layout>

  return (
    <Layout>
      <div style={{ maxWidth: 900 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', marginBottom: 24 }}>Referral Program</h1>

        <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937', marginBottom: 24 }}>
          <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 20 }}>Your Referral Code</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                value={stats?.referralCode || ''}
                readOnly
                style={{
                  flex: 1, padding: '12px 16px', background: '#0a0e17', border: '1px solid #374151',
                  borderRadius: 8, color: '#e0e0e0', fontSize: 18, fontWeight: 700, letterSpacing: 2,
                }}
              />
              <button onClick={copyCode} disabled={copied} style={{
                padding: '12px 20px', background: copied ? '#22c55e' : '#2563eb',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: copied ? 'default' : 'pointer',
              }}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={shareLink} style={{
              padding: '12px 24px', background: '#1f2937', border: '1px solid #374151',
              borderRadius: 8, color: '#e0e0e0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              🔗 Copy Referral Link
            </button>
          </div>

          <div style={{ borderTop: '1px solid #1f2937', paddingTop: 20 }}>
            <h4 style={{ color: '#e0e0e0', fontSize: 14, marginBottom: 12 }}>How it works</h4>
            <ul style={{ color: '#9ca3af', fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
              <li>Share your referral code or link with friends</li>
              <li>When they sign up and purchase an account, you earn <strong style={{ color: '#22c55e' }}>{stats?.commissionRate}%</strong> of their fee</li>
              <li>Earnings are added to your pending balance</li>
              <li>Withdraw earnings once they reach $50</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard label="Total Referrals" value={stats?.totalReferrals || 0} icon="👥" color="#3b82f6" />
          <StatCard label="Active Traders" value={stats?.activeReferrals || 0} icon="📈" color="#22c55e" />
          <StatCard label="Total Earned" value={`$${(stats?.totalEarnings || 0).toLocaleString()}`} icon="💰" color="#f59e0b" />
          <StatCard label="Pending" value={`$${(stats?.pendingEarnings || 0).toLocaleString()}`} icon="⏳" color="#8b5cf6" />
        </div>

        <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #1f2937', fontSize: 14, color: '#e0e0e0', fontWeight: 600 }}>
            Your Referrals
          </div>
          {referrals.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              No referrals yet. Share your code to start earning!
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0a0e17' }}>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Joined</th>
                  <th style={th}>Status</th>
                  <th style={th}>Account</th>
                  <th style={th}>Your Earnings</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid #1f2937' }}>
                    <td style={td}>{r.firstName || '-'} {r.lastName || ''}</td>
                    <td style={td}>{r.email}</td>
                    <td style={td}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td style={td}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11,
                        background: r.status === 'active' ? '#22c55e20' : '#f59e0b20',
                        color: r.status === 'active' ? '#22c55e' : '#f59e0b',
                      }}>{r.status}</span>
                    </td>
                    <td style={td}>{r.accountSize ? `$${r.accountSize.toLocaleString()}` : '-'}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#22c55e' }}>${(r.earnings || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: any; icon: string; color: string }) {
  return (
    <div style={{ background: '#111827', borderRadius: 8, padding: '16px 20', border: '1px solid #1f2937' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }
const td: React.CSSProperties = { padding: '10px 14px', color: '#e0e0e0' }