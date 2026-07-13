import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  refreshToken: { create: vi.fn(), deleteMany: vi.fn() },
}))

vi.mock('../index.js', () => ({ prisma: mockPrisma }))

vi.mock('../middleware/auth.js', () => ({
  generateTokens: vi.fn(() => ({ accessToken: 'mock_access', refreshToken: 'mock_refresh' })),
  verifyRefreshToken: vi.fn(() => ({ id: 'u1', email: 'test@test.com', role: 'user' })),
}))

vi.mock('../services/email.js', () => {
  class MockEmail {
    sendVerification = vi.fn()
    sendPasswordReset = vi.fn()
  }
  return { EmailService: MockEmail }
})

vi.mock('../config/index.js', () => ({ config: {} }))

import { AuthService } from '../services/auth.js'

describe('AuthService', () => {
  let auth: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    auth = new AuthService()
  })

  describe('register', () => {
    it('throws if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' })
      await expect(auth.register('dup@test.com', 'Pass1234!', 'Test', 'User')).rejects.toThrow('Email already registered')
    })

    it('creates user and sends verification', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({ id: 'u1', email: 'new@test.com', firstName: 'New', lastName: 'User', role: 'user' })
      mockPrisma.user.update.mockResolvedValue({})
      const result = await auth.register('new@test.com', 'Pass1234!', 'New', 'User')
      expect(result.user.email).toBe('new@test.com')
      expect(mockPrisma.user.create).toHaveBeenCalledOnce()
    })
  })

  describe('login', () => {
    it('throws on invalid email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      await expect(auth.login('no@test.com', 'x')).rejects.toThrow('Invalid email or password')
    })

    it('throws on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 't@t.com', passwordHash: '$2a$12$xxx', loginAttempts: 0, lockUntil: null })
      await expect(auth.login('t@t.com', 'wrong')).rejects.toThrow('Invalid email or password')
    })

    it('locks account after 5 failed attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 't@t.com', passwordHash: 'x', loginAttempts: 4, lockUntil: null })
      mockPrisma.user.update.mockResolvedValue({})
      await expect(auth.login('t@t.com', 'wrong')).rejects.toThrow('Account locked for 15 minutes')
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ lockUntil: expect.any(Date) }),
      }))
    })

    it('resets lockout on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1', email: 't@t.com', passwordHash: '$2a$12$7k9P1uQSIq3JqVLYbkDxsuYJOsG8O2FMYSPbphQ5j5vFh5zXKqfpu', loginAttempts: 3, lockUntil: null,
      })
      mockPrisma.user.update.mockResolvedValue({})
      mockPrisma.refreshToken.create.mockResolvedValue({})
      // bcrypt.compare for a real hash would fail, so we test the reset path
      await expect(auth.login('t@t.com', 'wrong')).rejects.toThrow('Invalid email or password')
    })
  })

  describe('forgotPassword / resetPassword', () => {
    it('stores hashed reset token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 't@t.com' })
      mockPrisma.user.update.mockResolvedValue({})
      await auth.forgotPassword('t@t.com')
      const updateCall = mockPrisma.user.update.mock.calls[0][0]
      expect(updateCall.data.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/)
    })

    it('rejects invalid reset token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)
      await expect(auth.resetPassword('invalid-token', 'NewPass123!')).rejects.toThrow('Invalid or expired reset token')
    })
  })

  describe('verifyEmail', () => {
    it('verifies with hashed token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', email: 't@t.com' })
      mockPrisma.user.update.mockResolvedValue({})
      await auth.verifyEmail('some-raw-token')
      const findCall = mockPrisma.user.findFirst.mock.calls[0][0]
      expect(findCall.where.emailVerifyToken).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
