import { Queue } from 'bullmq'
import { redis } from '../config/redis.js'
import { logger } from '../utils/logger.js'

export const notificationQueue = new Queue('notification', {
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

notificationQueue.on('error', (err) => {
  logger.warn({ err: err?.message || err }, 'Notification queue Redis error')
})

export const scheduleNotificationJobs = async () => {
  try {
    if (typeof notificationQueue.upsertJobScheduler === 'function') {
      await notificationQueue.upsertJobScheduler(
        'admin-daily-digest',
        {
          pattern: '0 8 * * *',
        },
        {
          name: 'adminDailyDigest',
          data: {},
        }
      )
      return
    }

    await notificationQueue.add(
      'adminDailyDigest',
      {},
      {
        repeat: {
          pattern: '0 8 * * *',
        },
        jobId: 'admin-daily-digest',
      }
    )
  } catch (err) {
    logger.warn({ err }, 'Failed to schedule notification jobs')
  }
}
