interface LogoutModalProps {
  theme: 'dark' | 'light'
  show: boolean
  onCancel: () => void
  onConfirm: () => void
}

import { useTranslation } from 'react-i18next'

export function LogoutModal({ theme, show, onCancel, onConfirm }: LogoutModalProps) {
  const { t } = useTranslation('common')
  if (!show) return null

  return (
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
          background: theme === 'dark' ? '#111827' : '#fff',
          padding: 24,
          borderRadius: 12,
          width: 320,
          border: `1px solid ${theme === 'dark' ? '#1f2937' : '#e5e7eb'}`,
          textAlign: 'center',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{t('nav.logout')}</h3>
        <p style={{ color: '#6b7280', margin: '0 0 20px', fontSize: 14 }}>
          {t('nav.logout')}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              cursor: 'pointer',
              background: 'transparent',
              border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
              color: theme === 'dark' ? '#e0e0e0' : '#1f2937',
              fontWeight: 600,
            }}
          >
            {t('actions.cancel')}
          </button>
          <button
            onClick={onConfirm}
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
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}
