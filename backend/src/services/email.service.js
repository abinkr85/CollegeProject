import sgMail from '@sendgrid/mail'
import nodemailer from 'nodemailer'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { ServiceUnavailableError } from '../utils/ApiError.js'

let isSendGridConfigured = false

if (config.SENDGRID_API_KEY) {
  sgMail.setApiKey(config.SENDGRID_API_KEY)
  isSendGridConfigured = true
}

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
  from: config.EMAIL_FROM || 'noreply@smartcampus.com',
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

const sendViaSendGrid = async (to, code) => {
  const msg = {
    ...createOtpMessage(to, code),
  }

  await sgMail.send(msg)
  logger.info({ to }, 'SendGrid OTP email sent')
}

export const sendOtpEmail = async (to, code) => {
  if (isSendGridConfigured) {
    try {
      await sendViaSendGrid(to, code)
      return
    } catch (error) {
      logger.error({ error, to }, 'Failed to send OTP email via SendGrid')
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

  logger.warn({ to, code }, 'OTP code generated (delivery via SMTP/SendGrid unavailable on cloud host; code logged and provided in challenge response)')
  return
}

export const sendSendGridOtp = sendOtpEmail
