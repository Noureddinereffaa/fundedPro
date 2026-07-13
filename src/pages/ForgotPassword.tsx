import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '../utils/api.ts'
import { useToast } from '../contexts/ToastContext.tsx'

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()
  const navigate = useNavigate()
  const lang = i18n.language

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      addToast(t('login.email'), 'warning')
      return
    }
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      addToast(t('password.emailSent'), 'success')
      navigate(`/${lang}/login`)
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : t('password.emailSent'), 'error')
    } finally {
      setLoading(false)
    }
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
        <Link to={`/${lang}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          <h1 style={{ color: '#3b82f6', fontSize: 28, fontWeight: 700, textAlign: 'center', margin: 0 }}>
            ProFundX
          </h1>
        </Link>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', textAlign: 'center', marginBottom: 8 }}>
          {t('password.forgot')}
        </h2>
        <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
          {t('password.emailSent')}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>{t('login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 0',
              background: loading ? '#2563eb99' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? t('actions.loading', { ns: 'common' }) : t('password.sendReset')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#6b7280', fontSize: 13 }}>
          {t('register.haveAccount')}{' '}
          <Link to={`/${lang}/login`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
            {t('register.login')}
          </Link>
        </p>
      </div>
    </div>
  )
}
