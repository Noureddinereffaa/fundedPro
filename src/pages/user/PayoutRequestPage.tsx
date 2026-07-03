import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { accountApi, paymentApi, tradingApi } from '../../utils/api.ts'
import Layout from '../../components/Layout.tsx'
import { useToast } from '../../contexts/ToastContext.tsx'

export default function PayoutRequestPage() {
  const { user, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [maxPayout, setMaxPayout] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [payouts, setPayouts] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      accountApi.getAll().then(data => {
        const fundedAccounts = (data.accounts || []).filter((a: any) => a.status === 'funded')
        setAccounts(fundedAccounts)
        if (fundedAccounts.length > 0) {
          setSelectedAccount(fundedAccounts[0].id)
          loadMaxPayout(fundedAccounts[0].id)
          loadPayoutHistory()
        }
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [user])

  const loadMaxPayout = async (accountId: string) => {
    try {
      const trades = await tradingApi.getHistory(accountId, 1, 1000)
      const totalProfit = trades.trades?.reduce((sum: number, t: any) => sum + Number(t.profit), 0) || 0
      setMaxPayout(totalProfit * 0.8)
    } catch {}
  }

  const loadPayoutHistory = async () => {
    try {
      const history = await paymentApi.getPayouts()
      setPayouts(history || [])
    } catch {}
  }

  const handleSubmit = async () => {
    if (!selectedAccount || !amount) return
    const amt = Number(amount)
    if (amt <= 0) { addToast('Enter a valid amount', 'error'); return }
    if (amt > maxPayout) { addToast(`Maximum available: $${maxPayout.toFixed(2)}`, 'error'); return }

    setSubmitting(true)
    try {
      await paymentApi.requestPayout(selectedAccount, amt)
      addToast('Payout request submitted successfully', 'success')
      setAmount('')
      loadMaxPayout(selectedAccount)
      loadPayoutHistory()
    } catch (err: any) {
      addToast(err.message || 'Failed to submit', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) return <Layout><div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div></Layout>

  return (
    <Layout>
      <div style={{ maxWidth: 700 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', marginBottom: 24 }}>Request Payout</h1>

        {accounts.length === 0 ? (
          <div style={{ background: '#111827', borderRadius: 12, padding: 40, border: '1px solid #1f2937', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
            <h2 style={{ color: '#e0e0e0', fontSize: 18, marginBottom: 8 }}>No Funded Accounts</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>You need a funded account to request payouts.</p>
            <a href="/pricing" style={{ display: 'inline-block', padding: '12px 28px', background: '#2563eb', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>
              Get Funded Account
            </a>
          </div>
        ) : (
          <>
            <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937', marginBottom: 24 }}>
              <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 20 }}>Payout Request</h3>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Account</label>
                <select value={selectedAccount} onChange={e => { setSelectedAccount(e.target.value); loadMaxPayout(e.target.value) }} style={{
                  width: '100%', padding: '10px 12px', background: '#1f2937', border: '1px solid #374151',
                  borderRadius: 6, color: '#e0e0e0', fontSize: 14,
                }}>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      ${a.accountSize.toLocaleString()} - {a.phase || a.status}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Amount (USD)</label>
                <input type="number" step="0.01" min="1" value={amount} onChange={e => setAmount(e.target.value)} style={{
                  width: '100%', padding: '10px 12px', background: '#1f2937', border: '1px solid #374151',
                  borderRadius: 6, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box',
                }} placeholder="0.00" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                  <span style={{ color: '#6b7280' }}>Available for payout: <strong style={{ color: '#22c55e' }}>${maxPayout.toFixed(2)}</strong></span>
                  <span style={{ color: '#6b7280' }}>80% profit split</span>
                </div>
              </div>

              <button onClick={handleSubmit} disabled={submitting || !selectedAccount || !amount || Number(amount) > maxPayout} style={{
                width: '100%', padding: '12px 0', background: submitting ? '#2563eb99' : '#22c55e',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}>
                {submitting ? 'Submitting...' : 'Submit Payout Request'}
              </button>
            </div>

            <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937' }}>
              <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 20 }}>Payout History</h3>
              {payouts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No payout requests yet</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#0a0e17' }}>
                      <th style={th}>Date</th>
                      <th style={th}>Amount</th>
                      <th style={th}>Status</th>
                      <th style={th}>Processed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map(p => (
                      <tr key={p.id} style={{ borderTop: '1px solid #1f2937' }}>
                        <td style={td}>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td style={{ ...td, fontWeight: 600, color: '#22c55e' }}>${Number(p.amount).toFixed(2)}</td>
                        <td style={td}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 11,
                            background: p.status === 'completed' ? '#22c55e20' : p.status === 'rejected' ? '#ef444420' : '#f59e0b20',
                            color: p.status === 'completed' ? '#22c55e' : p.status === 'rejected' ? '#ef4444' : '#f59e0b',
                            textTransform: 'uppercase',
                          }}>{p.status}</span>
                        </td>
                        <td style={{ ...td, color: '#6b7280' }}>{p.processedAt ? new Date(p.processedAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }
const td: React.CSSProperties = { padding: '10px 14px', color: '#e0e0e0' }