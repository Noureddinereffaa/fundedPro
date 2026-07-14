import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Footer from '../components/layout/Footer.tsx'
import { Mail, MessageSquare, Clock } from 'lucide-react'
import { SeoHead } from '../i18n/SeoHead'

export default function Contact() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [settings, setSettings] = useState<Record<string, string>>({})

  useEffect(() => {
      fetch(`${import.meta.env.VITE_API_URL || 'https://profundx.com/api'}/settings`)
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://profundx.com/api'}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send message')

      setStatus('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#030712' }}>
      <SeoHead title="Contact Us" description="Get in touch with the ProFundX team for support, partnerships, or inquiries." />
      <nav style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2937' }}>
        <Link to={`/${lang}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
            <span style={{ color: '#3b82f6' }}>Pro</span>FundX
          </div>
        </Link>
        <Link to={`/${lang}`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Back to Home</Link>
      </nav>

      <main style={{ flex: 1, padding: '80px 20px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, color: '#fff', marginBottom: 16 }}>Get in Touch</h1>
          <p style={{ color: '#9ca3af', fontSize: 18, maxWidth: 600, margin: '0 auto' }}>
            Have questions about our Crypto Prop Firm? Our support team is here to help you 24/7.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40 }}>
          {/* Contact Info */}
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 24 }}>Contact Information</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ background: '#1e3a8a', padding: 12, borderRadius: 12, color: '#60a5fa' }}>
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 4 }}>Email Us</div>
                  <a href={`mailto:${settings.contact_email || 'support@profundx.com'}`} style={{ color: '#fff', fontSize: 16, textDecoration: 'none', fontWeight: 500 }}>
                    {settings.contact_email || 'support@profundx.com'}
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ background: '#064e3b', padding: 12, borderRadius: 12, color: '#34d399' }}>
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 4 }}>Live Support</div>
                  <a href={settings.social_telegram || '#'} target="_blank" rel="noreferrer" style={{ color: '#fff', fontSize: 16, textDecoration: 'none', fontWeight: 500 }}>
                    Join Telegram Community
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ background: '#4c1d95', padding: 12, borderRadius: 12, color: '#a78bfa' }}>
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 4 }}>Response Time</div>
                  <div style={{ color: '#fff', fontSize: 16, fontWeight: 500 }}>Under 2 hours</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div style={{ background: '#111827', padding: 40, borderRadius: 24, border: '1px solid #1f2937' }}>
            {status === 'success' ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h3 style={{ fontSize: 24, color: '#fff', marginBottom: 8 }}>Message Sent!</h3>
                <p style={{ color: '#9ca3af' }}>We've received your message and will get back to you shortly.</p>
                <button
                  onClick={() => setStatus('idle')}
                  style={{ marginTop: 24, padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {status === 'error' && (
                  <div style={{ padding: 12, background: '#7f1d1d', color: '#fca5a5', borderRadius: 8, fontSize: 14 }}>
                    {errorMsg}
                  </div>
                )}
                
                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Your Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #374151', background: '#1f2937', color: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Email Address</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #374151', background: '#1f2937', color: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Subject</label>
                  <input
                    required
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #374151', background: '#1f2937', color: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>Message</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #374151', background: '#1f2937', color: '#fff', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  style={{
                    padding: 16,
                    background: status === 'loading' ? '#2563eb' : '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                    marginTop: 8
                  }}
                >
                  {status === 'loading' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
