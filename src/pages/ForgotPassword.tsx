import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../utils/api.ts'
import { useToast } from '../contexts/ToastContext.tsx'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { addToast('Enter your email', 'warning'); return }
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      addToast('Password reset link sent to your email', 'success')
      navigate('/login')
    } catch (err: any) {
      addToast(err.message || 'Failed to send reset link', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e17' }}>
      <div style={{ width: 400, padding: 40, background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          <h1 style={{ color: '#3b82f6', fontSize: 28, fontWeight: 700, textAlign: 'center', margin: 0 }}>FundedPro</h1>
        </Link>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', textAlign: 'center', marginBottom: 8 }}>Forgot Password</h2>
        <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
          Enter your email to receive a password reset link
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151',
                borderRadius: 8, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box',
              }}
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px 0', background: loading ? '#2563eb99' : '#2563eb',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#6b7280', fontSize: 13 }}>
          Remember your password? <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}