import { Worker } from 'bullmq'
import { redis } from '../config/redis.js'
import { logger } from '../utils/logger.js'
import { sendDailyDigestNotifications } from '../modules/admin/notification.service.js'

export const notificationWorker = new Worker(
  'notification',
  async (job) => {
    if (job.name !== 'adminDailyDigest') {
      logger.warn({ jobName: job.name }, 'Unknown notification job')
      return
    }

    const result = await sendDailyDigestNotifications()
    logger.info(result, 'Admin daily digest processed')
  },
  {
    connection: redis,
    concurrency: 1,
  }
)

notificationWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Notification job failed')
})

notificationWorker.on('error', (err) => {
  logger.warn({ err: err.message }, 'Notification worker Redis connection error')
})
