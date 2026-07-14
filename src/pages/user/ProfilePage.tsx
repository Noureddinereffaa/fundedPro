import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { authApi } from '../../utils/api.ts'
import { useTranslation } from 'react-i18next'
import Layout from '../../components/Layout.tsx'
import { useToast } from '../../contexts/ToastContext.tsx'
import { SeoHead } from '../../i18n/SeoHead'

export default function ProfilePage() {
  const { t } = useTranslation('common')
  const { user, logout } = useAuth()
  const { addToast } = useToast()
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', country: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'account'>('profile')

  useEffect(() => {
    if (user) {
      authApi
        .getProfile()
        .then((profile) => {
          setForm({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            phone: profile.phone || '',
            country: profile.country || '',
          })
        })
        .catch((err) => {
          setForm({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: '',
            country: '',
          })
          console.error(err)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user])

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await authApi.updateProfile(form)
      addToast('Profile updated successfully', 'success')
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      addToast('Passwords do not match', 'error')
      return
    }
    if (passwordForm.new.length < 8) {
      addToast('Password must be at least 8 characters', 'error')
      return
    }
    setPasswordSaving(true)
    try {
      await authApi.changePassword({ currentPassword: passwordForm.current, newPassword: passwordForm.new })
      addToast('Password changed successfully', 'success')
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to change password', 'error')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading)
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('actions.loading')}</div>
      </Layout>
    )

  return (
    <Layout>
      <SeoHead title="Profile Settings" description="Manage your ProFundX profile, preferences, and account settings." />
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', marginBottom: 24 }}>
          {t('profile.title')}
        </h1>

        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 24,
            background: '#111827',
            borderRadius: 8,
            padding: 4,
            border: '1px solid #1f2937',
          }}
        >
          {(['profile', 'security', 'account'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 6,
                border: 'none',
                background: activeTab === tab ? '#2563eb' : 'transparent',
                color: activeTab === tab ? '#fff' : '#9ca3af',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t(`profile.${tab}Tab`)}
            </button>
          ))}
        </div>

        <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937' }}>
          {activeTab === 'profile' && (
            <div>
              <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 20 }}>{t('profile.personalInfo')}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label={t('profile.firstName')} value={form.firstName} onChange={(v) => update('firstName', v)} />
                <Field label={t('profile.lastName')} value={form.lastName} onChange={(v) => update('lastName', v)} />
                <Field label={t('profile.phone')} value={form.phone} onChange={(v) => update('phone', v)} type="tel" />
                <Field label={t('profile.country')} value={form.country} onChange={(v) => update('country', v)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    background: saving ? '#2563eb99' : '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? t('profile.saving') : t('profile.saveChanges')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 20 }}>{t('profile.changePassword')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
                <Field
                  label={t('profile.currentPassword')}
                  value={passwordForm.current}
                  onChange={(v) => setPasswordForm((prev) => ({ ...prev, current: v }))}
                  type="password"
                />
                <Field
                  label={t('profile.newPassword')}
                  value={passwordForm.new}
                  onChange={(v) => setPasswordForm((prev) => ({ ...prev, new: v }))}
                  type="password"
                />
                <Field
                  label={t('profile.confirmNewPassword')}
                  value={passwordForm.confirm}
                  onChange={(v) => setPasswordForm((prev) => ({ ...prev, confirm: v }))}
                  type="password"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  onClick={handlePasswordChange}
                  disabled={passwordSaving}
                  style={{
                    padding: '10px 24px',
                    background: passwordSaving ? '#2563eb99' : '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: passwordSaving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {passwordSaving ? t('profile.updating') : t('profile.updatePassword')}
                </button>
              </div>

              <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #1f2937' }}>
                <h4 style={{ color: '#e0e0e0', fontSize: 14, marginBottom: 12 }}>{t('profile.dangerZone')}</h4>
                <button
                  onClick={() => {
                    if (confirm(t('profile.deleteConfirm'))) logout()
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('profile.deleteAccount')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div>
              <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 20 }}>{t('profile.accountInfo')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
                <InfoRow label={t('profile.email')} value={user?.email || '—'} />
                <InfoRow label={t('profile.role')} value={user?.role || '—'} />
                <InfoRow
                  label={t('profile.memberSince')}
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: 6,
          color: '#e0e0e0',
          fontSize: 14,
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid #1f2937',
      }}
    >
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#e0e0e0', fontWeight: 500 }}>{value}</span>
    </div>
  )
}