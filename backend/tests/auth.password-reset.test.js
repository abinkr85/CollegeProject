import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  hash: vi.fn(),
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    passwordReset: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  config: {
    NODE_ENV: 'test',
    JWT_ACCESS_EXPIRY: '15m',
  },
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
  revokeAllUserTokens: vi.fn().mockResolvedValue(true),
  verifyOtp: vi.fn(),
  generateOtp: vi.fn().mockReturnValue('123456'),
  hashOtp: vi.fn().mockResolvedValue('hashed-123456'),
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: mocks.compare,
    hash: mocks.hash,
  },
  compare: mocks.compare,
  hash: mocks.hash,
}))

vi.mock('../src/config/prisma.js', () => ({
  prisma: mocks.prisma,
}))

vi.mock('../src/config/index.js', () => ({
  config: mocks.config,
}))

vi.mock('../src/services/email.service.js', () => ({
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
}))

vi.mock('../src/modules/auth/token.service.js', () => ({
  blacklistAccessToken: vi.fn(),
  generateTokenPair: vi.fn(),
  revokeAllUserTokens: mocks.revokeAllUserTokens,
  rotateRefreshToken: vi.fn(),
}))

vi.mock('../src/utils/otp.util.js', () => ({
  generateOtp: mocks.generateOtp,
  hashOtp: mocks.hashOtp,
  verifyOtp: mocks.verifyOtp,
}))

import { requestPasswordReset, resetPasswordWithOtp } from '../src/modules/auth/auth.service.js'

describe('Password Reset Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hash.mockResolvedValue('new-hashed-password')
  })

  describe('requestPasswordReset', () => {
    it('returns generic message and dummy resetToken if user does not exist (anti-enumeration)', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null)

      const result = await requestPasswordReset({ email: 'ghost@example.com' })

      expect(result.message).toBe('If an account with that email exists, a verification code has been sent.')
      expect(typeof result.resetToken).toBe('string')
      expect(result.resetToken.length).toBeGreaterThan(10)
      expect(mocks.prisma.passwordReset.create).not.toHaveBeenCalled()
      expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('creates password reset record and triggers email when user exists', async () => {
      const mockUser = { id: 'usr-123', email: 'student@example.com', name: 'Alice' }
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser)
      mocks.prisma.passwordReset.deleteMany.mockResolvedValue({ count: 1 })
      mocks.prisma.passwordReset.create.mockResolvedValue({
        id: 'reset-challenge-uuid',
        expiresAt: new Date(Date.now() + 600000),
      })

      const result = await requestPasswordReset({ email: 'student@example.com' })

      expect(result.message).toContain('verification code has been sent')
      expect(result.resetToken).toBe('reset-challenge-uuid')
      expect(mocks.prisma.passwordReset.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'usr-123', consumedAt: null },
      })
      expect(mocks.prisma.passwordReset.create).toHaveBeenCalled()
      expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith('student@example.com', '123456')
    })
  })

  describe('resetPasswordWithOtp', () => {
    it('throws UnauthorizedError if challenge is not found or expired', async () => {
      mocks.prisma.passwordReset.findUnique.mockResolvedValue(null)

      await expect(
        resetPasswordWithOtp({
          resetToken: 'invalid-token',
          email: 'student@example.com',
          code: '123456',
          newPassword: 'NewSecurePassword123!',
        })
      ).rejects.toThrow('Verification code is invalid or expired')
    })

    it('throws UnauthorizedError if challenge belongs to different email', async () => {
      mocks.prisma.passwordReset.findUnique.mockResolvedValue({
        id: 'tok-1',
        consumedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
        user: { id: 'u1', email: 'other@example.com' },
      })

      await expect(
        resetPasswordWithOtp({
          resetToken: 'tok-1',
          email: 'student@example.com',
          code: '123456',
          newPassword: 'NewSecurePassword123!',
        })
      ).rejects.toThrow('Verification code is invalid or expired')
    })

    it('rejects if attempts exceed limit (>= 5)', async () => {
      mocks.prisma.passwordReset.findUnique.mockResolvedValue({
        id: 'tok-1',
        consumedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        attempts: 5,
        user: { id: 'u1', email: 'student@example.com' },
      })

      await expect(
        resetPasswordWithOtp({
          resetToken: 'tok-1',
          email: 'student@example.com',
          code: '123456',
          newPassword: 'NewSecurePassword123!',
        })
      ).rejects.toThrow('Too many failed verification attempts')
    })

    it('increments attempts on invalid OTP code', async () => {
      mocks.prisma.passwordReset.findUnique.mockResolvedValue({
        id: 'tok-1',
        codeHash: 'correct-hash',
        consumedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        attempts: 2,
        user: { id: 'u1', email: 'student@example.com' },
      })
      mocks.verifyOtp.mockResolvedValue(false)
      mocks.prisma.passwordReset.update.mockResolvedValue({})

      await expect(
        resetPasswordWithOtp({
          resetToken: 'tok-1',
          email: 'student@example.com',
          code: '000000',
          newPassword: 'NewSecurePassword123!',
        })
      ).rejects.toThrow('Invalid verification code')

      expect(mocks.prisma.passwordReset.update).toHaveBeenCalledWith({
        where: { id: 'tok-1' },
        data: { attempts: { increment: 1 } },
      })
    })

    it('successfully resets password, consumes challenge, and revokes sessions', async () => {
      mocks.prisma.passwordReset.findUnique.mockResolvedValue({
        id: 'tok-1',
        codeHash: 'correct-hash',
        consumedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
        user: { id: 'usr-123', email: 'student@example.com' },
      })
      mocks.verifyOtp.mockResolvedValue(true)
      mocks.prisma.user.update.mockResolvedValue({})
      mocks.prisma.passwordReset.update.mockResolvedValue({})

      const result = await resetPasswordWithOtp({
        resetToken: 'tok-1',
        email: 'student@example.com',
        code: '123456',
        newPassword: 'NewSecurePassword123!',
      })

      expect(result.message).toContain('Password has been reset successfully')
      expect(mocks.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr-123' },
        data: {
          password: 'new-hashed-password',
          loginFailedAttempts: 0,
          lockedUntil: null,
        },
      })
      expect(mocks.prisma.passwordReset.update).toHaveBeenCalledWith({
        where: { id: 'tok-1' },
        data: { consumedAt: expect.any(Date) },
      })
      expect(mocks.revokeAllUserTokens).toHaveBeenCalledWith('usr-123')
    })
  })
})
