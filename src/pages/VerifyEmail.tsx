import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '../utils/api.ts'
import { useToast } from '../contexts/ToastContext.tsx'

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const { t, i18n } = useTranslation('auth')
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lang = i18n.language

  useEffect(() => {
    if (token) {
      authApi
        .verifyEmail(token)
        .then(() => {
          addToast(t('verify.success'), 'success')
        })
        .catch(() => {
          setError(t('verify.invalid'))
        })
        .finally(() => setLoading(false))
    }
  }, [token, addToast, t])

  if (loading) {
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
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <div style={{ color: '#e0e0e0', fontSize: 18 }}>{t('verify.title')}</div>
        </div>
      </div>
    )
  }

  if (error) {
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
          <p style={{ color: '#6b7280', marginBottom: 24 }}>{error}</p>
          <a
            href={`/${lang}/login`}
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
            {t('register.login')}
          </a>
        </div>
      </div>
    )
  }

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
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: '#22c55e', fontSize: 24, marginBottom: 8 }}>{t('verify.success')}</h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          {t('verify.success')}
        </p>
        <a
          href={`/${lang}/login`}
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
          {t('register.login')}
        </a>
      </div>
    </div>
  )
}
