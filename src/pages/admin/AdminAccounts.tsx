import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../contexts/ToastContext.tsx'
import { th, pageBtn, editBtn } from '../../utils/cssConstants.ts'

const td: React.CSSProperties = { padding: '12px 16px', color: '#e0e0e0' }

const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modalBox: React.CSSProperties = {
  background: '#111827', borderRadius: 12, border: '1px solid #1f2937',
  padding: 24, width: 420, maxWidth: '90vw',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: '#0a0e17', border: '1px solid #374151',
  borderRadius: 6, color: '#e0e0e0', fontSize: 13, marginTop: 4, boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { color: '#9ca3af', fontSize: 12, marginTop: 12, display: 'block' }
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

export default function AdminAccountsPage() {
  const { t } = useTranslation('admin')
  const { addToast } = useToast()
  const [accounts, setAccounts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editAccount, setEditAccount] = useState<any | null>(null)
  const [editData, setEditData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    adminApi.getAccounts(page).then((data) => {
      setAccounts(data.accounts || [])
      setTotal(data.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.ceil(total / 20)
  const statusColor: Record<string, string> = {
    active: '#22c55e', funded: '#3b82f6', evaluation: '#f59e0b', failed: '#ef4444', passed: '#22c55e',
  }

  const fields = ['status', 'phase', 'balance', 'equity', 'leverage', 'maxDailyLoss', 'maxOverallLoss', 'profitTarget']

  const openEdit = (a: any) => {
    setEditAccount(a)
    const data: Record<string, any> = {}
    for (const f of fields) {
      data[f] = a[f] !== undefined && a[f] !== null ? String(a[f]) : ''
    }
    setEditData(data)
  }

  const saveEdit = async () => {
    if (!editAccount) return
    setSaving(true)
    try {
      const payload: Record<string, any> = {}
      for (const f of fields) {
        const v = editData[f]
        if (v !== '' && v !== undefined) {
          payload[f] = ['balance', 'equity', 'maxDailyLoss', 'maxOverallLoss', 'profitTarget'].includes(f) ? Number(v) : v
        }
      }
      await adminApi.updateAccount(editAccount.id, payload)
      addToast('Account updated', 'success')
      setAccounts((prev) => prev.map((a) => a.id === editAccount.id ? { ...a, ...payload } : a))
      setEditAccount(null)
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to update', 'error')
    } finally { setSaving(false) }
  }

  return (
    <AdminLayout active="accounts">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>{t('accounts.title')}</h1>
          <span style={{ color: '#6b7280', fontSize: 13 }}>{t('accounts.totalAccounts', { count: total })}</span>
        </div>
      </div>

      <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('accounts.loading')}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0e17' }}>
                <th style={th}>{t('accounts.user')}</th>
                <th style={th}>{t('accounts.size')}</th>
                <th style={th}>{t('accounts.balance')}</th>
                <th style={th}>{t('accounts.equity')}</th>
                <th style={th}>{t('accounts.phase')}</th>
                <th style={th}>{t('accounts.status')}</th>
                <th style={th}>{t('accounts.platform')}</th>
                <th style={th}>{t('accounts.created')}</th>
                <th style={th}>{t('accounts.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={td}>{a.user?.email || '-'}</td>
                  <td style={{ ...td, fontWeight: 600 }}>${a.accountSize.toLocaleString()}</td>
                  <td style={td}>${Number(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={td}>${Number(a.equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={td}>{a.phase || '-'}</td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      background: `${statusColor[a.status] || '#6b7280'}20`,
                      color: statusColor[a.status] || '#6b7280', textTransform: 'uppercase',
                    }}>{a.status}</span>
                  </td>
                  <td style={td}>{a.platform}</td>
                  <td style={{ ...td, color: '#6b7280' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td style={td}>
                    <button style={editBtn} onClick={() => openEdit(a)}>{t('accounts.edit')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pageBtn}>{t('accounts.previous')}</button>
          <span style={{ padding: '8px 16px', color: '#6b7280', fontSize: 13 }}>{t('accounts.pageOf', { page, totalPages })}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={pageBtn}>{t('accounts.next')}</button>
        </div>
      )}

      {editAccount && (
        <div style={modalOverlay} onClick={() => setEditAccount(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 16px' }}>{t('accounts.editTitle')}</h3>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>{editAccount.user?.email} — ${editAccount.accountSize.toLocaleString()}</p>

            {fields.map((f) => (
              <label key={f} style={labelStyle}>
                {f.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                {f === 'phase' ? (
                  <select style={selectStyle} value={editData[f]} onChange={(e) => setEditData((d) => ({ ...d, [f]: e.target.value }))}>
                    <option value="">—</option>
                    <option value="evaluation_1">{t('rules.phase1')}</option>
                    <option value="evaluation_2">{t('rules.phase2')}</option>
                    <option value="funded">{t('rules.funded')}</option>
                  </select>
                ) : f === 'status' ? (
                  <select style={selectStyle} value={editData[f]} onChange={(e) => setEditData((d) => ({ ...d, [f]: e.target.value }))}>
                    <option value="active">{t('accounts.statusActive')}</option>
                    <option value="evaluation">{t('accounts.statusEvaluation')}</option>
                    <option value="funded">{t('accounts.statusFunded')}</option>
                    <option value="failed">{t('accounts.statusFailed')}</option>
                    <option value="passed">{t('accounts.statusPassed')}</option>
                  </select>
                ) : (
                  <input style={inputStyle} value={editData[f]} onChange={(e) => setEditData((d) => ({ ...d, [f]: e.target.value }))} />
                )}
              </label>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditAccount(null)}
                style={{ ...editBtn, color: '#6b7280' }}>{t('accounts.cancel')}</button>
              <button onClick={saveEdit} disabled={saving}
                style={{ ...editBtn, background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f640' }}>
                {saving ? t('accounts.saving') : t('accounts.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}