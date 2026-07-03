import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register({ email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e17' }}>
      <div style={{ width: 440, padding: 40, background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
        <h1 style={{ color: '#3b82f6', fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>FundedPro</h1>
        <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>Create your account</p>

        {error && (
          <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>First Name</label>
              <input value={form.firstName} onChange={e => update('firstName', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box' }}
                placeholder="John" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Last Name</label>
              <input value={form.lastName} onChange={e => update('lastName', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box' }}
                placeholder="Doe" />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Email</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} required
              style={{ width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box' }}
              placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Password</label>
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} required
              style={{ width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box' }}
              placeholder="Min 8 characters" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} required
              style={{ width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box' }}
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px 0', background: loading ? '#2563eb99' : '#2563eb',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#6b7280', fontSize: 13 }}>
          Already have an account? <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
