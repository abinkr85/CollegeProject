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

export const uploadIdCard = async (req, res) => {
  const frontBuffer = req.files?.frontImage?.[0]?.buffer
  const backBuffer = req.files?.backImage?.[0]?.buffer

  const result = await userService.uploadIdCard(req.user.id, {
    studentIdNumber: req.body.studentIdNumber,
    frontBuffer,
    backBuffer,
    frontDataUrl: req.body.frontImage,
    backDataUrl: req.body.backImage,
    department: req.body.department,
    year: req.body.year,
  })

  return ApiResponse.ok(res, result, 'Student ID card uploaded and verified successfully')
}

