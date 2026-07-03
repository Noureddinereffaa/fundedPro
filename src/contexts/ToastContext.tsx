import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  read?: boolean
  time?: string
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType>({} as ToastContextType)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div style={{
        position: 'fixed', top: 16, right: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        maxWidth: 400,
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: 'slideIn 0.2s ease-out',
              background: colorMap[toast.type].bg,
              color: colorMap[toast.type].text,
              border: `1px solid ${colorMap[toast.type].border}`,
            }}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none', border: 'none', color: 'inherit', cursor: 'pointer',
                fontSize: 16, opacity: 0.7, padding: 0, lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  success: { bg: '#064e3b', text: '#6ee7b7', border: '#065f4620' },
  error: { bg: '#7f1d1d', text: '#fca5a5', border: '#991b1b20' },
  warning: { bg: '#78350f', text: '#fcd34d', border: '#92400e20' },
  info: { bg: '#1e3a5f', text: '#93c5fd', border: '#1e40af20' },
}
