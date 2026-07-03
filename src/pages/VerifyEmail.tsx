import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { authApi } from '../utils/api.ts'
import { useToast } from '../contexts/ToastContext.tsx'

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      authApi.verifyEmail(token)
        .then(() => { addToast('Email verified successfully!', 'success') })
        .catch(() => { setError('Invalid or expired verification link') })
        .finally(() => setLoading(false))
    }
  }, [token, addToast])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e17' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <div style={{ color: '#e0e0e0', fontSize: 18 }}>Verifying your email...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e17' }}>
        <div style={{ textAlign: 'center', padding: 40, background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h2 style={{ color: '#e0e0e0', fontSize: 20, marginBottom: 8 }}>Invalid Verification Link</h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>{error}</p>
          <a href="/login" style={{ display: 'inline-block', padding: '12px 28px', background: '#2563eb', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e17' }}>
      <div style={{ textAlign: 'center', padding: 40, background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: '#22c55e', fontSize: 24, marginBottom: 8 }}>Email Verified!</h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          Your email has been successfully verified. You can now access all features.
        </p>
        <a href="/login" style={{ display: 'inline-block', padding: '12px 28px', background: '#2563eb', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>
          Continue to Login
        </a>
      </div>
    </div>
  )
}