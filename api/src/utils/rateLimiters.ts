import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible'
import type { Request, Response, NextFunction } from 'express'
import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || ''

let redisClient: Redis | null = null
let redisAvailable = false

/**
 * Initialize Redis client for rate limiting.
 * Called once at startup; falls back to in-memory if Redis is unavailable.
 */
export function initRateLimiterRedis(): void {
  if (!REDIS_URL) {
    console.log('[RateLimiter] REDIS_URL not set — using in-memory mode')
    return
  }
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      return Math.min(times * 200, 5000)
    },
    lazyConnect: true,
    enableOfflineQueue: false,
  })
  redisClient.on('error', () => { redisAvailable = false })
  redisClient.on('connect', () => { redisAvailable = true })
  redisClient.connect().then(() => {
    console.log('[RateLimiter] Connected to Redis')
  }).catch(() => {
    console.warn('[RateLimiter] Redis connection failed — using in-memory')
    redisClient = null
  })
}

function createLimiter(points: number, duration: number, keyPrefix: string) {
  if (redisAvailable && redisClient) {
    return new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: `rl:${keyPrefix}`,
      points,
      duration,
      insuranceLimiter: new RateLimiterMemory({ points, duration }),
    })
  }
  return new RateLimiterMemory({ points, duration })
}

// ── Limiters ────────────────────────────────────────────────

const auth = createLimiter(20, 15 * 60, 'auth')
const trading = createLimiter(100, 60, 'trading')
const admin = createLimiter(60, 60, 'admin')
const register = createLimiter(5, 60 * 60, 'register')
const forgotPassword = createLimiter(3, 60 * 60, 'forgot-pwd')
const changePassword = createLimiter(5, 15 * 60, 'change-pwd')
const general = createLimiter(200, 60, 'general')

// ── Middleware factory ───────────────────────────────────────

function rateLimitMiddleware(
  limiter: RateLimiterRedis | RateLimiterMemory,
  message: string,
  keyGenerator?: (req: Request) => string,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = keyGenerator ? keyGenerator(req) : req.ip || req.socket.remoteAddress || 'unknown'
    try {
      const result = await limiter.consume(key)
      res.setHeader('RateLimit-Limit', result.consumedPoints)
      res.setHeader('RateLimit-Remaining', result.remainingPoints)
      next()
    } catch (rejRes: any) {
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000) || 60
      res.setHeader('RateLimit-Limit', limiter.points)
      res.setHeader('RateLimit-Remaining', 0)
      res.setHeader('Retry-After', retryAfter)
      res.status(429).json({ error: message, retryAfter })
    }
  }
}

// ── Exported middleware ──────────────────────────────────────

export const authLimiter = rateLimitMiddleware(auth, 'Too many auth attempts, please try again later')
export const tradingLimiter = rateLimitMiddleware(trading, 'Too many trading requests, slow down')
export const adminLimiter = rateLimitMiddleware(admin, 'Too many admin requests, slow down')
export const registerLimiter = rateLimitMiddleware(register, 'Too many registration attempts from this IP, please try again later')
export const forgotPasswordLimiter = rateLimitMiddleware(forgotPassword, 'Too many password reset requests, please try again later')
export const changePasswordLimiter = rateLimitMiddleware(changePassword, 'Too many password change attempts, please try again later')
export const generalLimiter = rateLimitMiddleware(general, 'Too many requests, please slow down')
