const ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true'

export function logError(err: unknown, context = ''): void {
  if (!ENABLED) return
  const msg = err instanceof Error ? err.message : String(err)
  console.warn(`[App]${context ? ` ${context}` : ''} ${msg}`)
}

export function apiErrorHandler(context: string) {
  return (err: unknown) => logError(err, context)
}

export function silentError(context: string): (err: unknown) => void {
  return (err: unknown) => logError(err, context)
}
