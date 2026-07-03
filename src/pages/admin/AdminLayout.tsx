import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.tsx'

const adminLinks = [
  { key: 'dashboard', path: '/admin', label: 'Dashboard', icon: '📊' },
  { key: 'users', path: '/admin/users', label: 'Users', icon: '👥' },
  { key: 'accounts', path: '/admin/accounts', label: 'Accounts', icon: '💳' },
  { key: 'payments', path: '/admin/payments', label: 'Payments', icon: '🪙' },
  { key: 'payouts', path: '/admin/payouts', label: 'Payouts', icon: '💰' },
  { key: 'violations', path: '/admin/violations', label: 'Violations', icon: '⚠️' },
  { key: 'rules', path: '/admin/rules', label: 'Rules Config', icon: '⚙️' },
]

export default function AdminLayout({ children, active }: { children: ReactNode; active: string }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0e17', color: '#e0e0e0' }}>
      <aside style={{
        width: 240, background: '#111827', borderRight: '1px solid #1f2937',
        display: 'flex', flexDirection: 'column', padding: '16px 0',
      }}>
        <Link to="/admin" style={{ padding: '0 20px 20px', textDecoration: 'none' }}>
          <h1 style={{ color: '#ef4444', fontSize: 18, fontWeight: 700, margin: 0 }}>Admin Panel</h1>
          <span style={{ color: '#6b7280', fontSize: 11 }}>FundedPro Management</span>
        </Link>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {adminLinks.map(link => (
            <Link
              key={link.key}
              to={link.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', textDecoration: 'none',
                color: active === link.key ? '#ef4444' : '#9ca3af',
                background: active === link.key ? '#3b1419' : 'transparent',
                borderRight: active === link.key ? '3px solid #ef4444' : '3px solid transparent',
                fontSize: 14, fontWeight: 500,
              }}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #1f2937' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{user?.email}</div>
          <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>Administrator</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <a href="/dashboard" style={{
              flex: 1, padding: '6px 0', background: '#1f2937', color: '#9ca3af',
              border: '1px solid #374151', borderRadius: 6, fontSize: 11, textAlign: 'center',
              textDecoration: 'none',
            }}>User View</a>
            <button onClick={() => setShowLogoutConfirm(true)} style={{
              flex: 1, padding: '6px 0', background: '#1f2937', color: '#9ca3af',
              border: '1px solid #374151', borderRadius: 6, fontSize: 11, cursor: 'pointer',
            }}>Sign Out</button>
          </div>
        </div>
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
            background: '#111827',
            padding: 24, borderRadius: 12, width: 320,
            border: '1px solid #1f2937',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#e0e0e0' }}>Sign Out</h3>
            <p style={{ color: '#6b7280', margin: '0 0 20px', fontSize: 14 }}>
              Are you sure you want to sign out?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                  background: 'transparent', border: '1px solid #374151',
                  color: '#e0e0e0', fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
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

      <main className="page-transition" style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {children}
      </main>
    </div>
  )
}
