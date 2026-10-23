import { Prisma } from '@prisma/client'
import { Sentry } from '../config/sentry.js'
import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'
import { config } from '../config/index.js'

export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors?.length > 0 && {
        errors: err.errors,
      }),
      requestId: req.id,
    })
  }

  if (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413) {
    return res.status(413).json({
      success: false,
      message: 'Uploaded payload is too large. Please use a compressed card image.',
      requestId: req.id,
    })
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaErrors = {
      P2000: {
        status: 400,
        message: 'The provided value is too long for the database field',
      },
      P2002: {
        status: 409,
        message: 'A record with this value already exists',
      },
      P2025: {
        status: 404,
        message: 'Record not found',
      },
      P2003: {
        status: 400,
        message: 'Referenced record does not exist',
      },
      P2014: {
        status: 400,
        message: 'Invalid relation',
      },
    }

    const mapped = prismaErrors[err.code]

    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        message: mapped.message,
        requestId: req.id,
      })
    }
  }

  logger.error(
    {
      err,
      requestId: req.id,
    },
    'Unhandled error'
  )

  if (!res.sentry) {
    Sentry.captureException(err)
  }

  return res.status(500).json({
    success: false,
    message: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    requestId: req.id,
    ...(config.NODE_ENV !== 'production' && {
      stack: err.stack,
    }),
  })
}
