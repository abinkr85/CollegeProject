import { Worker } from 'bullmq'
import { redis } from '../config/redis.js'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { sendGenericEmail } from '../services/email.service.js'

const normalizeEmailPassword = (value = '') =>
  config.EMAIL_HOST === 'smtp.gmail.com' ? value.replace(/\s+/g, '') : value

const emailPassword = normalizeEmailPassword(config.EMAIL_PASS)

const canSendEmail = () =>
  Boolean(config.BREVO_API_KEY) ||
  (config.EMAIL_USER !== 'your@gmail.com' &&
  emailPassword !== 'your-gmail-app-password' &&
  emailPassword.length > 0)

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const TEMPLATES = {
  welcome: (data) => ({
    subject: 'Welcome to Smart Campus',
    html: `<h2>Hi ${escapeHtml(data.name)},</h2><p>Your account has been created successfully.</p>`,
  }),

  statusUpdate: (data) => ({
    subject: `Complaint Update - #${data.complaint.id.slice(0, 8).toUpperCase()}`,
    html: `
      <h2>Your complaint status has been updated.</h2>
      <p><strong>Title:</strong> ${escapeHtml(data.complaint.title)}</p>
      <p><strong>New Status:</strong> ${escapeHtml(data.complaint.status)}</p>
      <p><strong>Department:</strong> ${escapeHtml(data.complaint.department ?? 'Unassigned')}</p>
      ${data.complaint.adminNote ? `<p><strong>Note:</strong> ${escapeHtml(data.complaint.adminNote)}</p>` : ''}
    `,
  }),

  confirmation: (data) => ({
    subject: `Complaint Received - #${data.complaintId.slice(0, 8).toUpperCase()}`,
    html: `
      <h2>We received your complaint.</h2>
      <p><strong>Title:</strong> ${escapeHtml(data.title)}</p>
      <p><strong>Category:</strong> ${escapeHtml(data.category ?? 'Pending')}</p>
      <p><strong>Priority:</strong> ${escapeHtml(data.priority ?? 'Pending')}</p>
      <p>Track your complaint for future status updates.</p>
    `,
  }),

  adminHighPriority: (data) => ({
    subject: `High Priority Complaint - #${data.complaint.id.slice(0, 8).toUpperCase()}`,
    html: `
      <h2>High-priority complaint needs review.</h2>
      <p>Hi ${escapeHtml(data.adminName || 'Admin')},</p>
      <p><strong>Title:</strong> ${escapeHtml(data.complaint.title)}</p>
      <p><strong>Category:</strong> ${escapeHtml(data.complaint.category ?? 'Pending')}</p>
      <p><strong>Priority:</strong> ${escapeHtml(data.complaint.priority)}</p>
      <p><strong>Status:</strong> ${escapeHtml(data.complaint.status)}</p>
      <p>Please open the admin portal and review this complaint.</p>
    `,
  }),

  adminDailyDigest: (data) => {
    const newItems = (data.newComplaints || [])
      .map(item => `<li>${escapeHtml(item.title)} - ${escapeHtml(item.priority ?? 'N/A')} - ${escapeHtml(item.status)}</li>`)
      .join('')

    const resolvedItems = (data.resolvedComplaints || [])
      .map(item => `<li>${escapeHtml(item.title)} - ${escapeHtml(item.department ?? 'Unassigned')}</li>`)
      .join('')

    return {
      subject: 'Smart Campus Daily Complaint Digest',
      html: `
        <h2>Daily Complaint Digest</h2>
        <p>Hi ${escapeHtml(data.adminName || 'Admin')},</p>
        <p><strong>New complaints:</strong> ${(data.newComplaints || []).length}</p>
        <p><strong>Resolved complaints:</strong> ${(data.resolvedComplaints || []).length}</p>
        ${newItems ? `<h3>New complaints</h3><ul>${newItems}</ul>` : ''}
        ${resolvedItems ? `<h3>Resolved complaints</h3><ul>${resolvedItems}</ul>` : ''}
      `,
    }
  },
}

export const emailWorker = new Worker(
  'email',
  async (job) => {
    const template = TEMPLATES[job.name]

    if (!template) {
      logger.warn({ jobName: job.name }, 'Unknown email template')
      return
    }

    const { subject, html } = template(job.data)

    if (!canSendEmail()) {
      logger.warn(
        {
          jobName: job.name,
          to: job.data.to,
        },
        'Email credentials are not configured - skipping email delivery'
      )
      return
    }

    await sendGenericEmail({
      to: job.data.to,
      subject,
      html,
    })

    logger.info({ jobName: job.name, to: job.data.to }, 'Email job processed')
  },
  {
    connection: redis,
    concurrency: 5,
  }
)

emailWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Email job failed')
})

emailWorker.on('error', (err) => {
  logger.warn({ err: err.message }, 'Email worker Redis connection error')
})
