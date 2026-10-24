import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { redis } from '../config/redis.js'
import { config } from '../config/index.js'
import { TooManyRequestsError } from '../utils/ApiError.js'

const createLimiter = ({ windowMs, max, prefix }) => {
  if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
    return (req, res, next) => next()
  }
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true, // Fail-open: if Redis quota is exceeded or unreachable, do not crash requests with 500
    skip: (req) => req.path === '/health' || req.path === '/',
    keyGenerator: (req) => `${prefix}:${ipKeyGenerator(req.ip)}`,
    store: new RedisStore({
      sendCommand: async (...args) => {
        try {
          return await redis.call(...args)
        } catch (err) {
          // If Redis throws (e.g. Upstash quota exceeded), passOnStoreError handles it gracefully
          throw err
        }
      },
      prefix: `rl:${prefix}:`,
    }),
    handler: (req, res, next) => {
      next(new TooManyRequestsError('Too many requests. Please slow down.'))
    },
  })
}

export const generalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  prefix: 'general',
})

export const authLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  prefix: 'auth',
})

export const uploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  prefix: 'upload',
})

export const strictLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  prefix: 'strict',
})
