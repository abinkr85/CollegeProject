import * as repo from './admin.repository.js'
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/ApiError.js'
import { withCache, invalidateCachePattern } from '../../utils/cache.js'
import { emailQueue } from '../../queues/email.queue.js'
import { logger } from '../../utils/logger.js'
import { streamToCSV } from '../../utils/csvExport.js'
import { notifyStudentPublicUpdate, notifyStudentStatusUpdate } from '../notification/notification.service.js'
import { broadcastAdminEvent } from '../realtime/realtime.service.js'
import { revokeAllUserTokens } from '../auth/token.service.js'

const cacheKeyForList = (filters, pagination) =>
  `admin:complaints:${JSON.stringify({
    filters,
    page: pagination.page,
    limit: pagination.limit,
  })}`

const VALID_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['OPEN', 'RESOLVED'],
  RESOLVED: ['OPEN', 'IN_PROGRESS'],
}

const validateStatusTransition = (oldStatus, newStatus) => {
  if (oldStatus === newStatus) return
  const allowed = VALID_TRANSITIONS[oldStatus] || []
  if (!allowed.includes(newStatus)) {
    throw new BadRequestError(`Invalid status transition from ${oldStatus} to ${newStatus}`)
  }
}

export const getAllComplaints = (filters, pagination) =>
  withCache(cacheKeyForList(filters, pagination), 30, () => repo.findComplaints(filters, pagination))

export const updateComplaint = async (id, adminId, dto) => {
  const complaint = await repo.findComplaintForUpdate(id)

  if (!complaint) {
    throw new NotFoundError('Complaint not found')
  }

  const oldStatus = complaint.status
  validateStatusTransition(oldStatus, dto.status)

  const updateData = {
    status: dto.status,
    ...(dto.priority ? { priority: dto.priority } : {}),
    department: dto.department ?? null,
    adminNote: dto.adminNote ?? null,
    resolvedAt: dto.status === 'RESOLVED' ? complaint.resolvedAt ?? new Date() : null,
  }

  const logNote = dto.adminNote ?? (
    dto.priority && dto.priority !== complaint.priority
      ? `Status: ${dto.status}, Priority updated to ${dto.priority}`
      : 'Complaint updated by admin'
  )

  const updated = await repo.updateComplaintAndLog(id, updateData, {
    complaintId: id,
    changedBy: adminId,
    oldStatus,
    newStatus: dto.status,
    note: logNote,
    isInternal: false,
  })

  Promise.allSettled([
    emailQueue.add(
      'statusUpdate',
      {
        to: complaint.user.email,
        complaint: updated,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    ),
    oldStatus !== dto.status
      ? notifyStudentStatusUpdate(complaint, dto.status)
      : null,
    dto.adminNote && dto.adminNote !== complaint.adminNote
      ? notifyStudentPublicUpdate(complaint, dto.adminNote)
      : null,
    invalidateCachePattern('analytics:*'),
    invalidateCachePattern(`complaints:user:${complaint.userId}:*`),
    invalidateCachePattern('admin:complaints:*'),
    broadcastAdminEvent('COMPLAINT_UPDATED', { complaintId: id, source: 'ADMIN_UPDATE' }),
  ]).then(results => {
    for (const result of results) {
      if (result.status === 'rejected') {
        logger.warn({ err: result.reason }, 'Post-update side effect failed')
      }
    }
  })

  return updated
}

export const exportComplaints = async (filters, res) => {
  const complaints = await repo.findComplaintsForExport(filters)

  const rows = complaints.map(complaint => ({
    ID: complaint.id,
    Title: complaint.title,
    Category: complaint.category ?? 'Uncategorized',
    Priority: complaint.priority ?? 'N/A',
    Status: complaint.status,
    Department: complaint.department ?? 'Unassigned',
    'Student Name': complaint.user.name,
    'Student Email': complaint.user.email,
    'Created At': complaint.createdAt.toISOString(),
    'Resolved At': complaint.resolvedAt?.toISOString() ?? '',
  }))

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="complaints.csv"')

  return streamToCSV(rows, res, [
    'ID',
    'Title',
    'Category',
    'Priority',
    'Status',
    'Department',
    'Student Name',
    'Student Email',
    'Created At',
    'Resolved At',
  ])
}

export const submitPublicUpdate = async (id, adminId, body) => {
  const complaint = await repo.findComplaintForUpdate(id)

  if (!complaint) {
    throw new NotFoundError('Complaint not found')
  }

  const logNote = `Public update: "${body.message.slice(0, 60)}${body.message.length > 60 ? '...' : ''}"`

  const pubUpdate = await repo.createPublicUpdateAndLog(
    {
      complaintId: id,
      message: body.message,
      createdByAdminId: adminId,
    },
    {
      complaintId: id,
      changedBy: adminId,
      oldStatus: complaint.status,
      newStatus: complaint.status,
      note: body.message,
      isInternal: false,
    }
  )

  Promise.allSettled([
    notifyStudentPublicUpdate(complaint, body.message, pubUpdate.id),
    invalidateCachePattern('analytics:*'),
    invalidateCachePattern(`complaints:user:${complaint.userId}:*`),
    invalidateCachePattern('admin:complaints:*'),
    broadcastAdminEvent('COMPLAINT_UPDATED', { complaintId: id, source: 'ADMIN_PUBLIC_UPDATE' }),
  ])

  return pubUpdate
}

export const submitInternalNote = async (id, adminId, body) => {
  const complaint = await repo.findComplaintForUpdate(id)

  if (!complaint) {
    throw new NotFoundError('Complaint not found')
  }

  const intNote = await repo.createInternalNoteAndLog(
    {
      complaintId: id,
      note: body.note,
      createdByAdminId: adminId,
    },
    {
      complaintId: id,
      changedBy: adminId,
      oldStatus: complaint.status,
      newStatus: complaint.status,
      note: body.note,
      isInternal: true,
    }
  )

  Promise.allSettled([
    invalidateCachePattern('analytics:*'),
    invalidateCachePattern(`complaints:user:${complaint.userId}:*`),
    invalidateCachePattern('admin:complaints:*'),
    broadcastAdminEvent('COMPLAINT_UPDATED', { complaintId: id, source: 'ADMIN_INTERNAL_NOTE' }),
  ])

  return intNote
}

export const patchStatus = async (id, adminId, body) => {
  const complaint = await repo.findComplaintForUpdate(id)

  if (!complaint) {
    throw new NotFoundError('Complaint not found')
  }

  const oldStatus = complaint.status
  validateStatusTransition(oldStatus, body.status)

  const updateData = {
    status: body.status,
    resolvedAt: body.status === 'RESOLVED' ? complaint.resolvedAt ?? new Date() : null,
  }

  const updated = await repo.updateComplaintAndLog(id, updateData, {
    complaintId: id,
    changedBy: adminId,
    oldStatus,
    newStatus: body.status,
    note: `Status updated to ${body.status}`,
    isInternal: false,
  })

  Promise.allSettled([
    emailQueue.add(
      'statusUpdate',
      {
        to: complaint.user.email,
        complaint: updated,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    ),
    oldStatus !== body.status
      ? notifyStudentStatusUpdate(complaint, body.status)
      : null,
    invalidateCachePattern('analytics:*'),
    invalidateCachePattern(`complaints:user:${complaint.userId}:*`),
    invalidateCachePattern('admin:complaints:*'),
    broadcastAdminEvent('COMPLAINT_UPDATED', { complaintId: id, source: 'ADMIN_PATCH_STATUS' }),
  ])

  return updated
}

export const patchAssignment = async (id, adminId, body) => {
  const complaint = await repo.findComplaintForUpdate(id)

  if (!complaint) {
    throw new NotFoundError('Complaint not found')
  }

  const updateData = {
    department: body.department ?? null,
  }

  const logNote = body.department
    ? `Assigned to ${body.department} department`
    : 'Removed department assignment'

  const updated = await repo.updateComplaintAndLog(id, updateData, {
    complaintId: id,
    changedBy: adminId,
    oldStatus: complaint.status,
    newStatus: complaint.status,
    note: logNote,
    isInternal: false,
  })

  Promise.allSettled([
    invalidateCachePattern('analytics:*'),
    invalidateCachePattern(`complaints:user:${complaint.userId}:*`),
    invalidateCachePattern('admin:complaints:*'),
    broadcastAdminEvent('COMPLAINT_UPDATED', { complaintId: id, source: 'ADMIN_PATCH_ASSIGNMENT' }),
  ])

  return updated
}

export const patchPriority = async (id, adminId, body) => {
  const complaint = await repo.findComplaintForUpdate(id)

  if (!complaint) {
    throw new NotFoundError('Complaint not found')
  }

  const updateData = {
    priority: body.priority,
  }

  const updated = await repo.updateComplaintAndLog(id, updateData, {
    complaintId: id,
    changedBy: adminId,
    oldStatus: complaint.status,
    newStatus: complaint.status,
    note: `Priority changed to ${body.priority}`,
    isInternal: false,
  })

  Promise.allSettled([
    invalidateCachePattern('analytics:*'),
    invalidateCachePattern(`complaints:user:${complaint.userId}:*`),
    invalidateCachePattern('admin:complaints:*'),
    broadcastAdminEvent('COMPLAINT_UPDATED', { complaintId: id, source: 'ADMIN_PATCH_PRIORITY' }),
  ])

  return updated
}

export const getSettings = async (userId) => {
  const user = await repo.findUserById(userId)

  if (!user) {
    throw new NotFoundError('Admin user not found')
  }

  const defaultTimezone = await repo.getSystemPreference('default_timezone')
  const dataRetentionPolicy = await repo.getSystemPreference('data_retention_years')

  return {
    profile: {
      name: user.name,
      email: user.email,
      role: user.isSuperAdmin ? 'Super Administrator' : 'Administrator',
      isSuperAdmin: user.isSuperAdmin,
    },
    notifications: {
      emailInstantAlerts: user.emailInstantAlerts,
      emailDailyDigest: user.emailDailyDigest,
    },
    system: {
      defaultTimezone: defaultTimezone?.value || 'Asia/Kolkata',
      dataRetentionPolicy: dataRetentionPolicy?.value || '3',
    },
  }
}

export const updateProfileSettings = async (userId, dto) => {
  const updated = await repo.updateUser(userId, {
    name: dto.name,
  })

  return {
    name: updated.name,
    email: updated.email,
    role: updated.isSuperAdmin ? 'Super Administrator' : 'Administrator',
    isSuperAdmin: updated.isSuperAdmin,
  }
}

export const updateNotificationSettings = async (userId, dto) => {
  const updated = await repo.updateUser(userId, {
    emailInstantAlerts: dto.emailInstantAlerts,
    emailDailyDigest: dto.emailDailyDigest,
  })

  return {
    emailInstantAlerts: updated.emailInstantAlerts,
    emailDailyDigest: updated.emailDailyDigest,
  }
}

export const updateSystemSettings = async (userId, dto) => {
  const user = await repo.findUserById(userId)

  if (!user) {
    throw new NotFoundError('Admin user not found')
  }

  const currentRetentionRecord = await repo.getSystemPreference('data_retention_years')
  const currentRetentionPolicy = currentRetentionRecord?.value || '3'

  if (dto.dataRetentionPolicy !== currentRetentionPolicy && !user.isSuperAdmin) {
    throw new ForbiddenError('Only Super Administrators can update data retention policy')
  }

  await Promise.all([
    repo.upsertSystemPreference('default_timezone', dto.defaultTimezone),
    repo.upsertSystemPreference('data_retention_years', dto.dataRetentionPolicy),
  ])

  return {
    defaultTimezone: dto.defaultTimezone,
    dataRetentionPolicy: dto.dataRetentionPolicy,
  }
}

export const getUsers = async (filters, pagination) => {
  return repo.findUsers(filters, pagination)
}

export const unlockUser = async (userId) => {
  const user = await repo.findUserById(userId)
  if (!user) {
    throw new NotFoundError('User not found')
  }

  const updated = await repo.unlockUserById(userId)
  logger.info({ userId }, 'Admin unlocked user account')
  return updated
}

export const deleteUser = async (actingUserId, targetUserId) => {
  const actingUser = await repo.findUserById(actingUserId)
  if (!actingUser) {
    throw new NotFoundError('Acting admin not found')
  }

  if (actingUserId === targetUserId) {
    throw new BadRequestError('Administrators cannot delete their own account')
  }

  const targetUser = await repo.findUserById(targetUserId)
  if (!targetUser) {
    throw new NotFoundError('User not found')
  }

  // Super Admin can delete anyone (except self).
  // Regular Admins can ONLY delete STUDENT accounts IF actingUser.canDeleteStudents is true.
  if (actingUser.isSuperAdmin) {
    // Authorized
  } else if (actingUser.canDeleteStudents && targetUser.role === 'STUDENT') {
    // Authorized to delete student account
  } else {
    throw new ForbiddenError('You do not have permission to remove this user account')
  }

  const deleted = await repo.deleteUserById(targetUserId)
  logger.info(
    { targetUserId, targetEmail: targetUser.email, targetRole: targetUser.role, removedBy: actingUser.email },
    'User removed from system'
  )

  Promise.allSettled([
    invalidateCachePattern('admin:users:*'),
    invalidateCachePattern('analytics:*'),
    invalidateCachePattern(`complaints:user:${targetUserId}:*`),
    invalidateCachePattern('admin:complaints:*'),
    broadcastAdminEvent('USER_DELETED', { userId: targetUserId, email: targetUser.email }),
  ])

  return deleted
}

export const blockUser = async (actingUserId, targetUserId, isBlocked) => {
  const actingUser = await repo.findUserById(actingUserId)
  if (!actingUser || !actingUser.isSuperAdmin) {
    throw new ForbiddenError('Only Super Administrators can block or unblock accounts')
  }
  if (actingUserId === targetUserId) {
    throw new BadRequestError('Super Administrators cannot block their own account')
  }

  const targetUser = await repo.findUserById(targetUserId)
  if (!targetUser) {
    throw new NotFoundError('User not found')
  }

  const updated = await repo.setUserBlockedStatus(targetUserId, isBlocked)
  if (isBlocked) {
    await revokeAllUserTokens(targetUserId)
  }

  logger.info(
    { actingUserId, targetUserId, isBlocked, targetEmail: targetUser.email },
    'User account blocked status updated'
  )

  Promise.allSettled([
    invalidateCachePattern('admin:users:*'),
    broadcastAdminEvent('USER_UPDATED', { userId: targetUserId, isBlocked }),
  ])

  return updated
}

export const updateStudentDeletionPermission = async (actingUserId, targetUserId, canDeleteStudents) => {
  const actingUser = await repo.findUserById(actingUserId)
  if (!actingUser || !actingUser.isSuperAdmin) {
    throw new ForbiddenError('Only Super Administrators can grant or revoke student removal permissions')
  }

  const targetUser = await repo.findUserById(targetUserId)
  if (!targetUser) {
    throw new NotFoundError('User not found')
  }
  if (targetUser.role !== 'ADMIN') {
    throw new BadRequestError('Student removal permissions can only be granted to Administrators')
  }

  const updated = await repo.setAdminStudentDeletionPermission(targetUserId, canDeleteStudents)
  logger.info(
    { actingUserId, targetUserId, canDeleteStudents, targetEmail: targetUser.email },
    'Admin student deletion permission updated'
  )

  Promise.allSettled([
    invalidateCachePattern('admin:users:*'),
    broadcastAdminEvent('USER_UPDATED', { userId: targetUserId, canDeleteStudents }),
  ])

  return updated
}

export const updateStaffProfile = async (actingUserId, targetUserId, data) => {
  const actingUser = await repo.findUserById(actingUserId)
  if (!actingUser) {
    throw new NotFoundError('Acting admin not found')
  }

  if (!actingUser.isSuperAdmin && actingUserId !== targetUserId) {
    throw new ForbiddenError('You can only update your own staff profile unless you are a Super Administrator')
  }

  const targetUser = await repo.findUserById(targetUserId)
  if (!targetUser) {
    throw new NotFoundError('User not found')
  }

  const updated = await repo.updateStaffProfileById(targetUserId, data)
  logger.info({ actingUserId, targetUserId, data }, 'Staff profile details updated')

  Promise.allSettled([
    invalidateCachePattern('admin:users:*'),
    broadcastAdminEvent('USER_UPDATED', { userId: targetUserId }),
  ])

  return updated
}

export const updateSuperAdminStatus = async (actingUserId, targetUserId, isSuperAdmin) => {
  const actingUser = await repo.findUserById(actingUserId)
  if (!actingUser) {
    throw new NotFoundError('Acting admin not found')
  }
  if (!actingUser.isSuperAdmin) {
    throw new ForbiddenError('Only Super Administrators can modify Super Administrator privileges')
  }
  if (actingUserId === targetUserId && !isSuperAdmin) {
    throw new BadRequestError('Super Administrators cannot remove their own Super Administrator status')
  }

  const targetUser = await repo.findUserById(targetUserId)
  if (!targetUser) {
    throw new NotFoundError('User not found')
  }
  if (targetUser.role !== 'ADMIN') {
    throw new BadRequestError('Super Administrator privileges can only be assigned to Administrators')
  }

  const updated = await repo.setSuperAdminStatus(targetUserId, isSuperAdmin)
  logger.info(
    { targetUserId, targetEmail: targetUser.email, isSuperAdmin, modifiedBy: actingUser.email },
    'Super Administrator privilege updated'
  )

  Promise.allSettled([
    invalidateCachePattern('admin:users:*'),
    broadcastAdminEvent('USER_UPDATED', { userId: targetUserId, isSuperAdmin }),
  ])

  return updated
}
