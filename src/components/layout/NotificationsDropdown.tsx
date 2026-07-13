import { useTranslation } from 'react-i18next'

interface NotificationsDropdownProps {
  theme: 'dark' | 'light'
  show: boolean
  unreadCount: number
  onToggle: () => void
  onMarkAllRead: () => void
  toasts: { id: string; message: string; type?: string; read?: boolean; time?: string }[]
  onRemoveToast: (id: string) => void
}

export function NotificationsDropdown({
  theme,
  show,
  unreadCount,
  onMarkAllRead,
  toasts,
  onRemoveToast,
}: NotificationsDropdownProps) {
  const { t } = useTranslation('common')
  const bg = theme === 'dark' ? '#111827' : '#f3f4f6'
  const border = theme === 'dark' ? '#374151' : '#d1d5db'
  const text = theme === 'dark' ? '#e0e0e0' : '#1f2937'
  const muted = theme === 'dark' ? '#6b7280' : '#6b7280'

  if (!show) return null

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'fixed',
          top: 56,
          right: 16,
          width: 360,
          maxHeight: 420,
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${border}`,
          }}
        >
          <span style={{ color: text, fontWeight: 600, fontSize: 14 }}>{t('notifications.title')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unreadCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                {unreadCount}
              </span>
            )}
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme === 'dark' ? '#3b82f6' : '#2563eb',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 4,
                }}
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {toasts.length === 0 ? (
            <div style={{ textAlign: 'center', color: muted, padding: 40, fontSize: 13 }}>
              {t('notifications.noNotifications')}
            </div>
          ) : (
            toasts.map((n) => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.08)',
                  border: `1px solid ${n.read ? 'transparent' : 'rgba(59, 130, 246, 0.2)'}`,
                  marginBottom: 8,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onClick={() => onRemoveToast(n.id)}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: 4,
                    background:
                      n.type === 'success'
                        ? '#22c55e'
                        : n.type === 'warning'
                          ? '#f59e0b'
                          : n.type === 'error'
                            ? '#ef4444'
                            : '#3b82f6',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: text, fontSize: 13, lineHeight: 1.4 }}>{n.message}</div>
                  {n.time && (
                    <div style={{ color: muted, fontSize: 10, marginTop: 2 }}>{n.time}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}