import nodemailer from 'nodemailer'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { ServiceUnavailableError } from '../utils/ApiError.js'


const normalizeEmailPassword = (value = '') =>
  config.EMAIL_HOST === 'smtp.gmail.com' ? value.replace(/\s+/g, '') : value

const emailPassword = normalizeEmailPassword(config.EMAIL_PASS)

const smtpTransporter = nodemailer.createTransport({
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  secure: config.EMAIL_PORT === 465,
  family: 4,
  connectionTimeout: 4000,
  greetingTimeout: 4000,
  socketTimeout: 4000,
  auth: {
    user: config.EMAIL_USER,
    pass: emailPassword,
  },
})

const canSendSmtpEmail = () =>
  config.EMAIL_USER !== 'your@gmail.com' &&
  emailPassword !== 'your-gmail-app-password' &&
  emailPassword.length > 0

const createOtpMessage = (to, code) => ({
  to,
  from: config.EMAIL_FROM || config.EMAIL_USER || 'smartcampus96@gmail.com',
  subject: 'Your Smart Campus Login Verification Code',
  text: `Your verification code is: ${code}. It will expire in ${config.MFA_CODE_EXPIRY_MINUTES || 5} minutes.`,
  html: `<strong>Your verification code is: ${code}</strong><br/>It will expire in ${config.MFA_CODE_EXPIRY_MINUTES || 5} minutes.`,
})

const sendViaSmtp = async (to, code) => {
  const msg = createOtpMessage(to, code)

  await smtpTransporter.sendMail({
    from: msg.from,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  })

  logger.info({ to }, 'SMTP OTP email sent')
}

const sendViaBrevo = async (to, code) => {
  const msg = createOtpMessage(to, code)
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Smart Campus', email: config.EMAIL_FROM || config.EMAIL_USER || 'smartcampus96@gmail.com' },
      to: [{ email: to }],
      subject: msg.subject,
      textContent: msg.text,
      htmlContent: msg.html,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Brevo HTTP ${res.status}: ${errBody}`)
  }

  logger.info({ to }, 'Brevo OTP email sent successfully over HTTPS')
}

export const sendOtpEmail = async (to, code) => {
  if (config.BREVO_API_KEY) {
    try {
      await sendViaBrevo(to, code)
      return
    } catch (error) {
      logger.error({ error: error.message, to }, 'Failed to send OTP email via Brevo')
    }
  }

  if (canSendSmtpEmail()) {
    try {
      await sendViaSmtp(to, code)
      return
    } catch (error) {
      logger.error({ error: error.message, to }, 'Failed to send OTP email via SMTP')
    }
  }

  logger.warn({ to, code }, 'OTP code generated (no working email provider was able to deliver to recipient)')
  return
}

export const sendGenericEmail = async ({ to, subject, html, text }) => {
  if (config.BREVO_API_KEY) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': config.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Smart Campus', email: config.EMAIL_FROM || config.EMAIL_USER || 'smartcampus96@gmail.com' },
          to: [{ email: to }],
          subject,
          textContent: text || html?.replace(/<[^>]*>/g, '') || '',
          htmlContent: html,
        }),
      })

      if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`Brevo HTTP ${res.status}: ${errBody}`)
      }

      logger.info({ to, subject }, 'Email sent successfully via Brevo over HTTPS')
      return
    } catch (error) {
      logger.error({ error: error.message, to, subject }, 'Failed to send generic email via Brevo')
    }
  }

  if (canSendSmtpEmail()) {
    try {
      await smtpTransporter.sendMail({
        from: config.EMAIL_FROM,
        to,
        subject,
        html,
        text,
      })
      logger.info({ to, subject }, 'Email sent via SMTP')
      return
    } catch (error) {
      logger.error({ error: error.message, to, subject }, 'Failed to send generic email via SMTP')
    }
  }

  logger.warn({ to, subject }, 'No working email provider available for generic email')
}

export const sendSendGridOtp = sendOtpEmail

