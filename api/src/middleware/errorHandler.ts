import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

const isDev = process.env.NODE_ENV !== 'production'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    if (isDev) Error.captureStackTrace(this, this.constructor)
  }
}

export function getErrorInfo(error: unknown): { statusCode: number; message: string } {
  if (error instanceof AppError) return { statusCode: error.statusCode, message: error.message }
  if (error instanceof Error) return { statusCode: 500, message: error.message }
  return { statusCode: 500, message: 'Internal server error' }
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
    res.status(400).json({ error: 'Validation failed', details: errors })
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  // Log full error server-side
  console.error('[ERROR]', err.message, isDev ? err.stack : '')

  // Report to Sentry in production
  if (!isDev) {
    import('@sentry/node').then((Sentry) => {
      Sentry.captureException(err, {
        extra: { path: req.path, method: req.method },
      })
    }).catch(() => {})
  }

  // Never leak stack trace in production
  res.status(500).json({
    error: 'Internal server error',
    ...(isDev && { details: err.message, stack: err.stack }),
  })
}
