import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  hash: vi.fn(),
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
  config: {
    ACCOUNT_LOCKOUT_MAX_ATTEMPTS: 5,
    ACCOUNT_LOCKOUT_MINUTES: 5,
    ADMIN_REGISTRATION_KEY: 'valid-admin-registration-key',
    JWT_ACCESS_EXPIRY: '15m',
    MFA_ENABLED: true,
  },
  emailQueue: {
    add: vi.fn(),
  },
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
  },
  createMfaChallenge: vi.fn(),
  verifyMfaChallenge: vi.fn(),
  generateTokenPair: vi.fn(),
  rotateRefreshToken: vi.fn(),
  blacklistAccessToken: vi.fn(),
  revokeAllUserTokens: vi.fn(),
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

vi.mock('../src/queues/email.queue.js', () => ({
  emailQueue: mocks.emailQueue,
}))

vi.mock('../src/utils/logger.js', () => ({
  logger: mocks.logger,
}))

vi.mock('../src/modules/auth/mfa.service.js', () => ({
  createMfaChallenge: mocks.createMfaChallenge,
  verifyMfaChallenge: mocks.verifyMfaChallenge,
}))

vi.mock('../src/modules/auth/token.service.js', () => ({
  generateTokenPair: mocks.generateTokenPair,
  rotateRefreshToken: mocks.rotateRefreshToken,
  blacklistAccessToken: mocks.blacklistAccessToken,
  revokeAllUserTokens: mocks.revokeAllUserTokens,
}))

const authService = await import('../src/modules/auth/auth.service.js')
const { changePasswordSchema } = await import('../src/modules/auth/auth.schema.js')

describe('auth security controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('locks an account for five minutes after five failed password attempts', async () => {
    const user = {
      id: 'user-1',
      name: 'Student',
      email: 'student@campus.edu',
      password: '$2b$12$hash',
      role: 'STUDENT',
      loginFailedAttempts: 4,
      lockedUntil: null,
    }

    mocks.prisma.user.findUnique.mockResolvedValue(user)
    mocks.compare.mockResolvedValue(false)
    mocks.prisma.user.update.mockResolvedValue(user)

    await expect(
      authService.loginUser({
        email: user.email,
        password: 'Wrong@1234',
      })
    ).rejects.toMatchObject({
      statusCode: 423,
      message: expect.stringContaining('Account temporarily locked'),
    })

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: {
        id: user.id,
      },
      data: {
        loginFailedAttempts: 5,
        lockedUntil: expect.any(Date),
      },
    })
  })

  it('rejects login immediately while the account is locked', async () => {
    const lockedUntil = new Date(Date.now() + 5 * 60 * 1000)

    mocks.prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@campus.edu',
      password: '$2b$12$hash',
      role: 'STUDENT',
      loginFailedAttempts: 5,
      lockedUntil,
    })

    await expect(
      authService.loginUser({
        email: 'student@campus.edu',
        password: 'Correct@1234',
      })
    ).rejects.toMatchObject({
      statusCode: 423,
    })

    expect(mocks.compare).not.toHaveBeenCalled()
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
  })

  it('requires MFA after a correct password instead of issuing tokens immediately', async () => {
    const user = {
      id: 'user-1',
      name: 'Student',
      email: 'student@campus.edu',
      password: '$2b$12$hash',
      role: 'STUDENT',
      loginFailedAttempts: 2,
      lockedUntil: null,
    }

    mocks.prisma.user.findUnique.mockResolvedValue(user)
    mocks.compare.mockResolvedValue(true)
    mocks.prisma.user.update.mockResolvedValue(user)
    mocks.createMfaChallenge.mockResolvedValue({
      mfaToken: '4bbbc110-1395-4935-8f54-6b53e410c689',
      expiresAt: new Date(),
      delivery: {
        channel: 'email',
        destination: 's***t@campus.edu',
      },
    })

    const result = await authService.loginUser({
      email: user.email,
      password: 'Correct@1234',
    })

    expect(result).toMatchObject({
      mfaRequired: true,
      mfaToken: expect.any(String),
      delivery: {
        channel: 'email',
      },
    })
    expect(result.accessToken).toBeUndefined()
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: {
        id: user.id,
      },
      data: {
        loginFailedAttempts: 0,
        lockedUntil: null,
      },
    })
  })

  it('issues tokens only after a valid MFA challenge', async () => {
    const user = {
      id: 'user-1',
      name: 'Student',
      email: 'student@campus.edu',
      role: 'STUDENT',
    }

    mocks.verifyMfaChallenge.mockResolvedValue(user)
    mocks.generateTokenPair.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })

    const result = await authService.verifyMfaLogin({
      mfaToken: '4bbbc110-1395-4935-8f54-6b53e410c689',
      code: '123456',
    })

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user,
    })
  })

  it('requires the admin registration key before creating an admin account', async () => {
    await expect(
      authService.registerUser(
        {
          name: 'Admin',
          email: 'admin@campus.edu',
          password: 'Admin@1234',
          adminRegistrationKey: 'wrong-key',
        },
        {
          expectedRole: 'ADMIN',
        }
      )
    ).rejects.toMatchObject({
      statusCode: 403,
    })

    expect(mocks.prisma.user.create).not.toHaveBeenCalled()
  })

  it('rejects a valid password submitted through the wrong role portal', async () => {
    const user = {
      id: 'student-1',
      name: 'Student',
      email: 'student@campus.edu',
      password: '$2b$12$hash',
      role: 'STUDENT',
      loginFailedAttempts: 0,
      lockedUntil: null,
    }

    mocks.prisma.user.findUnique.mockResolvedValue(user)
    mocks.compare.mockResolvedValue(true)

    await expect(
      authService.loginUser(
        {
          email: user.email,
          password: 'Correct@1234',
        },
        {
          expectedRole: 'ADMIN',
        }
      )
    ).rejects.toMatchObject({
      statusCode: 401,
    })

    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
    expect(mocks.createMfaChallenge).not.toHaveBeenCalled()
  })

  it('validates password changes against the visible security policy', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1!',
        newPassword: 'short1!',
        confirmPassword: 'short1!',
      }).success
    ).toBe(false)

    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1!',
        newPassword: 'longpassword!',
        confirmPassword: 'longpassword!',
      }).success
    ).toBe(false)

    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1!',
        newPassword: 'longpassword1',
        confirmPassword: 'longpassword1',
      }).success
    ).toBe(false)

    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1!',
        newPassword: 'passwo1!',
        confirmPassword: 'passwo1!',
      }).success
    ).toBe(true)
  })

  it('rejects password changes when the current password is incorrect', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      password: '$2b$12$old-hash',
    })
    mocks.compare.mockResolvedValue(false)

    await expect(
      authService.changePassword('user-1', {
        currentPassword: 'WrongPassword1!',
        newPassword: 'newpassword1!',
        confirmPassword: 'newpassword1!',
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Current password is incorrect',
    })

    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
    expect(mocks.revokeAllUserTokens).not.toHaveBeenCalled()
    expect(mocks.blacklistAccessToken).not.toHaveBeenCalled()
  })

  it('changes the password and revokes all sessions', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      password: '$2b$12$old-hash',
    })
    mocks.compare.mockResolvedValue(true)
    mocks.hash.mockResolvedValue('$2b$12$new-hash')
    mocks.prisma.user.update.mockResolvedValue({
      id: 'user-1',
    })

    await authService.changePassword(
      'user-1',
      {
        currentPassword: 'OldPassword1!',
        newPassword: 'newpassword1!',
        confirmPassword: 'newpassword1!',
      },
      {
        accessToken: 'active-access-token',
      }
    )

    expect(mocks.compare).toHaveBeenCalledWith('OldPassword1!', '$2b$12$old-hash')
    expect(mocks.hash).toHaveBeenCalledWith('newpassword1!', 12)
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
      },
      data: {
        password: '$2b$12$new-hash',
      },
    })
    expect(mocks.revokeAllUserTokens).toHaveBeenCalledWith('user-1')
    expect(mocks.blacklistAccessToken).toHaveBeenCalledWith('active-access-token', '15m')
  })
})
