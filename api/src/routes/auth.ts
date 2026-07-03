import { Router } from 'express'
import { z } from 'zod'
import { AuthService } from '../services/auth.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'

const router = Router()
const authService = new AuthService()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const isProd = process.env.NODE_ENV === 'production'
const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, maxAge: 7 * 24 * 60 * 60 * 1000 }

// Register
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)
    const result = await authService.register(data.email, data.password, data.firstName, data.lastName)
    res.cookie('refreshToken', result.refreshToken, cookieOpts)
    res.json({ user: result.user, accessToken: result.accessToken })
  } catch (error: any) {
    res.status(error.statusCode || 400).json({ error: error.message })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body)
    const result = await authService.login(data.email, data.password, req.headers['user-agent'], req.ip)
    res.cookie('refreshToken', result.refreshToken, cookieOpts)
    res.json({ user: result.user, accessToken: result.accessToken })
  } catch (error: any) {
    res.status(error.statusCode || 400).json({ error: error.message })
  }
})

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })
    await authService.forgotPassword(email)
    res.json({ message: 'If the email exists, a reset link has been sent' })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' })
    await authService.resetPassword(token, password)
    res.json({ message: 'Password reset successfully' })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Verify email
router.get('/verify-email/:token', async (req, res) => {
  try {
    await authService.verifyEmail(req.params.token)
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${req.params.token}`)
  } catch (error: any) {
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${req.params.token}?error=invalid`)
  }
})

// Verify reset token
router.get('/verify-reset/:token', async (req, res) => {
  try {
    await authService.verifyResetToken(req.params.token)
    res.json({ valid: true })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
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
  } catch (error: any) {
    res.status(error.statusCode || 401).json({ error: error.message })
  }
})

// Logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body.token
    if (token) await authService.logout(token)
    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get profile
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const profile = await authService.getProfile(req.user!.id)
    res.json(profile)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Update profile
router.put('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const profile = await authService.updateProfile(req.user!.id, req.body)
    res.json(profile)
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// Change password
router.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    await authService.changePassword(req.user!.id, currentPassword, newPassword)
    res.json({ message: 'Password changed' })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

export default router