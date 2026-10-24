import { Queue } from 'bullmq'
import { redis } from '../config/redis.js'
import { logger } from '../utils/logger.js'

export const emailQueue = new Queue('email', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 50,
    },
  },
})

emailQueue.on('error', (err) => {
  logger.warn({ err: err?.message || err }, 'Email queue Redis error')
})
