import { ApiResponse } from '../../utils/ApiResponse.js'
import * as userService from './user.service.js'

export const getProfile = async (req, res) => {
  const settings = await userService.getUserSettings(req.user.id)
  return ApiResponse.ok(res, settings, 'User settings retrieved')
}

export const updateProfile = async (req, res) => {
  const profile = await userService.updateProfile(req.user.id, req.body)
  return ApiResponse.ok(res, profile, 'Profile updated successfully')
}

export const updateNotifications = async (req, res) => {
  const notifications = await userService.updateNotifications(req.user.id, req.body)
  return ApiResponse.ok(res, notifications, 'Notification preferences updated')
}

export const revokeSessions = async (req, res) => {
  const result = await userService.revokeAllSessions(req.user.id)
  return ApiResponse.ok(res, result, result.message)
}
