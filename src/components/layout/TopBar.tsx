import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NotificationsDropdown } from './NotificationsDropdown'
import { LanguageSwitcher } from '../../i18n/LanguageSwitcher'

interface TopBarProps {
  theme: 'dark' | 'light'
  sidebarOpen: boolean
  isMobile: boolean
  onToggleSidebar: () => void
  onToggleTheme: () => void
  user: { firstName?: string; email: string } | null
  showNotifications: boolean
  unreadCount: number
  onToggleNotifications: () => void
  onMarkAllRead: () => void
  toasts: { id: string; message: string; type?: string; read?: boolean; time?: string }[]
  onRemoveToast: (id: string) => void
}

export function TopBar({
  theme,
  sidebarOpen,
  isMobile,
  onToggleSidebar,
  onToggleTheme,
  user,
  showNotifications,
  unreadCount,
  onToggleNotifications,
  onMarkAllRead,
  toasts,
  onRemoveToast,
}: TopBarProps) {
  const { t, i18n } = useTranslation('common')
  const lang = i18n.language
  const topBg = theme === 'dark' ? '#111827' : '#fff'
  const topBorder = theme === 'dark' ? '#1f2937' : '#e5e7eb'

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: !isMobile && sidebarOpen ? 240 : 0,
        right: 0,
        height: 56,
        background: topBg,
        borderBottom: `1px solid ${topBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 40,
        transition: 'left 0.3s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onToggleSidebar}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 8,
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
        <Link to={`/${lang}/dashboard`} style={{ textDecoration: 'none' }}>
          <h1 style={{ color: '#3b82f6', fontSize: 20, fontWeight: 700, margin: 0 }}>{t('site.name')}</h1>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onToggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 8,
            background: theme === 'dark' ? '#1f2937' : '#f3f4f6',
            border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
            color: theme === 'dark' ? '#e0e0e0' : '#1f2937',
            cursor: 'pointer',
          }}
          title={theme === 'dark' ? t('actions.loading') : t('actions.loading')}
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

        <LanguageSwitcher theme={theme} compact />

        <NotificationsDropdown
          theme={theme}
          show={showNotifications}
          unreadCount={unreadCount}
          onToggle={onToggleNotifications}
          onMarkAllRead={onMarkAllRead}
          toasts={toasts}
          onRemoveToast={onRemoveToast}
        />

        {user && isMobile && (
          <div style={{ position: 'relative' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 8,
                background: theme === 'dark' ? '#1f2937' : '#f3f4f6',
                border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
                color: theme === 'dark' ? '#e0e0e0' : '#1f2937',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                {user.firstName?.[0] || user.email[0].toUpperCase()}
              </span>
              <span
                style={{
                  maxWidth: 100,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.firstName || user.email}
              </span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
