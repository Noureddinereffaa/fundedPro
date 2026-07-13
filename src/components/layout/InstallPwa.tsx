import { useState, useEffect, useCallback } from 'react'
import { listenForInstallPrompt } from '../../utils/pwa'
import { useTranslation } from 'react-i18next'

export function InstallPwa() {
  const { t } = useTranslation('common')
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    listenForInstallPrompt((e) => setDeferredPrompt(e))
    window.addEventListener('appinstalled', () => setDeferredPrompt(null))
  }, [])

  const handleInstall = useCallback(() => {
    if (!deferredPrompt) return
    ;(deferredPrompt as any).prompt()
    ;(deferredPrompt as any).userChoice.then(() => setDeferredPrompt(null))
  }, [deferredPrompt])

  if (!deferredPrompt || dismissed) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 18px',
        borderRadius: 12,
        background: 'rgba(19, 23, 34, 0.96)',
        border: '1px solid #2a2e39',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        fontSize: 13,
        color: '#d1d4dc',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#26a69a" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>{t('pwa.installApp')}</span>
      <button
        onClick={handleInstall}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          border: 'none',
          background: '#26a69a',
          color: '#fff',
          fontWeight: 600,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        {t('pwa.install')}
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          color: '#787b86',
          cursor: 'pointer',
          padding: 4,
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}