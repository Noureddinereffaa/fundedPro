import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import { PrismaClient } from '@prisma/client'
import { config } from './config/index.js'
import { errorHandler } from './middleware/errorHandler.js'

// Routes
import authRoutes from './routes/auth.js'
import accountRoutes from './routes/accounts.js'
import tradingRoutes from './routes/trading.js'
import riskRoutes from './routes/risk.js'
import reportRoutes from './routes/reports.js'
import paymentRoutes from './routes/payments.js'
import adminRoutes from './routes/admin.js'

// Prisma client
export const prisma = new PrismaClient()

const app = express()

// Security
app.use(helmet())
app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true,
}))
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}))

// Parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(compression())

// Logging
if (config.NODE_ENV !== 'test') {
  app.use(morgan('combined'))
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/trading', tradingRoutes)
app.use('/api/risk', riskRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/admin', adminRoutes)

// Error handler
app.use(errorHandler)

// Start server
const PORT = config.PORT || 3001

async function start() {
  try {
    await prisma.$connect()
    console.log('Database connected')

    // Start risk check scheduler (every 60 seconds)
    const { RuleEngine } = await import('./services/rule.js')
    const ruleEngine = new RuleEngine()
    setInterval(() => {
      Promise.allSettled([
        ruleEngine.checkAllAccounts(),
        ruleEngine.checkMarginLevels(),
      ]).catch(() => {})
    }, 60_000)
    console.log('Risk scheduler started (60s interval)')

    // Start matching engine (every 2 seconds)
    const { MatchingEngine } = await import('./services/MatchingEngine.js')
    const matchingEngine = new MatchingEngine()
    setInterval(() => {
      Promise.allSettled([
        matchingEngine.processSLTP(),
        matchingEngine.processOrders(),
        matchingEngine.processTrailingStops(),
        matchingEngine.processBreakEven(),
      ]).catch(() => {})
    }, 2_000)
    console.log('Matching engine started (2s interval)')

    // Start Swap engine (every 1 hour)
    setInterval(() => {
      matchingEngine.processSwap().catch(() => {})
    }, 60 * 60 * 1000)
    console.log('Swap engine scheduled (1h interval)')

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
