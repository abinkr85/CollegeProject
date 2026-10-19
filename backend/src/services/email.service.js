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

const sendViaResend = async ({ to, subject, html, text }) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.RESEND_FROM || 'Smart Campus <onboarding@resend.dev>',
      to: [to],
      subject,
      text: text || html?.replace(/<[^>]*>/g, '') || '',
      html,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Resend HTTP ${res.status}: ${errBody}`)
  }

  logger.info({ to, subject }, 'Resend email sent successfully over HTTPS')
}

export const sendOtpEmail = async (to, code) => {
  const msg = createOtpMessage(to, code)

  if (config.BREVO_API_KEY) {
    try {
      await sendViaBrevo(to, code)
      return
    } catch (error) {
      if (error.message.includes('unrecognised IP address') || error.message.includes('authorised_ips')) {
        logger.error({ error: error.message, to }, 'Brevo blocked request due to IP restrictions. Please disable Authorized IPs at https://app.brevo.com/security/authorised_ips')
      } else {
        logger.error({ error: error.message, to }, 'Failed to send OTP email via Brevo')
      }
    }
  }

  if (config.RESEND_API_KEY) {
    try {
      await sendViaResend({ to, subject: msg.subject, html: msg.html, text: msg.text })
      return
    } catch (error) {
      logger.error({ error: error.message, to }, 'Failed to send OTP email via Resend')
    }
  }

  if (canSendSmtpEmail()) {
    try {
      await sendViaSmtp(to, code)
      return
    } catch (error) {
      logger.error({ error: error.message, to }, 'Failed to send OTP email via SMTP. Note: Render and other cloud hosts block outbound SMTP ports 25, 465, and 587.')
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
      if (error.message.includes('unrecognised IP address') || error.message.includes('authorised_ips')) {
        logger.error({ error: error.message, to, subject }, 'Brevo blocked request due to IP restrictions. Please disable Authorized IPs at https://app.brevo.com/security/authorised_ips')
      } else {
        logger.error({ error: error.message, to, subject }, 'Failed to send generic email via Brevo')
      }
    }
  }

  if (config.RESEND_API_KEY) {
    try {
      await sendViaResend({ to, subject, html, text })
      return
    } catch (error) {
      logger.error({ error: error.message, to, subject }, 'Failed to send generic email via Resend')
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
      logger.error({ error: error.message, to, subject }, 'Failed to send generic email via SMTP. Note: Render and other cloud hosts block outbound SMTP ports 25, 465, and 587.')
    }
  }

  logger.warn({ to, subject }, 'No working email provider available for generic email')
}

export const sendSendGridOtp = sendOtpEmail

export const sendPasswordResetEmail = async (to, code) => {
  const subject = 'Smart Campus - Password Reset Verification Code'
  const text = `You requested to reset your Smart Campus password. Your verification code is: ${code}. It will expire in 10 minutes. If you did not request this, please ignore this email.`
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #0f172a; margin-top: 0;">Reset Your Password</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">You requested to reset your Smart Campus account password. Use the verification code below to complete the reset:</p>
      <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e40af;">${code}</span>
      </div>
      <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">This code expires in <strong>10 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `

  await sendGenericEmail({ to, subject, html, text })
}

