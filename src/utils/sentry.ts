import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''

let initialized = false

export function initSentry(): void {
  if (initialized || !SENTRY_DSN) return
  initialized = true

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.PROD ? 'production' : 'development',
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    integrations: [Sentry.browserTracingIntegration()],
  })
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!initialized) return
  Sentry.captureException(error, { extra: context })
}

export { Sentry }
