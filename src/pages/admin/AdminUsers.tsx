import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  kycStatus: string
  createdAt: string
  _count: { accounts: number }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.getUsers(page).then(data => {
      setUsers(data.users || [])
      setTotal(data.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.ceil(total / 20)

  return (
    <AdminLayout active="users">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>Users</h1>
          <span style={{ color: '#6b7280', fontSize: 13 }}>{total} total users</span>
        </div>
      </div>

      <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No users found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0e17' }}>
                <th style={th}>Email</th>
                <th style={th}>Name</th>
                <th style={th}>Role</th>
                <th style={th}>KYC</th>
                <th style={th}>Accounts</th>
                <th style={th}>Joined</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={td}>{u.email}</td>
                  <td style={td}>{u.firstName || '-'} {u.lastName || ''}</td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      background: u.role === 'admin' ? '#ef444420' : '#1f2937',
                      color: u.role === 'admin' ? '#ef4444' : '#9ca3af',
                    }}>{u.role}</span>
                  </td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      background: u.kycStatus === 'verified' ? '#22c55e20' : u.kycStatus === 'pending' ? '#f59e0b20' : '#1f2937',
                      color: u.kycStatus === 'verified' ? '#22c55e' : u.kycStatus === 'pending' ? '#f59e0b' : '#6b7280',
                    }}>{u.kycStatus}</span>
                  </td>
                  <td style={td}>{u._count.accounts}</td>
                  <td style={{ ...td, color: '#6b7280' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td style={td}>
                    <button style={editBtn}>Edit</button>
                  </td>
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
const editBtn: React.CSSProperties = { padding: '4px 10px', background: '#1f2937', border: '1px solid #374151', borderRadius: 4, color: '#9ca3af', fontSize: 11, cursor: 'pointer' }
const pageBtn: React.CSSProperties = { padding: '8px 16px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#9ca3af', fontSize: 13, cursor: 'pointer' }
