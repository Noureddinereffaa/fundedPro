interface Toast {
  id: string
  message: string
  type?: string
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemoveToast: (id: string) => void
}

export function ToastContainer({ toasts, onRemoveToast }: ToastContainerProps) {
  const bgColor = (type?: string) =>
    type === 'success'
      ? '#064e3b'
      : type === 'error'
        ? '#7f1d1d'
        : type === 'warning'
          ? '#78350f'
          : '#1e3a5f'
  const textColor = (type?: string) =>
    type === 'success'
      ? '#6ee7b7'
      : type === 'error'
        ? '#fca5a5'
        : type === 'warning'
          ? '#fcd34d'
          : '#93c5fd'
  const borderColor = (type?: string) =>
    type === 'success'
      ? '#065f4620'
      : type === 'error'
        ? '#991b1b20'
        : type === 'warning'
          ? '#92400e20'
          : '#1e40af20'

  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 400,
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.2s ease-out',
            background: bgColor(toast.type),
            color: textColor(toast.type),
            border: `1px solid ${borderColor(toast.type)}`,
          }}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => onRemoveToast(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 16,
              opacity: 0.7,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
