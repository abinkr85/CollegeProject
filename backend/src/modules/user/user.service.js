import { prisma } from '../../config/prisma.js'
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/ApiError.js'
import { logger } from '../../utils/logger.js'
import { revokeAllUserTokens } from '../auth/token.service.js'
import { uploadToCloudinary } from '../../config/cloudinary.js'
import { config } from '../../config/index.js'

export const getUserSettings = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
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
      idCardValidUpto: true,
      idCardExpiresAt: true,
      emergencyPhone: true,
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
      phone: user.phone || '',
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
      idCardValidUpto: user.idCardValidUpto || '',
      idCardExpiresAt: user.idCardExpiresAt,
      emergencyPhone: user.emergencyPhone || '',
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

  if (dto.phone !== undefined) {
    updateData.phone = dto.phone || null
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
      phone: true,
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
    phone: updated.phone || '',
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

const parseExpiryDate = (validUpto) => {
  if (!validUpto) return null
  const str = String(validUpto).trim()
  if (!str) return null

  // 4 digit year e.g. "2026"
  if (/^\d{4}$/.test(str)) {
    return new Date(`${str}-12-31T23:59:59.999Z`)
  }

  // Find 4 digit year starting with 20 e.g. "Valid Upto : 2026"
  const match = str.match(/\b(20\d{2})\b/)
  if (match) {
    const year = match[1]
    const parsed = new Date(str)
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000) {
      return parsed
    }
    return new Date(`${year}-12-31T23:59:59.999Z`)
  }

  const parsed = new Date(str)
  return isNaN(parsed.getTime()) ? null : parsed
}

export const scanAndCropIdCard = async ({ imageBuffer, imageDataUrl, orientation = 'vertical' }) => {
  const buf = imageBuffer || toBuffer(imageDataUrl)
  if (!buf) {
    throw new BadRequestError('No valid image provided for scanning')
  }

  const base64Data = `data:image/jpeg;base64,${buf.toString('base64')}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.NLP_TIMEOUT_MS || 8000)

    const response = await fetch(`${config.NLP_SERVICE_URL}/card/detect-crop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-NLP-Secret': config.RELOAD_SECRET,
      },
      body: JSON.stringify({
        image: base64Data,
        orientation,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      return data
    } else {
      const errText = await response.text()
      logger.warn({ status: response.status, errText }, 'NLP OpenCV service returned non-200 for card crop')
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'NLP OpenCV card crop request failed or timed out, returning fallback')
  }

  return {
    success: true,
    detected: false,
    image: base64Data,
  }
}

export const scanAndCropIdCardMulti = async ({
  frontBuffer,
  frontDataUrl,
  backBuffer,
  backDataUrl,
  orientation = 'vertical',
}) => {
  const frontBuf = frontBuffer || toBuffer(frontDataUrl)
  if (!frontBuf) {
    throw new BadRequestError('Front image is required for scanning')
  }

  const frontBase64 = `data:image/jpeg;base64,${frontBuf.toString('base64')}`
  const backBuf = backBuffer || toBuffer(backDataUrl)
  const backBase64 = backBuf ? `data:image/jpeg;base64,${backBuf.toString('base64')}` : ''

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.NLP_TIMEOUT_MS || 12000)

    const response = await fetch(`${config.NLP_SERVICE_URL}/idcard_recognition_multi_page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-NLP-Secret': config.RELOAD_SECRET,
      },
      body: JSON.stringify({
        base64_1: frontBase64,
        base64_2: backBase64,
        orientation,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      return data
    } else {
      const errText = await response.text()
      logger.warn({ status: response.status, errText }, 'NLP OpenCV multi-page crop returned non-200')
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'NLP OpenCV multi-page crop request failed or timed out')
  }

  return {
    Status: 'Ok',
    success: true,
    front: {
      success: true,
      detected: false,
      image: frontBase64,
    },
    back: backBase64
      ? {
          success: true,
          detected: false,
          image: backBase64,
        }
      : null,
  }
}

export const uploadIdCard = async (
  userId,
  {
    studentIdNumber,
    name,
    phone,
    department,
    batch,
    year,
    validUpto,
    emergencyPhone,
    frontBuffer,
    backBuffer,
    frontDataUrl,
    backDataUrl,
  }
) => {
  const cleanId = (studentIdNumber || '').trim().toUpperCase()
  if (!cleanId) {
    throw new BadRequestError('Valid Student ID / Roll Number is required')
  }

  // Check unique ID number against database to prevent duplicate student profiles
  const existingWithSameId = await prisma.user.findFirst({
    where: {
      studentIdNumber: {
        equals: cleanId,
        mode: 'insensitive',
      },
      id: {
        not: userId,
      },
    },
    select: {
      id: true,
      studentIdNumber: true,
      name: true,
    },
  })

  if (existingWithSameId) {
    logger.warn(
      { userId, attemptedId: cleanId, existingUserId: existingWithSameId.id },
      'Duplicate student ID card registration rejected'
    )
    throw new ConflictError(
      `Student ID / Roll Number '${cleanId}' is already registered to another account. Duplicate student ID cards are not permitted.`
    )
  }

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

  const cleanValidUpto = validUpto ? String(validUpto).trim() : null
  const expiresAt = parseExpiryDate(cleanValidUpto)

  const updateData = {
    studentIdNumber: cleanId,
    idCardValidUpto: cleanValidUpto,
    idCardExpiresAt: expiresAt,
    idCardFrontUrl: frontUpload?.secure_url || null,
    idCardBackUrl: backUpload?.secure_url || null,
    idCardStatus: 'VERIFIED',
    idCardScannedAt: new Date(),
    idCardVerifiedAt: new Date(),
    idCardRejectionReason: null,
  }

  if (name && name.trim()) updateData.name = name.trim()
  if (phone && phone.trim()) updateData.phone = phone.trim()
  if (emergencyPhone && emergencyPhone.trim()) updateData.emergencyPhone = emergencyPhone.trim()
  if (department && department.trim()) updateData.department = department.trim()
  if (batch && batch.trim()) updateData.batch = batch.trim()
  if (year && year.trim()) updateData.year = year.trim()

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      department: true,
      batch: true,
      year: true,
      studentIdNumber: true,
      idCardFrontUrl: true,
      idCardBackUrl: true,
      idCardStatus: true,
      idCardScannedAt: true,
      idCardVerifiedAt: true,
      idCardRejectionReason: true,
      idCardValidUpto: true,
      idCardExpiresAt: true,
      emergencyPhone: true,
    },
  })

  logger.info(
    { userId, studentIdNumber: updated.studentIdNumber, validUpto: updated.idCardValidUpto },
    'Student ID card uploaded and verified'
  )
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
          idCardValidUpto: null,
          idCardExpiresAt: null,
          emergencyPhone: null,
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
      phone: true,
      department: true,
      batch: true,
      year: true,
      studentIdNumber: true,
      idCardStatus: true,
      idCardFrontUrl: true,
      idCardBackUrl: true,
      idCardScannedAt: true,
      idCardVerifiedAt: true,
      idCardRejectionReason: true,
      idCardValidUpto: true,
      idCardExpiresAt: true,
      emergencyPhone: true,
    },
  })

  logger.info({ userId, status }, 'Student ID card status updated')
  return updated
}

