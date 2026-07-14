import { Router } from 'express'
import { z } from 'zod'
import { TwoFactorService } from '../services/twoFactor.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'
import { getErrorInfo } from '../middleware/errorHandler.js'

const router = Router()
const twoFactorService = new TwoFactorService()

const codeSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be 6 digits'),
})

// GET /api/2fa/status — Get 2FA status
router.get('/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const status = await twoFactorService.getStatus(req.user!.id)
    res.json(status)
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// POST /api/2fa/setup — Generate secret + QR code
router.post('/setup', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await twoFactorService.generateSecret(req.user!.id)
    res.json({
      secret: result.secret,
      otpauthUrl: result.otpauthUrl,
      qrCode: result.qrCodeDataUrl,
    })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// POST /api/2fa/verify — Verify code to enable 2FA
router.post('/verify', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = codeSchema.parse(req.body)
    await twoFactorService.verifySetup(req.user!.id, data.code)
    res.json({ message: 'Two-factor authentication enabled' })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

// POST /api/2fa/disable — Disable 2FA (requires valid code)
router.post('/disable', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = codeSchema.parse(req.body)
    await twoFactorService.disable(req.user!.id, data.code)
    res.json({ message: 'Two-factor authentication disabled' })
  } catch (error: unknown) {
    const { statusCode, message } = getErrorInfo(error)
    res.status(statusCode).json({ error: message })
  }
})

export default router
