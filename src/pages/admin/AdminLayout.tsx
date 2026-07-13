import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext.tsx'

export default function AdminLayout({ children, active }: { children: ReactNode; active: string }) {
  const { t, i18n } = useTranslation('admin')
  const lang = i18n.language
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  const handleLogout = async () => {
    await logout()
    navigate(`/${lang}/login`)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0e17', color: '#e0e0e0' }}>
      {/* Mobile sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 45,
          }}
        />
      )}
      {/* Hamburger toggle */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 46,
            width: 40,
            height: 40,
            borderRadius: 8,
            border: '1px solid #374151',
            background: '#111827',
            color: '#e0e0e0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          ☰
        </button>
      )}
      <aside
        style={{
          width: sidebarOpen ? 240 : 0,
          minWidth: sidebarOpen ? 240 : 0,
          background: '#111827',
          borderRight: '1px solid #1f2937',
          display: 'flex',
          flexDirection: 'column',
          padding: sidebarOpen ? '16px 0' : 0,
          overflow: 'hidden',
          transition: 'width 0.3s, min-width 0.3s, padding 0.3s',
          position: isMobile ? 'fixed' : 'relative',
          height: '100vh',
          zIndex: 50,
        }}
      >
        <Link to={`/${lang}/admin`} style={{ padding: '0 20px 20px', textDecoration: 'none' }}>
          <h1 style={{ color: '#ef4444', fontSize: 18, fontWeight: 700, margin: 0 }}>{t('layout.title')}</h1>
          <span style={{ color: '#6b7280', fontSize: 11 }}>{t('layout.subtitle')}</span>
        </Link>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 20, overflowY: 'auto' }}>
          {[
            {
              title: 'Overview',
              links: [{ key: 'dashboard', path: '/admin', icon: '📊' }]
            },
            {
              title: 'Clients & Trading',
              links: [
                { key: 'users', path: '/admin/users', icon: '👥' },
                { key: 'accounts', path: '/admin/accounts', icon: '💳' },
                { key: 'violations', path: '/admin/violations', icon: '⚠️' }
              ]
            },
            {
              title: 'Finance',
              links: [
                { key: 'payments', path: '/admin/payments', icon: '🪙' },
                { key: 'payouts', path: '/admin/payouts', icon: '💰' },
                { key: 'coupons', path: '/admin/coupons', icon: '🎟️' }
              ]
            },
            {
              title: 'System',
              links: [
                { key: 'rules', path: '/admin/rules', icon: '⚙️' },
                { key: 'messages', path: '/admin/messages', icon: '✉️' },
                { key: 'settings', path: '/admin/settings', icon: '🔧' }
              ]
            }
          ].map((section, idx) => (
            <div key={idx} style={{ marginBottom: 16 }}>
              <div style={{ padding: '0 20px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8 }}>
                {section.title}
              </div>
              {section.links.map((link) => (
                <Link
                  key={link.key}
                  to={`/${lang}${link.path}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 20px',
                    textDecoration: 'none',
                    color: active === link.key ? '#ef4444' : '#9ca3af',
                    background: active === link.key ? '#3b1419' : 'transparent',
                    borderRight: active === link.key ? '3px solid #ef4444' : '3px solid transparent',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  <span>{link.icon}</span>
                  {t(`layout.${link.key}`)}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #1f2937' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{user?.email}</div>
          <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>{t('layout.administrator')}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <a
              href={`/${lang}/dashboard`}
              style={{
                flex: 1,
                padding: '6px 0',
                background: '#1f2937',
                color: '#9ca3af',
                border: '1px solid #374151',
                borderRadius: 6,
                fontSize: 11,
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              {t('layout.userView')}
            </a>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              style={{
                flex: 1,
                padding: '6px 0',
                background: '#1f2937',
                color: '#9ca3af',
                border: '1px solid #374151',
                borderRadius: 6,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {t('layout.signOut')}
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              background: '#111827',
              padding: 24,
              borderRadius: 12,
              width: 320,
              border: '1px solid #1f2937',
              textAlign: 'center',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#e0e0e0' }}>{t('layout.signOutTitle')}</h3>
            <p style={{ color: '#6b7280', margin: '0 0 20px', fontSize: 14 }}>
              {t('layout.signOutConfirm')}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: 'transparent',
                  border: '1px solid #374151',
                  color: '#e0e0e0',
                  fontWeight: 600,
                }}
              >
                {t('layout.cancel')}
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                {t('layout.signOut')}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="page-transition" style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {children}
      </main>
    </div>
  )
}
