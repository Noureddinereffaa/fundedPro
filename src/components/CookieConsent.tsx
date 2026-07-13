import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const COOKIE_CONSENT_KEY = 'profundx_cookie_consent'

export default function CookieConsent() {
  const { t } = useTranslation('common')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#0d1117',
        borderTop: '1px solid #1f2937',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <p style={{ margin: 0, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
        This website uses essential cookies for authentication and functionality. By continuing, you accept our use of cookies.
      </p>
      <button
        onClick={accept}
        style={{
          padding: '8px 24px',
          borderRadius: 8,
          border: 'none',
          background: '#3b82f6',
          color: '#fff',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Accept
      </button>
    </div>
  )
}
