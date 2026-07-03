import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'
import { useToast } from '../../contexts/ToastContext.tsx'

interface Payment {
  id: string
  amount: number
  status: string
  method?: string
  walletAddress?: string
  network?: string
  txHash?: string
  createdAt: string
  user: { email: string; firstName?: string; lastName?: string }
  metadata?: any
}

export default function AdminPaymentsPage() {
  const { addToast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const loadPayments = () => {
    setLoading(true)
    adminApi.getPayments(page).then(data => {
      setPayments(data.payments || [])
      setTotal(data.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { loadPayments() }, [page])

  const handleApprove = async (id: string, status: 'approved' | 'rejected') => {
    setProcessing(id)
    try {
      await adminApi.approvePayment(id, status)
      addToast(`Payment ${status}`, 'success')
      loadPayments()
    } catch (err: any) {
      addToast(err.message || 'Failed', 'error')
    } finally {
      setProcessing(null)
    }
  }

  const totalPages = Math.ceil(total / 20)
  const statusColor: Record<string, string> = {
    pending: '#f59e0b', approved: '#22c55e', completed: '#22c55e', rejected: '#ef4444',
  }

  return (
    <AdminLayout active="payments">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>Crypto Payments</h1>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{total} total payments</span>
      </div>

      <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No payments yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0e17' }}>
                <th style={th}>User</th>
                <th style={th}>Amount</th>
                <th style={th}>Network</th>
                <th style={th}>TX Hash</th>
                <th style={th}>Status</th>
                <th style={th}>Date</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={td}>{p.user.email}</td>
                  <td style={{ ...td, fontWeight: 600, color: '#22c55e' }}>${Number(p.amount).toFixed(2)}</td>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#2563eb20', color: '#3b82f6' }}>
                      {p.network || 'BTC'}
                    </span>
                  </td>
                  <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>
                    {p.txHash || <span style={{ color: '#f59e0b' }}>Pending</span>}
                  </td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      background: `${statusColor[p.status] || '#6b7280'}20`,
                      color: statusColor[p.status] || '#6b7280',
                      textTransform: 'uppercase',
                    }}>{p.status}</span>
                  </td>
                  <td style={{ ...td, color: '#6b7280' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={td}>
                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          disabled={processing === p.id}
                          onClick={() => handleApprove(p.id, 'approved')}
                          style={{ ...actionBtn, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}
                        >
                          Approve
                        </button>
                        <button
                          disabled={processing === p.id}
                          onClick={() => handleApprove(p.id, 'rejected')}
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

const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }
const td: React.CSSProperties = { padding: '12px 16px', color: '#e0e0e0' }
const actionBtn: React.CSSProperties = { padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }
const pageBtn: React.CSSProperties = { padding: '8px 16px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0', fontSize: 13, cursor: 'pointer' }
