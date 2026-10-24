import { Redis } from 'ioredis'
import { config } from './index.js'
import { logger } from '../utils/logger.js'

const createRedisClient = () => {
  const client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => {
      if (times > 5) {
        // Back off to 30 seconds once retried several times to prevent spinning on quota limits
        return 30000
      }
      return Math.min(times * 1000, 5000)
    },
    reconnectOnError: (err) => {
      const msg = err?.message || ''
      if (msg.includes('max requests limit exceeded')) {
        return false
      }
      return 1
    },
  })

  client.on('connect', () => logger.info('Redis connected'))
  client.on('error', (err) => logger.error({ err }, 'Redis error'))
  client.on('close', () => logger.warn('Redis connection closed'))

  return client
}

export const redis = createRedisClient()
export const redisSubscriber = createRedisClient()
