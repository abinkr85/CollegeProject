import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import hpp from 'hpp'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import pinoHttp from 'pino-http'
import mongoSanitize from 'express-mongo-sanitize'
import { Sentry } from './config/sentry.js'

import { config } from './config/index.js'
import { prisma } from './config/prisma.js'
import { logger } from './utils/logger.js'
import { generalLimiter } from './middleware/rateLimiter.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestId } from './middleware/requestId.js'
import { notFound } from './middleware/notFound.js'
import { swaggerSpec, swaggerUi } from './config/swagger.js'

import authRoutes from './modules/auth/auth.routes.js'
import complaintRoutes from './modules/complaint/complaint.routes.js'
import adminRoutes from './modules/admin/admin.routes.js'
import analyticsRoutes from './modules/analytics/analytics.routes.js'
import notificationRoutes from './modules/notification/notification.routes.js'
import realtimeRoutes from './modules/realtime/realtime.routes.js'
import userRoutes from './modules/user/user.routes.js'

const getAllowedOrigins = () => {
  const rawOrigins = [config.CLIENT_URL, config.STUDENT_CLIENT_URL, config.ADMIN_CLIENT_URL].filter(Boolean)
  const origins = new Set()
  
  for (const raw of rawOrigins) {
    try {
      origins.add(new URL(raw).origin) // Safely strips trailing slashes
    } catch {
      // Ignore invalid URLs
    }
  }

  if (config.NODE_ENV !== 'production') {
    for (const origin of [...origins]) {
      const clientUrl = new URL(origin)
      const alternateHost = clientUrl.hostname === 'localhost' ? '127.0.0.1' : 'localhost'
      origins.add(`${clientUrl.protocol}//${alternateHost}${clientUrl.port ? `:${clientUrl.port}` : ''}`)
    }
  }

  return origins
}

const rejectDisallowedBrowserOrigins = (allowedOrigins) => (req, res, next) => {
  const origin = req.get('origin')

  if (config.NODE_ENV !== 'production') {
    return next()
  }

  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({
      success: false,
      message: 'Origin is not allowed',
      requestId: req.id,
    })
  }

  return next()
}

export const createApp = () => {
  const app = express()
  const allowedOrigins = getAllowedOrigins()

  app.set('trust proxy', 1)

  app.use(requestId)

  app.use(
    helmet({
      contentSecurityPolicy: config.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: ["'self'", "https:"],
              fontSrc: ["'self'", "https:", "data:"],
              objectSrc: ["'none'"],
              mediaSrc: ["'none'"],
              frameSrc: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      xssFilter: true,
      noSniff: true,
      hsts: config.NODE_ENV === 'production'
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
      frameguard: {
        action: 'deny',
      },
    })
  )

  app.use(rejectDisallowedBrowserOrigins(allowedOrigins))

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin) || config.NODE_ENV !== 'production') {
          return callback(null, true)
        }

        return callback(null, false)
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  )

  app.use(express.json({ limit: '25mb' }))
  app.use(
    express.urlencoded({
      extended: true,
      limit: '25mb',
    })
  )
  app.use(cookieParser())
  app.use(mongoSanitize())
  app.use(hpp())
  app.use(compression())
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
      genReqId: (req) => req.id,
    })
  )

  app.use(generalLimiter)

  app.get('/', (req, res) => {
    if (req.accepts('html')) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Smart Campus API Server</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; background: #f8fafc; color: #1e293b; }
            .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
            h1 { font-size: 22px; margin-top: 0; color: #0f172a; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #dcfce7; color: #15803d; font-weight: 600; font-size: 14px; margin-bottom: 20px; }
            .btn { display: block; padding: 12px 16px; margin: 10px 0; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; text-align: center; }
            .btn.secondary { background: #475569; }
            .btn.outline { background: white; color: #2563eb; border: 1px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">● Server Online (Port 5000)</span>
            <h1>Smart Campus Backend API</h1>
            <p>The backend server and database are connected and operational.</p>
            <p><strong>To view the web application, open a portal:</strong></p>
            <a class="btn" href="http://localhost:5173">Open Student Portal (Port 5173)</a>
            <a class="btn secondary" href="http://localhost:5174">Open Admin Portal (Port 5174)</a>
            <a class="btn outline" href="/api/docs">View API Documentation (Swagger)</a>
          </div>
        </body>
        </html>
      `)
    }

    return res.json({
      status: 'ok',
      service: 'Smart Campus Backend API',
      health: '/health',
      docs: '/api/docs',
      portals: {
        student: config.STUDENT_CLIENT_URL || 'http://localhost:5173',
        admin: config.ADMIN_CLIENT_URL || 'http://localhost:5174',
      },
    })
  })

  app.get('/health', (req, res) =>
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      requestId: req.id,
    })
  )

  app.get('/api/neon/status', async (req, res) => {
    let dbStatus = 'disconnected'
    let dbInfo = null
    try {
      const [resDb] = await prisma.$queryRaw`SELECT version(), current_database() as db_name, current_user as db_user`
      dbStatus = 'connected'
      dbInfo = resDb
    } catch (err) {
      dbStatus = `error: ${err.message}`
    }

    let functionStatus = 'not_configured'
    if (config.NEON_FUNCTION_HELLO_BASE_URL) {
      try {
        const resp = await fetch(config.NEON_FUNCTION_HELLO_BASE_URL)
        const text = await resp.text()
        functionStatus = resp.ok ? `ok: ${text.trim()}` : `http_${resp.status}`
      } catch (err) {
        functionStatus = `error: ${err.message}`
      }
    }

    let authStatus = 'not_configured'
    if (config.NEON_AUTH_JWKS_URL) {
      try {
        const resp = await fetch(config.NEON_AUTH_JWKS_URL)
        authStatus = resp.ok ? 'ok (jwks reachable)' : `http_${resp.status}`
      } catch (err) {
        authStatus = `error: ${err.message}`
      }
    }

    res.json({
      status: 'ok',
      neon: {
        branch: config.NEON_BRANCH || 'production',
        postgres: {
          status: dbStatus,
          info: dbInfo,
        },
        auth: {
          baseUrl: config.NEON_AUTH_BASE_URL,
          status: authStatus,
        },
        functions: {
          helloUrl: config.NEON_FUNCTION_HELLO_BASE_URL,
          status: functionStatus,
        },
      },
    })
  })

  if (config.NODE_ENV !== 'production') {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
  }

  app.use('/api/auth', authRoutes)
  app.use('/api/complaints', complaintRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/analytics', analyticsRoutes)
  app.use('/api/realtime', realtimeRoutes)
  app.use('/api/user', userRoutes)

  if (typeof Sentry.setupExpressErrorHandler === 'function') {
    Sentry.setupExpressErrorHandler(app)
  }

  app.use(notFound)
  app.use(errorHandler)

  return app
}
