import { Queue } from 'bullmq'
import { redis } from '../config/redis.js'
import { logger } from '../utils/logger.js'

export const cleanupQueue = new Queue('cleanup', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 30,
    },
    removeOnFail: {
      count: 30,
    },
  },
})

cleanupQueue.on('error', (err) => {
  logger.warn({ err: err?.message || err }, 'Cleanup queue Redis error')
})

export const scheduleCleanupJobs = async () => {
  try {
    if (typeof cleanupQueue.upsertJobScheduler === 'function') {
      await cleanupQueue.upsertJobScheduler(
        'expired-refresh-tokens-daily',
        {
          pattern: '0 3 * * *',
        },
        {
          name: 'expiredRefreshTokens',
          data: {},
        }
      )
      return
    }

    await cleanupQueue.add(
      'expiredRefreshTokens',
      {},
      {
        repeat: {
          pattern: '0 3 * * *',
        },
        jobId: 'expired-refresh-tokens-daily',
      }
    )
  } catch (err) {
    logger.warn({ err }, 'Failed to schedule cleanup jobs')
  }
}
