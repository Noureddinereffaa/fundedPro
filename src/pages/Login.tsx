import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e17' }}>
      <div style={{ width: 400, padding: 40, background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
        <h1 style={{ color: '#3b82f6', fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>FundedPro</h1>
        <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>Sign in to your account</p>

        {error && (
          <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box' }}
              placeholder="you@example.com"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box' }}
              placeholder="••••••••"
            />
            <div style={{ textAlign: 'right', marginTop: 6 }}>
              <Link to="/forgot-password" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 12 }}>Forgot password?</Link>
            </div>
          </div>
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px 0', background: loading ? '#2563eb99' : '#2563eb',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#6b7280', fontSize: 13 }}>
          Don't have an account? <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none' }}>Create one</Link>
        </p>
      </div>
    </div>
  )
}
