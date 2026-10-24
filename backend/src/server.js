import '../instrument.mjs'
import { createApp } from './app.js'
import { config } from './config/index.js'
import { logger } from './utils/logger.js'
import { prisma } from './config/prisma.js'
import { redis, redisSubscriber } from './config/redis.js'
import { emailWorker } from './jobs/email.worker.js'
import { nlpWorker } from './jobs/nlp.worker.js'
import { cleanupWorker } from './jobs/cleanup.worker.js'
import { notificationWorker } from './jobs/notification.worker.js'
import { closeQueues, scheduleCleanupJobs, scheduleNotificationJobs } from './queues/index.js'

const app = createApp()

const server = app.listen(config.PORT, '0.0.0.0', () => {
  logger.info(
    {
      port: config.PORT,
      env: config.NODE_ENV,
    },
    'Server started'
  )
})

scheduleCleanupJobs().catch((err) => {
  logger.warn({ err }, 'Failed to schedule cleanup jobs')
})

scheduleNotificationJobs().catch((err) => {
  logger.warn({ err }, 'Failed to schedule notification jobs')
})

const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutdown signal received')

  server.close(async () => {
    logger.info('HTTP server closed')

    await Promise.allSettled([
      emailWorker.close(),
      nlpWorker.close(),
      cleanupWorker.close(),
      notificationWorker.close(),
      closeQueues(),
      prisma.$disconnect(),
      redis.quit(),
      redisSubscriber.quit(),
    ])

    logger.info('All connections closed - exiting')
    process.exit(0)
  })

  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 15_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

const isIgnorableRedisError = (err) => {
  const msg = err?.message || String(err || '')
  const name = err?.name || ''
  return (
    name === 'ReplyError' ||
    msg.includes('max requests limit exceeded') ||
    msg.includes('Redis') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('NR_CLOSED')
  )
}

process.on('uncaughtException', (err) => {
  if (isIgnorableRedisError(err)) {
    logger.warn({ err: err?.message || err }, 'Suppressed Redis uncaught exception to maintain server availability')
    return
  }
  logger.fatal({ err }, 'Uncaught exception')
  process.exit(1)
})

process.on('unhandledRejection', (err) => {
  if (isIgnorableRedisError(err)) {
    logger.warn({ err: err?.message || err }, 'Suppressed Redis unhandled rejection to maintain server availability')
    return
  }
  logger.fatal({ err }, 'Unhandled rejection')
  process.exit(1)
})
