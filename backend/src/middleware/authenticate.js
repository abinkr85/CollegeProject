import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { redis } from '../config/redis.js'
import { UnauthorizedError } from '../utils/ApiError.js'

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    let token = null

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length).trim()
    } else if (req.query?.token) {
      token = req.query.token
    }

    if (!token) {
      throw new UnauthorizedError('Missing or malformed Authorization header')
    }

    const isBlacklisted = await redis.get(`blacklist:${token}`)

    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked')
    }

    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET)

    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      isSuperAdmin: Boolean(decoded.isSuperAdmin),
      canDeleteStudents: Boolean(decoded.canDeleteStudents),
    }
    req.token = token

    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Access token expired'))
    }

    if (err.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid access token'))
    }

    next(err)
  }
}
