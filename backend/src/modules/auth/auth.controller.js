import * as authService from './auth.service.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { UnauthorizedError } from '../../utils/ApiError.js'
import { clearRefreshTokenCookie, setRefreshTokenCookie } from './token.service.js'

export const registerStudent = async (req, res) => {
  const result = await authService.registerUser(req.body, { expectedRole: 'STUDENT' })
  if (result.refreshToken) {
    setRefreshTokenCookie(res, result.refreshToken)
  }
  return ApiResponse.created(res, result, 'Student account created successfully')
}

export const registerAdmin = async (req, res) => {
  const result = await authService.registerUser(req.body, { expectedRole: 'ADMIN' })
  if (result.refreshToken) {
    setRefreshTokenCookie(res, result.refreshToken)
  }
  return ApiResponse.created(res, result, 'Admin account created successfully')
}

export const loginStudent = async (req, res) => {
  const result = await authService.loginUser(req.body, { expectedRole: 'STUDENT' })
  if (result.refreshToken) {
    setRefreshTokenCookie(res, result.refreshToken)
  }
  const message = result.mfaRequired ? 'Student verification code sent' : 'Student login successful'
  return ApiResponse.ok(res, result, message)
}

export const loginAdmin = async (req, res) => {
  const result = await authService.loginUser(req.body, { expectedRole: 'ADMIN' })
  if (result.refreshToken) {
    setRefreshTokenCookie(res, result.refreshToken)
  }
  const message = result.mfaRequired ? 'Admin verification code sent' : 'Admin login successful'
  return ApiResponse.ok(res, result, message)
}

export const verifyStudentMfa = async (req, res) => {
  const { refreshToken, ...result } = await authService.verifyMfaLogin(req.body, { expectedRole: 'STUDENT' })
  setRefreshTokenCookie(res, refreshToken)
  return ApiResponse.ok(res, result, 'Student login successful')
}

export const verifyAdminMfa = async (req, res) => {
  const { refreshToken, ...result } = await authService.verifyMfaLogin(req.body, { expectedRole: 'ADMIN' })
  setRefreshTokenCookie(res, refreshToken)
  return ApiResponse.ok(res, result, 'Admin login successful')
}

export const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken

  if (!token) {
    throw new UnauthorizedError('No refresh token provided')
  }

  const { refreshToken, accessToken, user } = await authService.refreshSession(token)
  setRefreshTokenCookie(res, refreshToken)

  return ApiResponse.ok(res, { accessToken, user }, 'Token refreshed')
}

export const logout = async (req, res) => {
  await authService.logoutUser(req.token, req.user.id)
  clearRefreshTokenCookie(res)
  return ApiResponse.noContent(res)
}

export const me = async (req, res) => ApiResponse.ok(res, req.user)

export const changePassword = async (req, res) => {
  await authService.changePassword(req.user.id, req.body, {
    accessToken: req.token,
  })
  clearRefreshTokenCookie(res)
  return ApiResponse.ok(res, null, 'Password changed. Please login again.')
}
