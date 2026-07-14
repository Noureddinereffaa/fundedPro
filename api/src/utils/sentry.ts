import { config } from '../config/index.js'

let initialized = false

export function initSentry(): void {
  if (initialized || !config.SENTRY_DSN) return
  initialized = true

  import('@sentry/node').then((Sentry) => {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      environment: config.NODE_ENV,
      tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [],
    })
    console.log('Sentry initialized (Node)')
  })
}

export function getInitialized(): boolean {
  return initialized
}
