import { config } from '../../config/index.js'
import { prisma } from '../../config/prisma.js'
import { UnauthorizedError } from '../../utils/ApiError.js'
import { logger } from '../../utils/logger.js'
import { sendEmailOtp, checkEmailOtp } from '../../config/twilioClient.js'
import { sendOtpEmail } from '../../services/email.service.js'
import { generateOtp, hashOtp, verifyOtp } from '../../utils/otp.util.js'

const maskEmail = (email) => {
  const [local, domain] = email.split('@')
  const visible = local.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`
}

const isTwilioConfigured = () => {
  return (
    config.MFA_PROVIDER === 'twilio' &&
    !!(config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_VERIFY_SERVICE_SID)
  )
}

export const createMfaChallenge = async (user) => {
  const expiresAt = new Date(Date.now() + config.MFA_CODE_EXPIRY_MINUTES * 60 * 1000)

  await prisma.mfaChallenge.deleteMany({
    where: {
      userId: user.id,
      consumedAt: null,
    },
  })

  let verificationSid
  const code = generateOtp()

  if (isTwilioConfigured()) {
    try {
      const verification = await sendEmailOtp(user.email)
      verificationSid = verification.sid
    } catch (err) {
      logger.warn(
        { userId: user.id, error: err.message },
        'Failed to initiate Twilio Verify MFA. Falling back to local SMTP/SendGrid.'
      )
      const codeHash = await hashOtp(code)
      verificationSid = codeHash
      sendOtpEmail(user.email, code).catch((mailErr) => {
        logger.warn({ error: mailErr.message, to: user.email }, 'SMTP delivery skipped on cloud host')
      })
    }
  } else {
    const codeHash = await hashOtp(code)
    verificationSid = codeHash
    await sendOtpEmail(user.email, code).catch((err) => {
      logger.warn({ error: err.message, to: user.email }, 'Email delivery failed on cloud host')
    })
  }

  const challenge = await prisma.mfaChallenge.create({
    data: {
      userId: user.id,
      verificationSid,
      deliveryChannel: 'email',
      expiresAt,
    },
    select: {
      id: true,
      expiresAt: true,
    },
  })

  logger.info({ userId: user.id, mfaChallengeId: challenge.id, usingTwilio: isTwilioConfigured() }, 'Email OTP challenge issued')

  return {
    mfaToken: challenge.id,
    expiresAt: challenge.expiresAt,
    delivery: {
      channel: 'email',
      destination: maskEmail(user.email),
    },
  }
}

export const verifyMfaChallenge = async ({ mfaToken, code }) => {
  const challenge = await prisma.mfaChallenge.findUnique({
    where: {
      id: mfaToken,
    },
    select: {
      id: true,
      userId: true,
      attempts: true,
      expiresAt: true,
      consumedAt: true,
      verificationSid: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  })

  if (!challenge) {
    logger.warn({ mfaToken }, 'MFA verification failed: challenge not found')
    throw new UnauthorizedError('Verification code is invalid or expired')
  }

  if (challenge.consumedAt) {
    logger.warn({ mfaToken }, 'MFA verification failed: challenge already consumed')
    throw new UnauthorizedError('Verification code is invalid or expired')
  }

  if (challenge.expiresAt < new Date()) {
    logger.warn({ mfaToken, expiresAt: challenge.expiresAt }, 'MFA verification failed: challenge expired')
    throw new UnauthorizedError('Verification code is invalid or expired')
  }

  if (!challenge.verificationSid) {
    logger.warn({ mfaToken }, 'MFA verification failed: verificationSid missing')
    throw new UnauthorizedError('Verification code is invalid or expired')
  }

  if (challenge.attempts >= config.MFA_MAX_ATTEMPTS) {
    logger.warn({ mfaToken, attempts: challenge.attempts }, 'MFA verification failed: maximum attempts reached')
    throw new UnauthorizedError('Too many incorrect verification code attempts')
  }

  let isValid = false
  const trimmedCode = String(code).trim()

  if (isTwilioConfigured() && !challenge.verificationSid.startsWith('$2b$')) {
    isValid = await checkEmailOtp({ to: challenge.user.email, code: trimmedCode })
  } else {
    isValid = await verifyOtp(trimmedCode, challenge.verificationSid)
  }

  if (!isValid) {
    await prisma.mfaChallenge.update({
      where: {
        id: challenge.id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    })

    logger.warn({ mfaToken, email: challenge.user.email }, 'MFA verification failed: incorrect code entered')
    throw new UnauthorizedError('Verification code is invalid or expired')
  }

  await prisma.mfaChallenge.update({
    where: {
      id: challenge.id,
    },
    data: {
      consumedAt: new Date(),
    },
  })

  return challenge.user
}

export const deleteExpiredMfaChallenges = () =>
  prisma.mfaChallenge.deleteMany({
    where: {
      OR: [
        {
          expiresAt: {
            lt: new Date(),
          },
        },
        {
          consumedAt: {
            not: null,
          },
        },
      ],
    },
  })
