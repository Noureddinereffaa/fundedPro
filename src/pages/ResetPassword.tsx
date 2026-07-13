import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '../utils/api.ts'
import { useToast } from '../contexts/ToastContext.tsx'

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const { t, i18n } = useTranslation('auth')
  const { addToast } = useToast()
  const navigate = useNavigate()
  const lang = i18n.language
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [valid, setValid] = useState(false)

  useEffect(() => {
    if (token) {
      authApi
        .verifyResetToken(token)
        .then(() => setValid(true))
        .catch(() => {
          setValid(false)
          addToast(t('verify.invalid'), 'error')
          navigate(`/${lang}/login`)
        })
        .finally(() => setValidating(false))
    }
  }, [token, navigate, addToast, t, lang])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (password !== confirmPassword) {
      addToast(t('login.failed'), 'error')
      return
    }
    if (password.length < 8) {
      addToast(t('password.requirements'), 'error')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      addToast(t('password.resetSuccess'), 'success')
      navigate(`/${lang}/login`)
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : t('password.resetSuccess'), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0e17',
        }}
      >
        <div style={{ color: '#6b7280' }}>{t('actions.loading', { ns: 'common' })}</div>
      </div>
    )
  }

  if (!valid) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0e17',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            background: '#111827',
            borderRadius: 12,
            border: '1px solid #1f2937',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h2 style={{ color: '#e0e0e0', fontSize: 20, marginBottom: 8 }}>{t('verify.invalid')}</h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            {t('verify.invalid')}
          </p>
          <a
            href={`/${lang}/forgot-password`}
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              background: '#2563eb',
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {t('password.sendReset')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div
      className="auth-container"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0e17',
      }}
    >
      <div
        style={{
          width: 400,
          maxWidth: 'calc(100% - 32px)',
          padding: 40,
          background: '#111827',
          borderRadius: 12,
          border: '1px solid #1f2937',
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', textAlign: 'center', marginBottom: 8 }}>
          {t('password.reset')}
        </h2>
        <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
          {t('password.newPassword')}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>
              {t('password.newPassword')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 8,
                color: '#e0e0e0',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
              placeholder={t('password.requirements')}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>
              {t('register.confirmPassword')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 8,
                color: '#e0e0e0',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 0',
              background: loading ? '#2563eb99' : '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? t('actions.loading', { ns: 'common' }) : t('password.reset')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#6b7280', fontSize: 13 }}>
          <a href={`/${lang}/login`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
            {t('register.login')}
          </a>
        </p>
      </div>
    </div>
  )
}
