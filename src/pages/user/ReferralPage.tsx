import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { authApi } from '../../utils/api.ts'
import { useTranslation } from 'react-i18next'
import Layout from '../../components/Layout.tsx'
import { useToast } from '../../contexts/ToastContext.tsx'
import { SeoHead } from '../../i18n/SeoHead'
import type { ReferralStats } from '../../../shared/types'
import { th, td } from '../../utils/cssConstants.ts'

export default function ReferralPage() {
  const { t } = useTranslation('common')
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

  if (authLoading || loading)
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('actions.loading')}</div>
      </Layout>
    )

  return (
    <Layout>
      <SeoHead title="Referral Program" description="Earn rewards by referring traders to ProFundX." />
      <div style={{ maxWidth: 900 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', marginBottom: 24 }}>
          {t('referral.title')}
        </h1>

        <div
          style={{
            background: '#111827',
            borderRadius: 12,
            padding: 24,
            border: '1px solid #1f2937',
            marginBottom: 24,
          }}
        >
          <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 20 }}>{t('referral.yourCode')}</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                value={stats?.referralCode || ''}
                readOnly
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#0a0e17',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  color: '#e0e0e0',
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 2,
                }}
              />
              <button
                onClick={copyCode}
                disabled={copied}
                style={{
                  padding: '12px 20px',
                  background: copied ? '#22c55e' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: copied ? 'default' : 'pointer',
                }}
              >
                {copied ? t('referral.copied') : t('referral.copy')}
              </button>
            </div>
            <button
              onClick={shareLink}
              style={{
                padding: '12px 24px',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 8,
                color: '#e0e0e0',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              🔗 {t('referral.copyLink')}
            </button>
          </div>

          <div style={{ borderTop: '1px solid #1f2937', paddingTop: 20 }}>
            <h4 style={{ color: '#e0e0e0', fontSize: 14, marginBottom: 12 }}>{t('referral.howItWorks')}</h4>
            <ul style={{ color: '#9ca3af', fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
              <li>{t('referral.step1')}</li>
              <li>{t('referral.step2', { rate: stats?.commissionRate || 10 })}</li>
              <li>{t('referral.step3')}</li>
              <li>{t('referral.step4')}</li>
            </ul>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <StatCard label={t('referral.totalReferrals')} value={stats?.totalReferrals || 0} icon="👥" color="#3b82f6" />
          <StatCard label={t('referral.activeTraders')} value={stats?.activeReferrals || 0} icon="📈" color="#22c55e" />
          <StatCard
            label={t('referral.totalEarned')}
            value={`$${(stats?.totalEarnings || 0).toLocaleString()}`}
            icon="💰"
            color="#f59e0b"
          />
          <StatCard
            label={t('referral.pending')}
            value={`$${(stats?.pendingEarnings || 0).toLocaleString()}`}
            icon="⏳"
            color="#8b5cf6"
          />
        </div>

        <div
          className="table-wrap"
          style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflowX: 'auto' }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: '1px solid #1f2937',
              fontSize: 14,
              color: '#e0e0e0',
              fontWeight: 600,
            }}
          >
            {t('referral.yourReferrals')}
          </div>
          {referrals.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              {t('referral.noReferrals')}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0a0e17' }}>
                  <th style={th}>{t('referral.name')}</th>
                  <th style={th}>{t('referral.email')}</th>
                  <th style={th}>{t('referral.joined')}</th>
                  <th style={th}>{t('referral.status')}</th>
                  <th style={th}>{t('referral.account')}</th>
                  <th style={th}>{t('referral.earnings')}</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #1f2937' }}>
                    <td style={td}>
                      {r.firstName || '-'} {r.lastName || ''}
                    </td>
                    <td style={td}>{r.email}</td>
                    <td style={td}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td style={td}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          background: r.status === 'active' ? '#22c55e20' : '#f59e0b20',
                          color: r.status === 'active' ? '#22c55e' : '#f59e0b',
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={td}>{r.accountSize ? `$${r.accountSize.toLocaleString()}` : '-'}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#22c55e' }}>
                      ${(r.earnings || 0).toFixed(2)}
                    </td>
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

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: string
  color: string
}) {
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