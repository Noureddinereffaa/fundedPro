import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'

interface Stats {
  totalUsers: number
  totalAccounts: number
  fundedAccounts: number
  pendingPayouts: number
  totalRevenue: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout active="dashboard">
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', marginBottom: 24 }}>Admin Dashboard</h1>

      {loading ? (
        <div style={{ color: '#6b7280', padding: 40 }}>Loading...</div>
      ) : stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} icon="👥" color="#3b82f6" />
          <StatCard label="Total Accounts" value={stats.totalAccounts.toLocaleString()} icon="📊" color="#8b5cf6" />
          <StatCard label="Funded Accounts" value={stats.fundedAccounts.toLocaleString()} icon="💰" color="#22c55e" />
          <StatCard label="Pending Payouts" value={stats.pendingPayouts.toLocaleString()} icon="⏳" color="#f59e0b" />
          <StatCard
            label="Total Revenue"
            value={`$${Number(stats.totalRevenue).toLocaleString()}`}
            icon="💎"
            color="#10b981"
          />
        </div>
      ) : (
        <div style={{ color: '#ef4444', padding: 40 }}>Failed to load stats</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937' }}>
          <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 16 }}>Recent Activity</h3>
          <div style={{ color: '#6b7280', fontSize: 14 }}>No recent activity to display.</div>
        </div>
        <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937' }}>
          <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <QuickAction href="/admin/users" label="Manage Users" />
            <QuickAction href="/admin/accounts" label="Manage Accounts" />
            <QuickAction href="/admin/payouts" label="Process Payouts" />
            <QuickAction href="/admin/rules" label="Trading Rules" />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div style={{
      background: '#111827', borderRadius: 12, padding: 20,
      border: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 10, background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  )
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} style={{
      display: 'block', padding: '10px 14px', background: '#1f2937', borderRadius: 8,
      color: '#e0e0e0', textDecoration: 'none', fontSize: 14, transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = '#374151'}
      onMouseLeave={e => e.currentTarget.style.background = '#1f2937'}
    >
      {label} →
    </a>
  )
}
