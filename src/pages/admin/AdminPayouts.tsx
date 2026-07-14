import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../contexts/ToastContext.tsx'
import { SeoHead } from '../../i18n/SeoHead'
import type { Payout } from '../../../shared/types'
import { th, td, actionBtn, pageBtn } from '../../utils/cssConstants.ts'

export default function AdminPayoutsPage() {
  const { t } = useTranslation('admin')
  const { addToast } = useToast()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [txHashInput, setTxHashInput] = useState('')
  const [approveId, setApproveId] = useState<string | null>(null)

  const loadPayouts = () => {
    setLoading(true)
    adminApi.getPayouts(page).then((data) => {
      setPayouts(data.payouts || [])
      setTotal(data.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { loadPayouts() }, [page])

  const handleProcess = async (id: string, status: 'completed' | 'rejected') => {
    setProcessing(id)
    try {
      const txHash = status === 'completed' && txHashInput ? txHashInput.trim() : undefined
      await adminApi.processPayout(id, status, txHash)
      addToast(t('payouts.processed', { status }), 'success')
      setTxHashInput('')
      setApproveId(null)
      loadPayouts()
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to process', 'error')
    } finally { setProcessing(null) }
  }

  const totalPages = Math.ceil(total / 20)
  const statusColor: Record<string, string> = {
    pending: '#f59e0b', completed: '#22c55e', rejected: '#ef4444',
  }

  const filtered = statusFilter ? payouts.filter((p) => p.status === statusFilter) : payouts

  return (
    <AdminLayout active="payouts">
      <SeoHead title="Admin: Payouts" description="Manage ProFundX payout requests and processing." noIndex={true} />
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>{t('payouts.title')}</h1>
          <span style={{ color: '#6b7280', fontSize: 13 }}>{t('payouts.totalRequests', { count: total })}</span>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '6px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0', fontSize: 13 }}>
          <option value="">{t('payouts.allStatus')}</option>
          <option value="pending">{t('payouts.pending')}</option>
          <option value="completed">{t('payouts.completed')}</option>
          <option value="rejected">{t('payouts.rejected')}</option>
        </select>
      </div>

      <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('payouts.loading')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('payouts.noRequests')}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0e17' }}>
                <th style={th}>{t('payouts.user')}</th>
                <th style={th}>{t('payouts.account')}</th>
                <th style={th}>{t('payouts.amount')}</th>
                <th style={th}>{t('payouts.method')}</th>
                <th style={th}>{t('payouts.wallet')}</th>
                <th style={th}>{t('payouts.txHash')}</th>
                <th style={th}>{t('payouts.status')}</th>
                <th style={th}>{t('payouts.requested')}</th>
                <th style={th}>{t('payouts.processed')}</th>
                <th style={th}>{t('payouts.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={td}>{p.user.email}</td>
                  <td style={td}>${p.account.accountSize.toLocaleString()}</td>
                  <td style={{ ...td, fontWeight: 600, color: '#22c55e' }}>${Number(p.amount).toFixed(2)}</td>
                  <td style={{ ...td, color: '#9ca3af', fontSize: 11 }}>{p.method || '—'}</td>
                  <td style={{ ...td, color: '#9ca3af', fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.walletAddress}>{p.walletAddress || '—'}</td>
                  <td style={{ ...td, fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.txHash}>{p.txHash || '—'}</td>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      background: `${statusColor[p.status] || '#6b7280'}20`, color: statusColor[p.status] || '#6b7280', textTransform: 'uppercase' }}>{p.status}</span>
                  </td>
                  <td style={{ ...td, color: '#6b7280' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={{ ...td, color: '#6b7280' }}>{p.processedAt ? new Date(p.processedAt).toLocaleDateString() : '-'}</td>
                  <td style={td}>
                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {approveId === p.id ? (
                          <>
                            <input value={txHashInput} onChange={(e) => setTxHashInput(e.target.value)}
                              placeholder={t('payouts.txHashPlaceholder')}
                              style={{ padding: '4px 8px', background: '#0a0e17', border: '1px solid #374151', borderRadius: 4, color: '#e0e0e0', fontSize: 11, width: 180 }} />
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button disabled={processing === p.id} onClick={() => handleProcess(p.id, 'completed')}
                                style={{ ...actionBtn, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}>{t('payouts.confirm')}</button>
                              <button onClick={() => { setApproveId(null); setTxHashInput('') }}
                                style={{ ...actionBtn, background: '#1f2937', color: '#9ca3af', border: '1px solid #374151' }}>{t('payouts.cancel')}</button>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => setApproveId(p.id)}
                              style={{ ...actionBtn, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}>{t('payouts.approve')}</button>
                            <button disabled={processing === p.id} onClick={() => handleProcess(p.id, 'rejected')}
                              style={{ ...actionBtn, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>{t('payouts.reject')}</button>
                          </div>
                        )}
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
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pageBtn}>{t('payouts.previous')}</button>
          <span style={{ padding: '8px 16px', color: '#6b7280', fontSize: 13 }}>{t('payouts.pageOf', { page, totalPages })}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={pageBtn}>{t('payouts.next')}</button>
        </div>
      )}
    </AdminLayout>
  )
}