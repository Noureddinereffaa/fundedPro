import { Component, type ReactNode, type ErrorInfo } from 'react'
import i18n from 'i18next'
import { captureException } from '../utils/sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Catches unhandled React render errors and displays a friendly fallback UI
 * instead of leaving the user on a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack)
    captureException(error, { componentStack: info.componentStack })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    const t = (key: string) => i18n.t(key, { ns: 'common' })

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0a0e17',
          color: '#e0e0e0',
          fontFamily: 'Inter, sans-serif',
          padding: 32,
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: 64, marginBottom: 24 }}>&#9888;</div>

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#ef4444' }}>
          {t('errorBoundary.title') || 'Something went wrong'}
        </h1>

        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 8, maxWidth: 480 }}>
          {t('errorBoundary.description') || 'An unexpected error occurred. You can try refreshing the page or clicking the button below.'}
        </p>

        {/* Show error message in dev mode only */}
        {import.meta.env.DEV && this.state.error && (
          <pre
            style={{
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: 8,
              padding: 16,
              fontSize: 12,
              color: '#f87171',
              maxWidth: 600,
              overflowX: 'auto',
              textAlign: 'left',
              marginBottom: 24,
            }}
          >
            {this.state.error.message}
          </pre>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 24px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = '#1d4ed8')}
            onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = '#2563eb')}
          >
            {t('errorBoundary.tryAgain') || 'Try again'}
          </button>

          <button
            onClick={() => window.location.replace('/')}
            style={{
              padding: '10px 24px',
              background: '#1f2937',
              color: '#9ca3af',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = '#374151')}
            onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = '#1f2937')}
          >
            {t('errorBoundary.goHome') || 'Go Home'}
          </button>
        </div>
      </div>
    )
  }
}
