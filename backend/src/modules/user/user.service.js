import { prisma } from '../../config/prisma.js'
import { NotFoundError } from '../../utils/ApiError.js'
import { logger } from '../../utils/logger.js'
import { revokeAllUserTokens } from '../auth/token.service.js'

export const getUserSettings = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      createdAt: true,
      emailInstantAlerts: true,
      emailDailyDigest: true,
    },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  return {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || '',
      createdAt: user.createdAt,
    },
    notifications: {
      emailInstantAlerts: user.emailInstantAlerts,
      emailDailyDigest: user.emailDailyDigest,
    },
  }
}

export const updateProfile = async (userId, dto) => {
  const updateData = {
    name: dto.name,
  }

  if (dto.department !== undefined) {
    updateData.department = dto.department || null
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      createdAt: true,
    },
  })

  logger.info({ userId }, 'User profile updated')

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    department: updated.department || '',
    createdAt: updated.createdAt,
  }
}

export const updateNotifications = async (userId, dto) => {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      emailInstantAlerts: dto.emailInstantAlerts,
      emailDailyDigest: dto.emailDailyDigest,
    },
    select: {
      emailInstantAlerts: true,
      emailDailyDigest: true,
    },
  })

  logger.info({ userId }, 'User notification preferences updated')

  return {
    emailInstantAlerts: updated.emailInstantAlerts,
    emailDailyDigest: updated.emailDailyDigest,
  }
}

export const revokeAllSessions = async (userId) => {
  await revokeAllUserTokens(userId)
  logger.info({ userId }, 'All user refresh tokens revoked')
  return { message: 'All active sessions have been signed out' }
}
