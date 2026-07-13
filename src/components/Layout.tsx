import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { useToast } from '../contexts/ToastContext.tsx'
import { accountApi, notificationApi } from '../utils/api.ts'
import { Sidebar, TopBar, LogoutModal, ToastContainer } from './layout/index'
import { InstallPwa } from './layout/InstallPwa'
import type { Notification } from '../../shared/types'

export default function Layout({
  children,
  noPadding = false,
}: {
  children: ReactNode
  noPadding?: boolean
}) {
  const { user, logout } = useAuth()
  const { toasts, removeToast } = useToast()
  const location = useLocation()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [firstAccountId, setFirstAccountId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifUnread, setNotifUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    accountApi.getAll(1, 1).then((res) => {
      const accounts = res.data || res
      if (accounts.length > 0) setFirstAccountId(accounts[0].id)
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) return
    const fetchNotifs = () => {
      notificationApi.list().then((res) => {
        setNotifications(res.notifications || [])
        setNotifUnread(res.unreadCount || 0)
      }).catch(() => {})
    }
    fetchNotifs()
    const id = setInterval(fetchNotifs, 3_000)
    return () => clearInterval(id)
  }, [user])

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setNotifUnread(0)
    } catch {}
  }

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setNotifUnread((prev) => Math.max(0, prev - 1))
    } catch {}
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (saved) setTheme(saved)
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark')
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const notifList = notifications.map((n) => ({
    id: n.id,
    message: n.title,
    type: n.type === 'alert_triggered' ? 'warning' : n.type === 'payout_processed' ? 'success' : 'info',
    read: n.read,
    time: new Date(n.createdAt).toLocaleString(),
  }))

  const themeBg = theme === 'dark' ? '#0a0e17' : '#f3f4f6'
  const themeColor = theme === 'dark' ? '#e0e0e0' : '#1f2937'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: themeBg, color: themeColor, transition: 'background 0.2s, color 0.2s' }}>
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 45, animation: 'fadeIn 0.2s ease-out' }} />
      )}

      <Sidebar
        theme={theme}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        location={location}
        firstAccountId={firstAccountId}
        user={user}
        onLogoutClick={() => setShowLogoutConfirm(true)}
      />

      <LogoutModal
        theme={theme}
        show={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
      />

      <TopBar
        theme={theme}
        sidebarOpen={sidebarOpen}
        isMobile={isMobile}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleTheme={toggleTheme}
        user={user}
        showNotifications={showNotifications}
        unreadCount={notifUnread}
        onToggleNotifications={() => setShowNotifications(!showNotifications)}
        onMarkAllRead={handleMarkAllRead}
        toasts={notifList}
        onRemoveToast={handleMarkRead}
      />

      <main
        className="page-transition"
        style={{
          flex: 1,
          marginLeft: !isMobile && sidebarOpen ? 240 : 0,
          marginTop: 56,
          minHeight: 'calc(100vh - 56px)',
          padding: noPadding ? 0 : 24,
          transition: 'margin-left 0.3s',
          overflow: noPadding ? 'hidden' : 'auto',
        }}
      >
        {children}
      </main>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      <InstallPwa />
    </div>
  )
}
