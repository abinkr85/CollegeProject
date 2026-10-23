import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../../config/prisma.js'
import {
  ConflictError,
  ForbiddenError,
  LockedError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../utils/ApiError.js'
import { config } from '../../config/index.js'
import { emailQueue } from '../../queues/email.queue.js'
import { logger } from '../../utils/logger.js'
import {
  blacklistAccessToken,
  generateTokenPair,
  revokeAllUserTokens,
  rotateRefreshToken,
} from './token.service.js'
import { createMfaChallenge, resendMfaChallenge, verifyMfaChallenge } from './mfa.service.js'
import { generateOtp, hashOtp, verifyOtp } from '../../utils/otp.util.js'
import { sendPasswordResetEmail } from '../../services/email.service.js'

const SALT_ROUNDS = 12
const DUMMY_PASSWORD_HASH = '$2b$12$lDme/0hM3D7wv9/sRnx0N.UZHGQMbPxSMx/nfqP0/FHTQyp4qs2R6'

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isSuperAdmin: true,
  canDeleteStudents: true,
  department: true,
  batch: true,
  year: true,
  employeeId: true,
  joiningDate: true,
  isBlocked: true,
  createdAt: true,
}

const getLockoutMessage = (lockedUntil) => {
  const seconds = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000))
  const minutes = Math.ceil(seconds / 60)
  return `Account temporarily locked. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
}

const assertAdminRegistrationAllowed = (adminRegistrationKey) => {
  if (!config.ADMIN_REGISTRATION_KEY) {
    throw new ServiceUnavailableError('Admin registration is not configured')
  }

  if (adminRegistrationKey !== config.ADMIN_REGISTRATION_KEY) {
    throw new ForbiddenError('Invalid admin registration key')
  }
}

export const registerUser = async (dto, { expectedRole } = {}) => {
  const role = expectedRole ?? dto.role ?? 'STUDENT'

  if (role === 'ADMIN') {
    assertAdminRegistrationAllowed(dto.adminRegistrationKey)
  }

  const exists = await prisma.user.findUnique({
    where: {
      email: dto.email,
    },
    select: {
      id: true,
    },
  })

  if (exists) {
    throw new ConflictError('Email already registered')
  }

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS)

  const user = await prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      role,
    },
    select: USER_SELECT,
  })

  await emailQueue.add(
    'welcome',
    {
      to: user.email,
      name: user.name,
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  )

  const { accessToken, refreshToken } = await generateTokenPair(user)

  return {
    ...user,
    accessToken,
    refreshToken,
    user,
  }
}

export const loginUser = async (dto, { expectedRole } = {}) => {
  const user = await prisma.user.findUnique({
    where: {
      email: dto.email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
      isSuperAdmin: true,
      canDeleteStudents: true,
      department: true,
      batch: true,
      year: true,
      employeeId: true,
      joiningDate: true,
      isBlocked: true,
      loginFailedAttempts: true,
      lockedUntil: true,
      createdAt: true,
    },
  })

  if (user?.isBlocked) {
    throw new UnauthorizedError('Your account has been suspended by an administrator. Please contact campus support.')
  }

  if (user && expectedRole && user.role !== expectedRole) {
    await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH)
    throw new UnauthorizedError('Invalid email or password')
  }

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw new LockedError(getLockoutMessage(user.lockedUntil))
  }

  const passwordMatch = user
    ? await bcrypt.compare(dto.password, user.password)
    : await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH)

  if (!user || !passwordMatch) {
    if (user) {
      const lockWindowExpired = user.lockedUntil && user.lockedUntil <= new Date()
      const nextAttempts = (lockWindowExpired ? 0 : user.loginFailedAttempts) + 1
      const shouldLock = nextAttempts >= config.ACCOUNT_LOCKOUT_MAX_ATTEMPTS
      const lockedUntil = shouldLock
        ? new Date(Date.now() + config.ACCOUNT_LOCKOUT_MINUTES * 60 * 1000)
        : null

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          loginFailedAttempts: nextAttempts,
          lockedUntil,
        },
      })

      if (shouldLock) {
        logger.warn({ userId: user.id }, 'User account locked after failed password attempts')
        throw new LockedError(getLockoutMessage(lockedUntil))
      }
    }

    throw new UnauthorizedError('Invalid email or password')
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      loginFailedAttempts: 0,
      lockedUntil: null,
    },
  })

  if (config.MFA_ENABLED) {
    const challenge = await createMfaChallenge(user)
    return {
      mfaRequired: true,
      ...challenge,
    }
  }

  const { accessToken, refreshToken } = await generateTokenPair(user)

  return {
    mfaRequired: false,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isSuperAdmin: Boolean(user.isSuperAdmin),
      canDeleteStudents: Boolean(user.canDeleteStudents),
      department: user.department,
      batch: user.batch,
      year: user.year,
      employeeId: user.employeeId,
      joiningDate: user.joiningDate,
    },
  }
}

export const verifyMfaLogin = async (dto, { expectedRole } = {}) => {
  const user = await verifyMfaChallenge(dto)

  if (expectedRole && user.role !== expectedRole) {
    throw new UnauthorizedError('Invalid verification flow')
  }

  const tokens = await generateTokenPair(user)

  return {
    ...tokens,
    user,
  }
}

export const resendMfa = async (dto) => {
  return resendMfaChallenge(dto)
}

export const refreshSession = async (incomingToken) => {
  const { accessToken, refreshToken, user } = await rotateRefreshToken(incomingToken)

  return {
    accessToken,
    refreshToken,
    user,
  }
}

export const logoutUser = async (token, userId) => {
  await Promise.all([
    blacklistAccessToken(token, config.JWT_ACCESS_EXPIRY),
    revokeAllUserTokens(userId),
  ])
}

export const changePassword = async (userId, dto, { accessToken } = {}) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      password: true,
    },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  const valid = await bcrypt.compare(dto.currentPassword, user.password)

  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect')
  }

  const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS)

  await Promise.all([
    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: newHash,
      },
    }),
    revokeAllUserTokens(userId),
    accessToken ? blacklistAccessToken(accessToken, config.JWT_ACCESS_EXPIRY) : Promise.resolve(),
  ])

  logger.info({ userId }, 'User password changed and sessions revoked')
}

export const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true },
  })

  const genericMessage = 'If an account with that email exists, a verification code has been sent.'

  if (!user) {
    return {
      message: genericMessage,
      resetToken: crypto.randomUUID(),
    }
  }

  await prisma.passwordReset.deleteMany({
    where: {
      userId: user.id,
      consumedAt: null,
    },
  })

  const code = generateOtp()
  const codeHash = await hashOtp(code)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  const challenge = await prisma.passwordReset.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt,
    },
    select: {
      id: true,
      expiresAt: true,
    },
  })

  if (config.NODE_ENV !== 'production') {
    console.log(`\n🔑 [DEV PASSWORD RESET OTP] Verification code for ${user.email}: ${code}\n`)
  }

  sendPasswordResetEmail(user.email, code).catch((err) => {
    logger.warn({ error: err.message, to: user.email }, 'Failed to send password reset email')
  })

  return {
    message: genericMessage,
    resetToken: challenge.id,
  }
}

export const resetPasswordWithOtp = async ({ resetToken, email, code, newPassword }) => {
  const normalizedEmail = email.trim().toLowerCase()
  const challenge = await prisma.passwordReset.findUnique({
    where: { id: resetToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  })

  if (
    !challenge ||
    challenge.consumedAt ||
    challenge.expiresAt < new Date() ||
    challenge.user.email.toLowerCase() !== normalizedEmail
  ) {
    throw new UnauthorizedError('Verification code is invalid or expired')
  }

  if (challenge.attempts >= 5) {
    throw new UnauthorizedError('Too many failed verification attempts. Please request a new code.')
  }

  const isValid = await verifyOtp(code.trim(), challenge.codeHash)

  if (!isValid) {
    await prisma.passwordReset.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    })
    throw new UnauthorizedError('Invalid verification code')
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS)

  await Promise.all([
    prisma.user.update({
      where: { id: challenge.user.id },
      data: {
        password: newHash,
        loginFailedAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.passwordReset.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    }),
    revokeAllUserTokens(challenge.user.id),
  ])

  logger.info({ userId: challenge.user.id }, 'Password reset completed via OTP and sessions revoked')

  return { message: 'Password has been reset successfully. Please sign in with your new password.' }
}
