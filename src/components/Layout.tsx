import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { useToast } from '../contexts/ToastContext.tsx'

const navLinks = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/pricing', label: 'Pricing', icon: '💰' },
]

const userNavLinks = [
  { path: '/profile', label: 'Profile', icon: '👤' },
  { path: '/kyc', label: 'KYC', icon: '🆔' },
  { path: '/history', label: 'History', icon: '📜' },
  { path: '/payout', label: 'Payout', icon: '💸' },
  { path: '/referral', label: 'Referral', icon: '🎁' },
]


export default function Layout({ children, noPadding = false }: { children: ReactNode; noPadding?: boolean }) {
  const { user, logout } = useAuth()
  const { toasts, removeToast } = useToast()
  const location = useLocation()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const unreadCount = toasts.filter(t => !t.read).length

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (saved) setTheme(saved)
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark')
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: theme === 'dark' ? '#0a0e17' : '#f3f4f6',
      color: theme === 'dark' ? '#e0e0e0' : '#1f2937',
      transition: 'background 0.2s, color 0.2s',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 0,
        minWidth: sidebarOpen ? 240 : 0,
        background: theme === 'dark' ? '#111827' : '#fff',
        borderRight: `1px solid ${theme === 'dark' ? '#1f2937' : '#e5e7eb'}`,
        display: 'flex',
        flexDirection: 'column',
        padding: sidebarOpen ? '16px 0' : 0,
        overflow: 'hidden',
        transition: 'width 0.3s, min-width 0.3s, padding 0.3s',
        position: 'fixed',
        height: '100vh',
        zIndex: 50,
        boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.1)' : 'none',
      }}>
        {sidebarOpen && (
          <>
            <Link to="/dashboard" style={{ padding: '0 20px 20px', textDecoration: 'none', display: 'block' }}>
              <h1 style={{ color: '#3b82f6', fontSize: 22, fontWeight: 700, margin: 0 }}>
                FundedPro
              </h1>
              <span style={{ color: '#6b7280', fontSize: 11 }}>Prop Trading Platform</span>
            </Link>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 20px', textDecoration: 'none',
                    color: location.pathname === link.path
                      ? (theme === 'dark' ? '#3b82f6' : '#2563eb')
                      : (theme === 'dark' ? '#9ca3af' : '#6b7280'),
                    background: location.pathname === link.path
                      ? (theme === 'dark' ? '#1e3a5f' : '#dbeafe')
                      : 'transparent',
                    borderRight: location.pathname === link.path ? '3px solid #3b82f6' : '3px solid transparent',
                    fontSize: 14, fontWeight: 500, transition: 'all 0.15s',
                  }}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              ))}

              {user && (
                <>
                  <div style={{ height: 1, background: theme === 'dark' ? '#1f2937' : '#e5e7eb', margin: '8px 20px' }} />
                  {userNavLinks.map(link => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setSidebarOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 20px', textDecoration: 'none',
                        color: location.pathname === link.path
                          ? (theme === 'dark' ? '#3b82f6' : '#2563eb')
                          : (theme === 'dark' ? '#9ca3af' : '#6b7280'),
                        background: location.pathname === link.path
                          ? (theme === 'dark' ? '#1e3a5f' : '#dbeafe')
                          : 'transparent',
                        borderRight: location.pathname === link.path ? '3px solid #3b82f6' : '3px solid transparent',
                        fontSize: 14, fontWeight: 500, transition: 'all 0.15s',
                      }}
                    >
                      <span>{link.icon}</span>
                      {link.label}
                    </Link>
                  ))}
                </>
              )}

              {user?.role === 'admin' && (
                <>
                  <div style={{ height: 1, background: theme === 'dark' ? '#1f2937' : '#e5e7eb', margin: '8px 20px' }} />
                  <Link
                    to="/admin"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 20px', textDecoration: 'none',
                      color: location.pathname.startsWith('/admin')
                        ? (theme === 'dark' ? '#ef4444' : '#dc2626')
                        : (theme === 'dark' ? '#9ca3af' : '#6b7280'),
                      background: location.pathname.startsWith('/admin')
                        ? (theme === 'dark' ? '#3b1419' : '#fef2f2')
                        : 'transparent',
                      borderRight: location.pathname.startsWith('/admin') ? '3px solid #ef4444' : '3px solid transparent',
                      fontSize: 14, fontWeight: 500, transition: 'all 0.15s',
                    }}
                  >
                    <span>⚙️</span>
                    Admin Panel
                  </Link>
                </>
              )}
            </nav>

            <div style={{ padding: '16px 20px', borderTop: `1px solid ${theme === 'dark' ? '#1f2937' : '#e5e7eb'}` }}>
              <div style={{ fontSize: 13, color: theme === 'dark' ? '#e0e0e0' : '#1f2937', marginBottom: 4 }}>
                {user?.firstName || user?.email}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{user?.role}</div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                style={{
                  width: '100%', padding: '8px 0',
                  background: theme === 'dark' ? '#1f2937' : '#f3f4f6',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
                  borderRadius: 6, cursor: 'pointer', fontSize: 13,
                }}
              >
                Sign Out
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: theme === 'dark' ? '#111827' : '#fff',
            padding: 24, borderRadius: 12, width: 320,
            border: `1px solid ${theme === 'dark' ? '#1f2937' : '#e5e7eb'}`,
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Sign Out</h3>
            <p style={{ color: '#6b7280', margin: '0 0 20px', fontSize: 14 }}>
              Are you sure you want to sign out?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                  background: 'transparent', border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
                  color: theme === 'dark' ? '#e0e0e0' : '#1f2937', fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={logout}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                  background: '#ef4444', border: 'none', color: '#fff', fontWeight: 600
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: sidebarOpen ? 240 : 0,
        right: 0,
        height: 56,
        background: theme === 'dark' ? '#111827' : '#fff',
        borderBottom: `1px solid ${theme === 'dark' ? '#1f2937' : '#e5e7eb'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 40,
        transition: 'left 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40, borderRadius: 8,
              background: theme === 'dark' ? '#1f2937' : '#f3f4f6',
              border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
              color: theme === 'dark' ? '#e0e0e0' : '#1f2937',
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <h1 style={{ color: '#3b82f6', fontSize: 20, fontWeight: 700, margin: 0 }}>
              FundedPro
            </h1>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40, borderRadius: 8,
              background: theme === 'dark' ? '#1f2937' : '#f3f4f6',
              border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
              color: theme === 'dark' ? '#e0e0e0' : '#1f2937',
              cursor: 'pointer',
            }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 8,
                background: theme === 'dark' ? '#1f2937' : '#f3f4f6',
                border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
                color: theme === 'dark' ? '#e0e0e0' : '#1f2937',
                cursor: 'pointer', position: 'relative',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  minWidth: 18, height: 18, borderRadius: 9,
                  background: '#ef4444', color: '#fff', fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', fontWeight: 600,
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 8,
                width: 360, maxHeight: 400, overflow: 'auto',
                background: theme === 'dark' ? '#111827' : '#fff',
                border: `1px solid ${theme === 'dark' ? '#1f2937' : '#e5e7eb'}`,
                borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                zIndex: 100,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderBottom: `1px solid ${theme === 'dark' ? '#1f2937' : '#e5e7eb'}`,
                }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => toasts.forEach(t => t.read = true)}
                      style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {toasts.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                    No notifications
                  </div>
                ) : (
                  <div style={{ padding: 8 }}>
                    {toasts.map(n => (
                      <div
                        key={n.id}
                        onClick={() => removeToast(n.id)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '12px 12px', borderRadius: 8,
                          background: n.read ? 'transparent' : (theme === 'dark' ? '#3b82f615' : '#dbeafe'),
                          border: `1px solid ${n.read ? 'transparent' : (theme === 'dark' ? '#3b82f630' : '#93c5fd')}`,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? '#1f2937' : '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : (theme === 'dark' ? '#3b82f615' : '#dbeafe')}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                          background: n.type === 'success' ? '#22c55e' : n.type === 'error' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : '#3b82f6',
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 4px', color: theme === 'dark' ? '#e0e0e0' : '#1f2937' }}>
                            {n.message}
                          </p>
                          <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile User Menu */}
          {user && isMobile && (
            <div style={{ position: 'relative' }}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 8,
                background: theme === 'dark' ? '#1f2937' : '#f3f4f6',
                border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
                color: theme === 'dark' ? '#e0e0e0' : '#1f2937',
                cursor: 'pointer', fontSize: 13,
              }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 12 }}>
                  {user.firstName?.[0] || user.email[0].toUpperCase()}
                </span>
                <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.firstName || user.email}
                </span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="page-transition" style={{
        flex: 1,
        marginLeft: sidebarOpen ? 240 : 0,
        marginTop: 56,
        minHeight: 'calc(100vh - 56px)',
        padding: noPadding ? 0 : 24,
        transition: 'margin-left 0.3s',
        overflow: noPadding ? 'hidden' : 'auto',
      }}>
        {children}
      </main>

      {/* Toast notifications from context */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400,
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: 'slideIn 0.2s ease-out',
              background: toast.type === 'success' ? '#064e3b' : toast.type === 'error' ? '#7f1d1d' : toast.type === 'warning' ? '#78350f' : '#1e3a5f',
              color: toast.type === 'success' ? '#6ee7b7' : toast.type === 'error' ? '#fca5a5' : toast.type === 'warning' ? '#fcd34d' : '#93c5fd',
              border: `1px solid ${toast.type === 'success' ? '#065f4620' : toast.type === 'error' ? '#991b1b20' : toast.type === 'warning' ? '#92400e20' : '#1e40af20'}`,
            }}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, opacity: 0.7, padding: 0, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        ))}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}} />
      </div>
    </div>
  )
}