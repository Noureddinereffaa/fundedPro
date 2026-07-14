import { Router } from 'express'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { AuthService } from '../services/auth.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'
import { config } from '../config/index.js'
import { AppError, getErrorInfo } from '../middleware/errorHandler.js'
import { addToBlacklist } from '../utils/tokenBlacklist.js'
import { authLimiter, registerLimiter, forgotPasswordLimiter, changePasswordLimiter } from '../utils/rateLimiters.js'

const router = Router()
const authService = new AuthService()

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>_\-]/, 'Password must contain at least one special character')

const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const isProd = process.env.NODE_ENV === 'production'
const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

// Register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)
    const result = await authService.register(data.email, data.password, data.firstName, data.lastName)
    res.cookie('refreshToken', result.refreshToken, cookieOpts)
    res.json({ user: result.user, accessToken: result.accessToken })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const data = loginSchema.parse(req.body)
    const result = await authService.login(data.email, data.password, req.headers['user-agent'], req.ip)
    res.cookie('refreshToken', result.refreshToken, cookieOpts)
    res.json({ user: result.user, accessToken: result.accessToken })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// Forgot password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })
    await authService.forgotPassword(email)
    res.json({ message: 'If the email exists, a reset link has been sent' })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' })
    const pwdResult = passwordSchema.safeParse(password)
    if (!pwdResult.success) {
      return res.status(400).json({ error: pwdResult.error.issues[0].message })
    }
    await authService.resetPassword(token, password)
    res.json({ message: 'Password reset successfully' })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// Verify email — for browser redirect from email link
router.get('/verify-email/:token', async (req, res) => {
  try {
    await authService.verifyEmail(req.params.token)
    res.redirect(`${config.CLIENT_URL}/verify-email/${req.params.token}`)
  } catch (error: unknown) {
    res.redirect(`${config.CLIENT_URL}/verify-email/${req.params.token}?error=invalid`)
  }
})

// Verify email — JSON API for frontend
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ error: 'Token is required' })
    await authService.verifyEmail(token)
    res.json({ message: 'Email verified successfully' })
  } catch (error: unknown) {
    const { message } = getErrorInfo(error)
    const statusCode = error instanceof AppError ? error.statusCode : 400
    res.status(statusCode).json({ error: message || 'Invalid or expired verification link' })
  }
})

// Verify reset token
router.get('/verify-reset/:token', async (req, res) => {
  try {
    await authService.verifyResetToken(req.params.token)
    res.json({ valid: true })
  } catch (error: unknown) {
    const { message } = getErrorInfo(error)
    res.status(400).json({ error: message })
  }
})

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body.token
    if (!token) return res.status(401).json({ error: 'No refresh token' })
    const tokens = await authService.refreshToken(token)
    res.cookie('refreshToken', tokens.refreshToken, cookieOpts)
    res.json({ accessToken: tokens.accessToken })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// Logout
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.token
    if (refreshToken) {
      await authService.logout(refreshToken)
      // Also blacklist the access token if provided
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        const accessToken = authHeader.slice(7)
        try {
          const decoded = jwt.verify(accessToken, config.JWT_SECRET) as jwt.JwtPayload
          if (decoded.exp) await addToBlacklist(accessToken, decoded.exp * 1000)
        } catch { /* token already expired — ignore */ }
      }
    }
    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out' })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// Get profile
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const profile = await authService.getProfile(req.user!.id)
    res.json(profile)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// Update profile
router.put('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const profile = await authService.updateProfile(req.user!.id, req.body)
    res.json(profile)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// Change password
router.post('/change-password', authenticate, changePasswordLimiter, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (newPassword) {
      const pwdResult = passwordSchema.safeParse(newPassword)
      if (!pwdResult.success) {
        return res.status(400).json({ error: pwdResult.error.issues[0].message })
      }
    }
    await authService.changePassword(req.user!.id, currentPassword, newPassword)
    // Blacklist current access token — password change invalidates all sessions
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const accessToken = authHeader.slice(7)
      try {
        const decoded = jwt.verify(accessToken, config.JWT_SECRET) as jwt.JwtPayload
        if (decoded.exp) await addToBlacklist(accessToken, decoded.exp * 1000)
      } catch { /* already expired */ }
    }
    res.json({ message: 'Password changed' })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

export default router
