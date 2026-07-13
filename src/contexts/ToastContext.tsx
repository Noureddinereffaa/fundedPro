import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Toast, ToastContextType } from '../../shared/types'

const ToastContext = createContext<ToastContextType>({} as ToastContextType)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return <ToastContext.Provider value={{ toasts, addToast, removeToast }}>{children}</ToastContext.Provider>
}

export const useToast = () => useContext(ToastContext)
