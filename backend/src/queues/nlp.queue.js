import { Queue } from 'bullmq'
import { redis } from '../config/redis.js'
import { logger } from '../utils/logger.js'

export const nlpQueue = new Queue('nlp', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 50,
    },
  },
})

nlpQueue.on('error', (err) => {
  logger.warn({ err: err?.message || err }, 'NLP queue Redis error')
})
