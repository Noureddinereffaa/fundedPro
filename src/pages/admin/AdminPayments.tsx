import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../contexts/ToastContext.tsx'
import { SeoHead } from '../../i18n/SeoHead'
import type { Payment } from '../../../shared/types'
import { th, td, actionBtn, pageBtn } from '../../utils/cssConstants.ts'

export default function AdminPaymentsPage() {
  const { t } = useTranslation('admin')
  const { addToast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const loadPayments = () => {
    setLoading(true)
    adminApi
      .getPayments(page)
      .then((data) => {
        setPayments(data.payments || [])
        setTotal(data.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPayments()
  }, [page])

  const handleApprove = async (id: string, status: 'approved' | 'rejected') => {
    setProcessing(id)
    try {
      const result = await adminApi.approvePayment(id, status)
      if (status === 'approved' && result?.account) {
        addToast(
          t('payments.approvedSuccess', { size: result.account.accountSize, login: result.account.login }),
          'success',
        )
      } else {
        addToast(t('payments.statusChanged', { status }), 'success')
      }
      loadPayments()
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setProcessing(null)
    }
  }

  const totalPages = Math.ceil(total / 20)
  const statusColor: Record<string, string> = {
    pending: '#f59e0b',
    approved: '#22c55e',
    completed: '#22c55e',
    rejected: '#ef4444',
  }

  return (
    <AdminLayout active="payments">
      <SeoHead title="Admin: Payments" description="Manage ProFundX payments and transactions." noIndex={true} />
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>{t('payments.title')}</h1>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{t('payments.totalPayments', { count: total })}</span>
      </div>

      <div
        style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflowX: 'auto' }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('payments.loading')}</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('payments.noPayments')}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0e17' }}>
                <th style={thOverride}>{t('payments.user')}</th>
                <th style={thOverride}>{t('payments.amount')}</th>
                <th style={thOverride}>{t('payments.network')}</th>
                <th style={thOverride}>{t('payments.txHash')}</th>
                <th style={thOverride}>{t('payments.status')}</th>
                <th style={thOverride}>{t('payments.date')}</th>
                <th style={thOverride}>{t('payments.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={tdOverride}>{p.user.email}</td>
                  <td style={{ ...tdOverride, fontWeight: 600, color: '#22c55e' }}>
                    ${Number(p.amount).toFixed(2)}
                  </td>
                  <td style={tdOverride}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        background: '#2563eb20',
                        color: '#3b82f6',
                      }}
                    >
                      {p.network || 'BTC'}
                    </span>
                  </td>
                  <td
                    style={{
                      ...tdOverride,
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'monospace',
                      fontSize: 11,
                    }}
                  >
                    {p.txHash || <span style={{ color: '#f59e0b' }}>{t('payments.pending')}</span>}
                  </td>
                  <td style={tdOverride}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        background: `${statusColor[p.status] || '#6b7280'}20`,
                        color: statusColor[p.status] || '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td style={{ ...tdOverride, color: '#6b7280' }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td style={tdOverride}>
                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          disabled={processing === p.id}
                          onClick={() => handleApprove(p.id, 'approved')}
                          style={{
                            ...actionBtn,
                            background: '#22c55e20',
                            color: '#22c55e',
                            border: '1px solid #22c55e40',
                          }}
                        >
                          {t('payments.approve')}
                        </button>
                        <button
                          disabled={processing === p.id}
                          onClick={() => handleApprove(p.id, 'rejected')}
                          style={{
                            ...actionBtn,
                            background: '#ef444420',
                            color: '#ef4444',
                            border: '1px solid #ef444440',
                          }}
                        >
                          {t('payments.reject')}
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
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pageBtn}>
            {t('payments.previous')}
          </button>
          <span style={{ padding: '8px 16px', color: '#6b7280', fontSize: 13 }}>
            {t('payments.pageOf', { page, totalPages })}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={pageBtn}>
            {t('payments.next')}
          </button>
        </div>
      )}
    </AdminLayout>
  )
}

const thOverride: CSSProperties = { ...th, fontWeight: 600, padding: '12px 16px' }
const tdOverride: CSSProperties = { ...td, padding: '12px 16px' }