import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { prisma } from '../index.js'
import { AppError } from '../middleware/errorHandler.js'
import { config } from '../config/index.js'

const ISSUER = 'Pro FundX'

export class TwoFactorService {
  /**
   * Generate a new TOTP secret and QR code for the user.
   * Does NOT enable 2FA — user must verify a code first.
   */
  async generateSecret(userId: string): Promise<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, twoFactorEnabled: true } })
    if (!user) throw new AppError('User not found', 404)
    if (user.twoFactorEnabled) throw new AppError('Two-factor authentication is already enabled. Disable it first.', 400)

    const secret = authenticator.generateSecret()
    const otpauthUrl = authenticator.keyuri(user.email, ISSUER, secret)
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

    // Store the secret temporarily (not yet enabled)
    // We use a separate key to avoid overwriting a working secret
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    })

    return { secret, otpauthUrl, qrCodeDataUrl }
  }

  /**
   * Verify the initial TOTP code to complete 2FA setup.
   * Called after generateSecret — confirms the user can generate valid codes.
   */
  async verifySetup(userId: string, token: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, twoFactorSecret: true, twoFactorEnabled: true } })
    if (!user) throw new AppError('User not found', 404)
    if (user.twoFactorEnabled) throw new AppError('Two-factor authentication is already enabled', 400)
    if (!user.twoFactorSecret) throw new AppError('No pending 2FA setup. Call /2fa/setup first.', 400)

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret })
    if (!isValid) throw new AppError('Invalid verification code. Please try again.', 400)

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    })
  }

  /**
   * Verify a TOTP code during login (after password validation).
   * Returns true if valid, throws if invalid.
   */
  async verifyLogin(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    })
    if (!user) throw new AppError('User not found', 404)
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError('Two-factor authentication is not enabled', 400)
    }

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret })
    if (!isValid) throw new AppError('Invalid two-factor code', 401)

    return true
  }

  /**
   * Disable 2FA. Requires a valid TOTP code as confirmation.
   */
  async disable(userId: string, token: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    })
    if (!user) throw new AppError('User not found', 404)
    if (!user.twoFactorEnabled) throw new AppError('Two-factor authentication is not enabled', 400)
    if (!user.twoFactorSecret) throw new AppError('2FA secret not found', 500)

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret })
    if (!isValid) throw new AppError('Invalid verification code. Cannot disable 2FA without a valid code.', 400)

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    })
  }

  /**
   * Get 2FA status for a user (does NOT expose the secret).
   */
  async getStatus(userId: string): Promise<{ enabled: boolean }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    })
    if (!user) throw new AppError('User not found', 404)
    return { enabled: user.twoFactorEnabled }
  }
}
