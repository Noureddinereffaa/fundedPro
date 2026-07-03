import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'

interface Account {
  id: string
  accountSize: number
  balance: number
  equity: number
  status: string
  phase: string
  platform: string
  createdAt: string
  user: { id: string; email: string; firstName?: string }
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.getAccounts(page).then(data => {
      setAccounts(data.accounts || [])
      setTotal(data.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.ceil(total / 20)
  const statusColor: Record<string, string> = {
    active: '#22c55e', funded: '#3b82f6', evaluation: '#f59e0b', failed: '#ef4444', passed: '#22c55e',
  }

  return (
    <AdminLayout active="accounts">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>Accounts</h1>
          <span style={{ color: '#6b7280', fontSize: 13 }}>{total} total accounts</span>
        </div>
      </div>

      <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0e17' }}>
                <th style={th}>User</th>
                <th style={th}>Size</th>
                <th style={th}>Balance</th>
                <th style={th}>Equity</th>
                <th style={th}>Phase</th>
                <th style={th}>Status</th>
                <th style={th}>Platform</th>
                <th style={th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={td}>{a.user.email}</td>
                  <td style={{ ...td, fontWeight: 600 }}>${a.accountSize.toLocaleString()}</td>
                  <td style={td}>${Number(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={td}>${Number(a.equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={td}>{a.phase || '-'}</td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      background: `${statusColor[a.status] || '#6b7280'}20`,
                      color: statusColor[a.status] || '#6b7280',
                      textTransform: 'uppercase',
                    }}>{a.status}</span>
                  </td>
                  <td style={td}>{a.platform}</td>
                  <td style={{ ...td, color: '#6b7280' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtn}>Previous</button>
          <span style={{ padding: '8px 16px', color: '#6b7280', fontSize: 13 }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={pageBtn}>Next</button>
        </div>
      )}
    </AdminLayout>
  )
}

const th: React.CSSProperties = { padding: '12px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }
const td: React.CSSProperties = { padding: '10px 14px', color: '#e0e0e0' }
const pageBtn: React.CSSProperties = { padding: '8px 16px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#9ca3af', fontSize: 13, cursor: 'pointer' }
