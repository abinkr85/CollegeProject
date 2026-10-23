import { prisma } from '../../config/prisma.js'
import { BadRequestError, NotFoundError } from '../../utils/ApiError.js'
import { logger } from '../../utils/logger.js'
import { revokeAllUserTokens } from '../auth/token.service.js'
import { uploadToCloudinary } from '../../config/cloudinary.js'

export const getUserSettings = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      batch: true,
      year: true,
      employeeId: true,
      joiningDate: true,
      isSuperAdmin: true,
      canDeleteStudents: true,
      createdAt: true,
      emailInstantAlerts: true,
      emailDailyDigest: true,
      studentIdNumber: true,
      idCardFrontUrl: true,
      idCardBackUrl: true,
      idCardStatus: true,
      idCardScannedAt: true,
      idCardVerifiedAt: true,
      idCardRejectionReason: true,
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
      batch: user.batch || '',
      year: user.year || '',
      employeeId: user.employeeId || '',
      joiningDate: user.joiningDate,
      isSuperAdmin: Boolean(user.isSuperAdmin),
      canDeleteStudents: Boolean(user.canDeleteStudents),
      createdAt: user.createdAt,
      studentIdNumber: user.studentIdNumber || '',
      idCardFrontUrl: user.idCardFrontUrl || '',
      idCardBackUrl: user.idCardBackUrl || '',
      idCardStatus: user.idCardStatus || 'UNVERIFIED',
      idCardScannedAt: user.idCardScannedAt,
      idCardVerifiedAt: user.idCardVerifiedAt,
      idCardRejectionReason: user.idCardRejectionReason || '',
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

  if (dto.batch !== undefined) {
    updateData.batch = dto.batch || null
  }

  if (dto.year !== undefined) {
    updateData.year = dto.year || null
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
      batch: true,
      year: true,
      employeeId: true,
      joiningDate: true,
      isSuperAdmin: true,
      canDeleteStudents: true,
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
    batch: updated.batch || '',
    year: updated.year || '',
    employeeId: updated.employeeId || '',
    joiningDate: updated.joiningDate,
    isSuperAdmin: Boolean(updated.isSuperAdmin),
    canDeleteStudents: Boolean(updated.canDeleteStudents),
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

const toBuffer = (fileOrDataUrl) => {
  if (!fileOrDataUrl) return null
  if (Buffer.isBuffer(fileOrDataUrl)) return fileOrDataUrl
  if (typeof fileOrDataUrl === 'string') {
    const parts = fileOrDataUrl.split(',')
    const base64 = parts.length > 1 ? parts[1] : parts[0]
    return Buffer.from(base64, 'base64')
  }
  return null
}

export const uploadIdCard = async (
  userId,
  { studentIdNumber, frontBuffer, backBuffer, frontDataUrl, backDataUrl, department, year }
) => {
  const front = frontBuffer || toBuffer(frontDataUrl)
  const back = backBuffer || toBuffer(backDataUrl)

  if (!front || !back) {
    throw new BadRequestError('Both front and back ID card images are required for verification')
  }

  let frontUpload, backUpload
  try {
    ;[frontUpload, backUpload] = await Promise.all([
      uploadToCloudinary(front, 'campus-student-ids'),
      uploadToCloudinary(back, 'campus-student-ids'),
    ])
  } catch (err) {
    logger.error({ err }, 'Cloudinary upload failed for student ID card')
    throw new BadRequestError(`Image upload failed: ${err.message || 'Storage error'}`)
  }

  const updateData = {
    studentIdNumber: studentIdNumber.trim(),
    idCardFrontUrl: frontUpload?.secure_url || null,
    idCardBackUrl: backUpload?.secure_url || null,
    idCardStatus: 'VERIFIED',
    idCardScannedAt: new Date(),
    idCardVerifiedAt: new Date(),
    idCardRejectionReason: null,
  }

  if (department) updateData.department = department
  if (year) updateData.year = year

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      year: true,
      studentIdNumber: true,
      idCardFrontUrl: true,
      idCardBackUrl: true,
      idCardStatus: true,
      idCardScannedAt: true,
      idCardVerifiedAt: true,
      idCardRejectionReason: true,
    },
  })

  logger.info({ userId, studentIdNumber: updated.studentIdNumber }, 'Student ID card uploaded and verified')
  return updated
}

export const updateIdCardStatus = async (userId, { status, rejectionReason }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new NotFoundError('User not found')
  }

  const updateData = {
    idCardStatus: status,
    ...(status === 'VERIFIED' ? { idCardVerifiedAt: new Date(), idCardRejectionReason: null } : {}),
    ...(status === 'REJECTED'
      ? { idCardRejectionReason: rejectionReason || 'ID Card details could not be verified' }
      : {}),
    ...(status === 'UNVERIFIED'
      ? {
          idCardFrontUrl: null,
          idCardBackUrl: null,
          idCardScannedAt: null,
          idCardVerifiedAt: null,
          idCardRejectionReason: null,
        }
      : {}),
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
      studentIdNumber: true,
      idCardStatus: true,
      idCardFrontUrl: true,
      idCardBackUrl: true,
      idCardScannedAt: true,
      idCardVerifiedAt: true,
      idCardRejectionReason: true,
    },
  })

  logger.info({ userId, status }, 'Student ID card status updated')
  return updated
}

