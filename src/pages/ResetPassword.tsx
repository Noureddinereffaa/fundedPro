import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { authApi } from '../utils/api.ts'
import { useToast } from '../contexts/ToastContext.tsx'

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [valid, setValid] = useState(false)

  useEffect(() => {
    if (token) {
      authApi.verifyResetToken(token)
        .then(() => setValid(true))
        .catch(() => { setValid(false); addToast('Invalid or expired reset token', 'error'); navigate('/login') })
        .finally(() => setValidating(false))
    }
  }, [token, navigate, addToast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (password !== confirmPassword) { addToast('Passwords do not match', 'error'); return }
    if (password.length < 8) { addToast('Password must be at least 8 characters', 'error'); return }
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      addToast('Password reset successfully', 'success')
      navigate('/login')
    } catch (err: any) {
      addToast(err.message || 'Failed to reset password', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e17' }}>
        <div style={{ color: '#6b7280' }}>Validating token...</div>
      </div>
    )
  }

  if (!valid) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e17' }}>
        <div style={{ textAlign: 'center', padding: 40, background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h2 style={{ color: '#e0e0e0', fontSize: 20, marginBottom: 8 }}>Invalid Reset Link</h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>This password reset link is invalid or has expired.</p>
          <a href="/forgot-password" style={{ display: 'inline-block', padding: '12px 28px', background: '#2563eb', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>
            Request New Link
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e17' }}>
      <div style={{ width: 400, padding: 40, background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', textAlign: 'center', marginBottom: 8 }}>Reset Password</h2>
        <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
          Enter your new password
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151',
                borderRadius: 8, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box',
              }}
              placeholder="Min 8 characters"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151',
                borderRadius: 8, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box',
              }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px 0', background: loading ? '#2563eb99' : '#22c55e',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#6b7280', fontSize: 13 }}>
          <a href="/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>Back to Login</a>
        </p>
      </div>
    </div>
  )
}