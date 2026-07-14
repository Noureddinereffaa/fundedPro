import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'
import { useTranslation } from 'react-i18next'
import { SeoHead } from '../../i18n/SeoHead'
import type { AdminStats } from '../../../shared/types'

export default function AdminDashboardPage() {
  const { t } = useTranslation('admin')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout active="dashboard">
      <SeoHead title="Admin: Dashboard" description="ProFundX admin dashboard — platform overview and statistics." noIndex={true} />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', marginBottom: 24 }}>
        {t('dashboard.title')}
      </h1>

      {loading ? (
        <div style={{ color: '#6b7280', padding: 40 }}>{t('dashboard.loading')}</div>
      ) : stats ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <StatCard
            label={t('dashboard.totalUsers')}
            value={stats.totalUsers.toLocaleString()}
            icon="👥"
            color="#3b82f6"
          />
          <StatCard
            label={t('dashboard.totalAccounts')}
            value={stats.totalAccounts.toLocaleString()}
            icon="📊"
            color="#8b5cf6"
          />
          <StatCard
            label={t('dashboard.fundedAccounts')}
            value={stats.fundedAccounts.toLocaleString()}
            icon="💰"
            color="#22c55e"
          />
          <StatCard
            label={t('dashboard.pendingPayouts')}
            value={stats.pendingPayouts.toLocaleString()}
            icon="⏳"
            color="#f59e0b"
          />
          <StatCard
            label={t('dashboard.totalRevenue')}
            value={`$${Number(stats.totalRevenue).toLocaleString()}`}
            icon="💎"
            color="#10b981"
          />
        </div>
      ) : (
        <div style={{ color: '#ef4444', padding: 40 }}>{t('dashboard.failed')}</div>
      )}

      <div
        className="admin-dash-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}
      >
        <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937' }}>
          <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 16 }}>
            {t('dashboard.recentActivity')}
          </h3>
          <div style={{ color: '#6b7280', fontSize: 14 }}>{t('dashboard.noActivity')}</div>
        </div>
        <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937' }}>
          <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 16 }}>
            {t('dashboard.quickActions')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <QuickAction href="/admin/users" label={t('dashboard.manageUsers')} />
            <QuickAction href="/admin/accounts" label={t('dashboard.manageAccounts')} />
            <QuickAction href="/admin/payouts" label={t('dashboard.processPayouts')} />
            <QuickAction href="/admin/rules" label={t('dashboard.tradingRules')} />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string
  icon: string
  color: string
}) {
  return (
    <div
      style={{
        background: '#111827',
        borderRadius: 12,
        padding: 20,
        border: '1px solid #1f2937',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  )
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      style={{
        display: 'block',
        padding: '10px 14px',
        background: '#1f2937',
        borderRadius: 8,
        color: '#e0e0e0',
        textDecoration: 'none',
        fontSize: 14,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#374151')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#1f2937')}
    >
      {label} →
    </a>
  )
}