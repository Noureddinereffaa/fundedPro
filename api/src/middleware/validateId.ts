import { Request, Response, NextFunction } from 'express'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Middleware factory that validates one or more route params as UUIDs.
 * Responds 400 immediately if any param is invalid.
 *
 * Usage:
 *   router.put('/users/:id', validateId('id'), handler)
 *   router.put('/admin/:userId/accounts/:accountId', validateId('userId', 'accountId'), handler)
 */
export function validateId(...paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const name of paramNames) {
      const value = req.params[name]
      if (!value || !UUID_RE.test(value)) {
        res.status(400).json({ error: `Invalid ${name}: must be a valid UUID` })
        return
      }
    }
    next()
  }
}
