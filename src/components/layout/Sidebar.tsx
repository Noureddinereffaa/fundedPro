import { Link } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { sidebarSections } from './navLinks'
import { LanguageSwitcher } from '../../i18n/LanguageSwitcher'

interface SidebarProps {
  theme: 'dark' | 'light'
  sidebarOpen: boolean
  onClose: () => void
  location: Location
  firstAccountId: string | null
  user: { firstName?: string; email: string; role?: string } | null
  onLogoutClick: () => void
}

export function Sidebar({ theme, sidebarOpen, onClose, location, firstAccountId, user, onLogoutClick }: SidebarProps) {
  const { t, i18n } = useTranslation('common')
  const lang = i18n.language
  const borderColor = theme === 'dark' ? '#1f2937' : '#e5e7eb'
  const sidebarBg = theme === 'dark' ? '#111827' : '#fff'

  return (
    <aside
      style={{
        width: sidebarOpen ? 240 : 0,
        minWidth: sidebarOpen ? 240 : 0,
        background: sidebarBg,
        borderRight: `1px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        padding: sidebarOpen ? '16px 0' : 0,
        overflow: 'hidden',
        transition: 'width 0.3s, min-width 0.3s, padding 0.3s',
        position: 'fixed',
        height: '100vh',
        zIndex: 50,
        boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      {sidebarOpen && (
        <>
          <Link to={`/${lang}/dashboard`} style={{ padding: '0 20px 20px', textDecoration: 'none', display: 'block' }}>
            <h1 style={{ color: '#3b82f6', fontSize: 22, fontWeight: 700, margin: 0 }}>{t('site.name')}</h1>
            <span style={{ color: '#6b7280', fontSize: 11 }}>{t('site.tagline')}</span>
          </Link>

          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 20, overflowY: 'auto' }}>
            {sidebarSections.map((section, idx) => {
              // Hide section if all its links require auth but user is not logged in
              const visibleLinks = section.links.filter(link => !link.requiresAuth || user)
              if (visibleLinks.length === 0) return null

              return (
                <div key={idx} style={{ marginBottom: 16 }}>
                  <div style={{ padding: '0 20px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8 }}>
                    {t(section.titleKey)}
                  </div>
                  {visibleLinks.map((link) => {
                    const linkTo = link.path === '/trade' && firstAccountId ? `/${lang}/trade/${firstAccountId}` : `/${lang}${link.path}`
                    const isActive = link.path === '/trade' 
                      ? location.pathname.startsWith(`/${lang}/trade/`) 
                      : location.pathname === `/${lang}${link.path}`
                    return (
                      <Link
                        key={link.path}
                        to={linkTo}
                        onClick={onClose}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 20px',
                          textDecoration: 'none',
                          color: isActive
                            ? theme === 'dark' ? '#3b82f6' : '#2563eb'
                            : theme === 'dark' ? '#9ca3af' : '#6b7280',
                          background: isActive ? (theme === 'dark' ? '#1e3a5f' : '#dbeafe') : 'transparent',
                          borderRight: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                          fontSize: 14,
                          fontWeight: 500,
                          transition: 'all 0.15s',
                        }}
                      >
                        <span>{link.icon}</span>
                        {t(link.labelKey)}
                      </Link>
                    )
                  })}
                </div>
              )
            })}

            {user?.role === 'admin' && (
              <div style={{ marginTop: 'auto' }}>
                <div style={{ height: 1, background: borderColor, margin: '8px 20px' }} />
                <Link
                  to={`/${lang}/admin`}
                  onClick={onClose}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 20px',
                    textDecoration: 'none',
                    color: location.pathname.startsWith(`/${lang}/admin`)
                      ? '#ef4444'
                      : theme === 'dark' ? '#9ca3af' : '#6b7280',
                    background: location.pathname.startsWith(`/${lang}/admin`)
                      ? theme === 'dark' ? '#3b1419' : '#fef2f2'
                      : 'transparent',
                    borderRight: location.pathname.startsWith(`/${lang}/admin`)
                      ? '3px solid #ef4444'
                      : '3px solid transparent',
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>⚙️</span>
                  {t('nav.admin')}
                </Link>
              </div>
            )}
          </nav>

          <div style={{ padding: '16px 20px', borderTop: `1px solid ${borderColor}` }}>
            <div style={{ marginBottom: 12 }}>
              <LanguageSwitcher theme={theme} />
            </div>
            <div style={{ fontSize: 13, color: theme === 'dark' ? '#e0e0e0' : '#1f2937', marginBottom: 4 }}>
              {user?.firstName || user?.email}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{user?.role}</div>
            <button
              onClick={onLogoutClick}
              style={{
                width: '100%',
                padding: '8px 0',
                background: theme === 'dark' ? '#1f2937' : '#f3f4f6',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {t('nav.logout')}
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
