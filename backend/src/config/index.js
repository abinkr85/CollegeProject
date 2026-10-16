import { z } from 'zod'
import { config as dotenvConfig } from 'dotenv'

dotenvConfig({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  quiet: true,
})

const optionalEnv = (schema) =>
  z.preprocess(
    value => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional()
  )

const booleanEnv = (defaultVal = false) =>
  z.preprocess(
    value => value === 'true' || value === true || value === '1',
    z.boolean()
  ).default(defaultVal)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: optionalEnv(z.string().url()),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  ACCOUNT_LOCKOUT_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  ACCOUNT_LOCKOUT_MINUTES: z.coerce.number().int().min(1).default(5),
  MFA_CODE_EXPIRY_MINUTES: z.coerce.number().int().min(1).default(5),
  MFA_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  MFA_PROVIDER: z.enum(['twilio', 'smtp', 'sendgrid']).default('smtp'),
  MFA_ENABLED: booleanEnv(true),
  NLP_SERVICE_URL: z.string().url(),
  NLP_TIMEOUT_MS: z.coerce.number().default(5000),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  EMAIL_HOST: z.string().default('smtp.gmail.com'),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_USER: z.string().email(),
  EMAIL_PASS: z.string(),
  EMAIL_FROM: z.string(),
  CLIENT_URL: z.string().url(),
  STUDENT_CLIENT_URL: optionalEnv(z.string().url()),
  ADMIN_CLIENT_URL: optionalEnv(z.string().url()),
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  RELOAD_SECRET: z.string().default('internal-secret'),
  ADMIN_REGISTRATION_KEY: optionalEnv(z.string().min(12)),
  TWILIO_ACCOUNT_SID: optionalEnv(z.string().startsWith('AC')),
  TWILIO_AUTH_TOKEN: optionalEnv(z.string().min(1)),
  TWILIO_VERIFY_SERVICE_SID: optionalEnv(z.string().startsWith('VA')),
  TWILIO_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  SENDGRID_API_KEY: optionalEnv(z.string().min(1)),
  NEON_BRANCH: optionalEnv(z.string()),
  NEON_AUTH_BASE_URL: optionalEnv(z.string().url()),
  NEON_AUTH_JWKS_URL: optionalEnv(z.string().url()),
  NEON_FUNCTION_HELLO_BASE_URL: optionalEnv(z.string().url()),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.format())
  process.exit(1)
}

const configData = parsed.data

const looksLikePlaceholder = (value = '') =>
  /replace-with|your-|xxx|example\.com|internal-secret/i.test(String(value))

const assertProductionConfig = (env) => {
  if (env.NODE_ENV !== 'production') {
    return
  }

  const errors = []
  const requiredSecrets = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'CLOUDINARY_API_SECRET',
    'EMAIL_PASS',
    'RELOAD_SECRET',
  ]

  for (const key of requiredSecrets) {
    const value = env[key]

    if (!value || looksLikePlaceholder(value)) {
      errors.push(`${key} must be set to a real production secret`)
    }
  }

  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values')
  }

  if (env.RELOAD_SECRET.length < 32) {
    errors.push('RELOAD_SECRET must be at least 32 characters in production')
  }

  for (const key of ['CLIENT_URL', 'STUDENT_CLIENT_URL', 'ADMIN_CLIENT_URL']) {
    const value = env[key]

    if (!value) {
      continue
    }

    const url = new URL(value)

    if (url.protocol !== 'https:' || /localhost|127\.0\.0\.1|example\.com/i.test(value)) {
      errors.push(`${key} must be an exact deployed HTTPS frontend origin in production`)
    }
  }

  if (errors.length > 0) {
    console.error('Unsafe production environment configuration:')
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    process.exit(1)
  }
}

assertProductionConfig(configData)

export const config = configData
