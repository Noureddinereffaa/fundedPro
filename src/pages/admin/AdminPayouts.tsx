import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'
import { useToast } from '../../contexts/ToastContext.tsx'

interface Payout {
  id: string
  amount: number
  status: string
  method?: string
  createdAt: string
  processedAt?: string
  user: { email: string }
  account: { accountSize: number }
}

export default function AdminPayoutsPage() {
  const { addToast } = useToast()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const loadPayouts = () => {
    setLoading(true)
    adminApi.getPayouts(page).then(data => {
      setPayouts(data.payouts || [])
      setTotal(data.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { loadPayouts() }, [page])

  const handleProcess = async (id: string, status: 'completed' | 'rejected') => {
    setProcessing(id)
    try {
      await adminApi.processPayout(id, status)
      loadPayouts()
    } catch (err: any) {
      addToast(err.message || 'Failed to process', 'error')
    } finally {
      setProcessing(null)
    }
  }

  const totalPages = Math.ceil(total / 20)
  const statusColor: Record<string, string> = {
    pending: '#f59e0b', completed: '#22c55e', rejected: '#ef4444',
  }

  return (
    <AdminLayout active="payouts">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>Payout Requests</h1>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{total} total requests</span>
      </div>

      <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>
        ) : payouts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No payout requests</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0e17' }}>
                <th style={th}>User</th>
                <th style={th}>Account Size</th>
                <th style={th}>Amount</th>
                <th style={th}>Status</th>
                <th style={th}>Requested</th>
                <th style={th}>Processed</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={td}>{p.user.email}</td>
                  <td style={td}>${p.account.accountSize.toLocaleString()}</td>
                  <td style={{ ...td, fontWeight: 600, color: '#22c55e' }}>${Number(p.amount).toFixed(2)}</td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      background: `${statusColor[p.status] || '#6b7280'}20`,
                      color: statusColor[p.status] || '#6b7280',
                      textTransform: 'uppercase',
                    }}>{p.status}</span>
                  </td>
                  <td style={{ ...td, color: '#6b7280' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={{ ...td, color: '#6b7280' }}>{p.processedAt ? new Date(p.processedAt).toLocaleDateString() : '-'}</td>
                  <td style={td}>
                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          disabled={processing === p.id}
                          onClick={() => handleProcess(p.id, 'completed')}
                          style={{ ...actionBtn, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}
                        >
                          Approve
                        </button>
                        <button
                          disabled={processing === p.id}
                          onClick={() => handleProcess(p.id, 'rejected')}
                          style={{ ...actionBtn, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
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
const actionBtn: React.CSSProperties = { padding: '4px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }
const pageBtn: React.CSSProperties = { padding: '8px 16px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#9ca3af', fontSize: 13, cursor: 'pointer' }
