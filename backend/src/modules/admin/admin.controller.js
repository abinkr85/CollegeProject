import * as adminService from './admin.service.js'
import * as notificationService from './notification.service.js'
import { ApiResponse } from '../../utils/ApiResponse.js'

export const getAll = async (req, res) => {
  const { page, limit, ...filters } = req.query
  const { data, total } = await adminService.getAllComplaints(filters, { page, limit })

  return ApiResponse.paginated(res, data, {
    page,
    limit,
    total,
  })
}

export const update = async (req, res) => {
  const complaint = await adminService.updateComplaint(req.params.id, req.user.id, req.body)
  return ApiResponse.ok(res, complaint, 'Complaint updated')
}

export const exportCSV = async (req, res) => adminService.exportComplaints(req.query, res)

export const addPublicUpdate = async (req, res) => {
  const result = await adminService.submitPublicUpdate(req.params.id, req.user.id, req.body)
  return ApiResponse.created(res, result, 'Public update sent')
}

export const addInternalNote = async (req, res) => {
  const result = await adminService.submitInternalNote(req.params.id, req.user.id, req.body)
  return ApiResponse.created(res, result, 'Internal note saved')
}

export const updateStatus = async (req, res) => {
  const result = await adminService.patchStatus(req.params.id, req.user.id, req.body)
  return ApiResponse.ok(res, result, 'Status updated')
}

export const updateAssignment = async (req, res) => {
  const result = await adminService.patchAssignment(req.params.id, req.user.id, req.body)
  return ApiResponse.ok(res, result, 'Assignment updated')
}

export const updatePriority = async (req, res) => {
  const result = await adminService.patchPriority(req.params.id, req.user.id, req.body)
  return ApiResponse.ok(res, result, 'Priority updated')
}

export const loadSettings = async (req, res) => {
  const settings = await adminService.getSettings(req.user.id)
  return ApiResponse.ok(res, settings, 'Settings loaded')
}

export const saveProfileSettings = async (req, res) => {
  const profile = await adminService.updateProfileSettings(req.user.id, req.body)
  return ApiResponse.ok(res, profile, 'Profile settings updated')
}

export const saveNotificationSettings = async (req, res) => {
  const notifications = await adminService.updateNotificationSettings(req.user.id, req.body)
  return ApiResponse.ok(res, notifications, 'Notification settings updated')
}

export const saveSystemSettings = async (req, res) => {
  const system = await adminService.updateSystemSettings(req.user.id, req.body)
  return ApiResponse.ok(res, system, 'System preferences updated')
}

export const listNotifications = async (req, res) => {
  const result = await notificationService.listNotifications(req.user.id, req.query)
  return ApiResponse.ok(res, result, 'Notifications loaded')
}

export const markNotificationRead = async (req, res) => {
  const notification = await notificationService.markNotificationRead(req.user.id, req.params.id)
  return ApiResponse.ok(res, notification, 'Notification marked as read')
}

export const markAllNotificationsRead = async (req, res) => {
  const result = await notificationService.markAllNotificationsRead(req.user.id)
  return ApiResponse.ok(res, result, 'Notifications marked as read')
}

export const listUsers = async (req, res) => {
  const { page, limit, ...filters } = req.query
  const { users, total, metrics } = await adminService.getUsers(filters, { page, limit })

  return res.status(200).json({
    success: true,
    message: 'Users loaded',
    data: users,
    pagination: {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      total,
      totalPages: Math.ceil(total / (Number(limit) || 10)),
    },
    metrics,
  })
}

export const unlockUser = async (req, res) => {
  const result = await adminService.unlockUser(req.params.id)
  return ApiResponse.ok(res, result, 'User account unlocked successfully')
}
