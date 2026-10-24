import { Worker } from 'bullmq'
import axios from 'axios'
import { redis } from '../config/redis.js'
import { prisma } from '../config/prisma.js'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { invalidateCachePattern } from '../utils/cache.js'
import { notifyHighPriorityComplaint } from '../modules/admin/notification.service.js'
import { applyClassificationOverrides, classifyComplaintText } from '../modules/complaint/nlp.classifier.js'
import { broadcastAdminEvent } from '../modules/realtime/realtime.service.js'

const nlpRequestOptions = () => ({
  timeout: config.NLP_TIMEOUT_MS,
  headers: {
    'X-NLP-Secret': config.RELOAD_SECRET,
  },
})

export const nlpWorker = new Worker(
  'nlp',
  async (job) => {
    const { complaintId, text, manualCategory } = job.data

    let classification = classifyComplaintText(text)

    try {
      const response = await axios.post(
        `${config.NLP_SERVICE_URL}/classify`,
        { text },
        nlpRequestOptions()
      )

      classification = applyClassificationOverrides(text, response.data)
    } catch (err) {
      logger.warn({ err: err.message, complaintId }, 'NLP service call failed in worker')
    }

    const updated = await prisma.complaint.update({
      where: {
        id: complaintId,
      },
      data: {
        ...(manualCategory ? {} : { category: classification.category }),
        priority: classification.priority,
        nlpConfidence: manualCategory ? 1.0 : classification.confidence,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    await Promise.allSettled([
      notifyHighPriorityComplaint(updated),
      invalidateCachePattern('analytics:*'),
      invalidateCachePattern(`complaints:user:${updated.userId}:*`),
      invalidateCachePattern('admin:complaints:*'),
      broadcastAdminEvent('COMPLAINT_UPDATED', { complaintId, source: 'NLP_WORKER' }),
    ])

    logger.info(
      {
        complaintId,
        category: classification.category,
        priority: classification.priority,
        source: classification.source,
      },
      'NLP classification complete'
    )
  },
  {
    connection: redis,
    concurrency: 3,
  }
)

nlpWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'NLP job failed')
})

nlpWorker.on('error', (err) => {
  logger.warn({ err: err.message }, 'NLP worker Redis connection error')
})
