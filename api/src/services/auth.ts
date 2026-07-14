import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../index.js'
import { generateTokens, verifyRefreshToken } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { config } from '../config/index.js'
import { AuthUser } from '../types/index.js'
import { EmailService } from './email.js'

const emailService = new EmailService()

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export interface LoginResult {
  user: { id: string; email: string; firstName: string | null; lastName: string | null; role: string }
  accessToken?: string
  refreshToken?: string
  requiresTwoFactor?: boolean
}

export class AuthService {
  async register(email: string, password: string, firstName?: string, lastName?: string) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new AppError('Email already registered', 409)

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, emailVerified: false },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })

    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role })
    await this.saveRefreshToken(user.id, tokens.refreshToken)

    // Send verification email
    const verifyToken = crypto.randomBytes(32).toString('hex')
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: hashToken(verifyToken), emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    })
    await emailService.sendVerification(email, verifyToken)

    return { user, ...tokens }
  }
  // ... keep the rest of the methods unchanged

  async login(email: string, password: string, userAgent?: string, ip?: string, totpCode?: string): Promise<LoginResult> {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) throw new AppError('Invalid email or password', 401)

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remaining = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000)
      throw new AppError(`Account locked. Try again in ${remaining} minute(s)`, 423)
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      const attempts = user.loginAttempts + 1
      if (attempts >= 5) {
        await prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: 0, lockUntil: new Date(Date.now() + 15 * 60 * 1000) },
        })
        throw new AppError('Account locked for 15 minutes due to too many failed attempts', 423)
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: attempts },
      })
      throw new AppError('Invalid email or password', 401)
    }

    // Password is valid — reset lockout
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockUntil: null },
    })

    const userInfo = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    }

    // 2FA check: if enabled, require TOTP code before issuing tokens
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        return { user: userInfo, requiresTwoFactor: true }
      }
      // Verify TOTP code
      const { verify: verifyOtp } = await import('otplib')
      const result = await verifyOtp({ token: totpCode, secret: user.twoFactorSecret! })
      if (!result.valid) {
        throw new AppError('Invalid two-factor code', 401)
      }
    }

    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role })
    await this.saveRefreshToken(user.id, tokens.refreshToken, userAgent, ip)

    return {
      user: userInfo,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }
  }

  async refreshToken(token: string) {
    const payload = verifyRefreshToken(token)
    const stored = await prisma.refreshToken.findUnique({ where: { token } })
    if (!stored || stored.expiresAt < new Date()) throw new AppError('Invalid refresh token', 401)

    await prisma.refreshToken.delete({ where: { token } })

    const tokens = generateTokens({ id: payload.id, email: payload.email, role: payload.role })
    await this.saveRefreshToken(payload.id, tokens.refreshToken)

    return tokens
  }

  async logout(token: string) {
    await prisma.refreshToken.deleteMany({ where: { token } })
  }

  async logoutAll(userId: string) {
    await prisma.refreshToken.deleteMany({ where: { userId } })
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        avatar: true,
        kycStatus: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    })
    if (!user) throw new AppError('User not found', 404)
    return user
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string; country?: string },
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, country: true },
    })
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new AppError('User not found', 404)

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new AppError('Current password is incorrect', 401)

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
    await prisma.refreshToken.deleteMany({ where: { userId } })
  }

  private async saveRefreshToken(userId: string, token: string, userAgent?: string, ip?: string) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    await prisma.refreshToken.create({ data: { userId, token, userAgent, ip, expiresAt } })
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return // Don't reveal if email exists

    const resetToken = crypto.randomBytes(32).toString('hex')
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashToken(resetToken),
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })
    await emailService.sendPasswordReset(email, resetToken)
  }

  async resetPassword(token: string, password: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashToken(token),
        resetPasswordExpires: { gt: new Date() },
      },
    })
    if (!user) throw new AppError('Invalid or expired reset token', 400)

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetPasswordToken: null, resetPasswordExpires: null },
    })
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } })
  }

  async verifyResetToken(token: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashToken(token),
        resetPasswordExpires: { gt: new Date() },
      },
    })
    if (!user) throw new AppError('Invalid or expired reset token', 400)
  }

  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: hashToken(token),
        emailVerifyExpires: { gt: new Date() },
      },
    })
    if (!user) throw new AppError('Invalid or expired verification token', 400)

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpires: null },
    })
  }
}
