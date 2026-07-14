import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { PrismaClient } from '@prisma/client'
import { config } from './config/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { AccountService } from './services/account.js'
import { getBlacklistSize } from './utils/tokenBlacklist.js'
import { authLimiter, tradingLimiter, adminLimiter, generalLimiter } from './utils/rateLimiters.js'
import { initSentry } from './utils/sentry.js'

// Routes
import authRoutes from './routes/auth.js'
import accountRoutes from './routes/accounts.js'
import tradingRoutes from './routes/trading.js'
import riskRoutes from './routes/risk.js'
import reportRoutes from './routes/reports.js'
import paymentRoutes from './routes/payments.js'
import adminRoutes from './routes/admin.js'
import alertRoutes from './routes/alerts.js'
import leaderboardRoutes from './routes/leaderboard.js'
import swaggerRoutes from './swagger.js'
import translateRoutes from './routes/translate.js'
import { localeMiddleware } from './middleware/localeMiddleware.js'

import contactRoutes from './routes/contact.js'
import settingsRoutes from './routes/settings.js'
import badgeRoutes from './routes/badges.js'

// Prisma client
export const prisma = new PrismaClient()

const app = express()

// Trust nginx reverse proxy (required for rate limiting & X-Forwarded-For)
app.set('trust proxy', 1)

// Sentry (async init, non-blocking)
initSentry()

// ── Security ──────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // handled by nginx in production
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'sameorigin' },
  }),
)

app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
  }),
)

// Locale detection (before routes)
app.use(localeMiddleware)

// Parsing
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cookieParser())
app.use(compression())

// Logging
if (config.NODE_ENV !== 'test') {
  app.use(morgan('combined'))
}

// Health check — includes key service indicators
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'connected',
      blacklistSize: getBlacklistSize(),
    })
  } catch {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      db: 'disconnected',
    })
  }
})

// API Routes (with per-route rate limiting)
app.use('/api/auth', generalLimiter, authRoutes)
app.use('/api/accounts', generalLimiter, accountRoutes)
app.use('/api/trading', tradingLimiter, tradingRoutes)
app.use('/api/risk', generalLimiter, riskRoutes)
app.use('/api/reports', generalLimiter, reportRoutes)
app.use('/api/payments', generalLimiter, paymentRoutes)
app.use('/api/admin', adminLimiter, adminRoutes)
app.use('/api/alerts', generalLimiter, alertRoutes)
app.use('/api/leaderboard', generalLimiter, leaderboardRoutes)

app.use('/api/contact', generalLimiter, contactRoutes)
app.use('/api/settings', generalLimiter, settingsRoutes)
app.use('/api/badges', generalLimiter, badgeRoutes)

// Auto-translation webhook
app.use('/api', generalLimiter, translateRoutes)

// Swagger docs (no rate limit)
app.use(swaggerRoutes)

// Error handler
app.use(errorHandler)

// Start server
const PORT = config.API_PORT || 3001

async function start() {
  try {
    await prisma.$connect()
    console.log('Database connected')

    // Start Redis cache (non-blocking)
    const { initCache } = await import('./utils/redisCache.js')
    initCache().then((ok) => {
      if (ok) console.log('Redis cache initialized')
    })

    // Start risk check scheduler (every 60 seconds)
    const { RuleEngine } = await import('./services/rule.js')
    const ruleEngine = new RuleEngine()

    setInterval(async () => {
      try {
        await Promise.allSettled([ruleEngine.checkAllAccounts(), ruleEngine.checkMarginLevels()])
      } catch (e) {
        console.error('[BackgroundTask] Risk engine error', e)
      }
    }, 60_000)
    console.log('Risk scheduler started (60s interval)')

    // Start matching engine (every 2 seconds)
    const { MatchingEngine } = await import('./services/MatchingEngine.js')
    const matchingEngine = new MatchingEngine()

    setInterval(async () => {
      try {
        await matchingEngine.processSLTP()
        await matchingEngine.processOrders()
        await matchingEngine.processTrailingStops()
        await matchingEngine.processBreakEven()
        await matchingEngine.processAlerts()
      } catch (e) {
        console.error('[BackgroundTask] Matching engine error', e)
      }
    }, 1_000)
    console.log('Matching engine started (1s interval)')

    // Start Swap engine (every 1 hour)
    setInterval(async () => {
      try {
        await matchingEngine.processSwap()
      } catch (e) {
        console.error('[BackgroundTask] Swap engine error', e)
      }
    }, 60 * 60 * 1000)
    console.log('Swap engine scheduled (1h interval)')

    // Start snapshot scheduler (every 30 minutes)
    const accountService = new AccountService()
    setInterval(async () => {
      try {
        const accounts = await prisma.account.findMany({
          where: {
            status: 'active',
            OR: [{ tradingDaysCount: { gt: 0 } }, { positions: { some: { status: 'open' } } }],
          },
          select: { id: true },
        })
        for (const acc of accounts) {
          await accountService.takeSnapshot(acc.id).catch(() => {})
        }
        if (accounts.length > 0) console.log(`[Snapshot] ${accounts.length} accounts snapshotted`)
      } catch (e) {
        console.error('[BackgroundTask] Snapshot engine error', e)
      }
    }, 30 * 60 * 1000)
    console.log('Snapshot scheduler started (30min interval)')

    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()

export default app
