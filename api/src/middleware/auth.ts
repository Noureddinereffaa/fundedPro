import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { AuthRequest, JwtPayload } from '../types/index.js'
import { isBlacklisted } from '../utils/tokenBlacklist.js'

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' })
    return
  }

  try {
    const blacklisted = await isBlacklisted(token)
    if (blacklisted) {
      res.status(401).json({ error: 'Token has been revoked.' })
      return
    }
  } catch {
    // Blacklist check failure is non-fatal — proceed with verification
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role }
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Access denied.' })
      return
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions.' })
      return
    }
    next()
  }
}

export function generateTokens(payload: JwtPayload) {
  const accessToken = jwt.sign(payload as object, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as jwt.SignOptions)
  const refreshToken = jwt.sign(payload as object, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions)
  return { accessToken, refreshToken }
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtPayload
}
