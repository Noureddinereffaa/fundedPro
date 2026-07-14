import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../contexts/ToastContext.tsx'
import { SeoHead } from '../../i18n/SeoHead'
import type { User } from '../../../shared/types'
import { th, td, editBtn, pageBtn } from '../../utils/cssConstants.ts'

type AdminUser = User & { _count: { accounts: number }; kycStatus: string }

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

export default function AdminUsersPage() {
  const { t } = useTranslation('admin')
  const { addToast } = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editData, setEditData] = useState({ role: '', kycStatus: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    adminApi.getUsers(page).then((data) => {
      setUsers(data.users || [])
      setTotal(data.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.ceil(total / 20)

  const openEdit = (u: AdminUser) => {
    setEditUser(u)
    setEditData({ role: u.role, kycStatus: u.kycStatus })
  }

  const saveEdit = async () => {
    if (!editUser) return
    setSaving(true)
    try {
      await adminApi.updateUser(editUser.id, editData)
      addToast('User updated', 'success')
      setUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, ...editData } : u))
      setEditUser(null)
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to update', 'error')
    } finally { setSaving(false) }
  }

  return (
    <AdminLayout active="users">
      <SeoHead title="Admin: Users" description="Manage ProFundX users and roles." noIndex={true} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>{t('users.title')}</h1>
          <span style={{ color: '#6b7280', fontSize: 13 }}>{t('users.totalUsers', { count: total })}</span>
        </div>
      </div>

      <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('users.loading')}</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('users.noUsers')}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0e17' }}>
                <th style={th}>{t('users.email')}</th>
                <th style={th}>{t('users.name')}</th>
                <th style={th}>{t('users.role')}</th>
                <th style={th}>{t('users.kyc')}</th>
                <th style={th}>{t('users.accounts')}</th>
                <th style={th}>{t('users.joined')}</th>
                <th style={th}>{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
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
                  <td style={{ ...td, color: '#6b7280' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                  <td style={td}>
                    <button style={editBtn} onClick={() => openEdit(u)}>{t('users.edit')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pageBtn}>{t('users.previous')}</button>
          <span style={{ padding: '8px 16px', color: '#6b7280', fontSize: 13 }}>{t('users.pageOf', { page, totalPages })}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={pageBtn}>{t('users.next')}</button>
        </div>
      )}

      {editUser && (
        <div style={modalOverlay} onClick={() => setEditUser(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 16px' }}>{t('users.editTitle')}</h3>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>{editUser.email}</p>

            <label style={labelStyle}>{t('users.role')}</label>
            <select style={selectStyle} value={editData.role} onChange={(e) => setEditData((d) => ({ ...d, role: e.target.value }))}>
              <option value="user">{t('users.roleUser')}</option>
              <option value="admin">{t('users.roleAdmin')}</option>
            </select>

            <label style={labelStyle}>{t('users.kyc')}</label>
            <select style={selectStyle} value={editData.kycStatus} onChange={(e) => setEditData((d) => ({ ...d, kycStatus: e.target.value }))}>
              <option value="none">{t('users.kycNone')}</option>
              <option value="pending">{t('users.kycPending')}</option>
              <option value="verified">{t('users.kycVerified')}</option>
              <option value="rejected">{t('users.kycRejected')}</option>
            </select>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditUser(null)}
                style={{ ...editBtn, color: '#6b7280' }}>{t('users.cancel')}</button>
              <button onClick={saveEdit} disabled={saving}
                style={{ ...editBtn, background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f640' }}>
                {saving ? t('users.saving') : t('users.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}