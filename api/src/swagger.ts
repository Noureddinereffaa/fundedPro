import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { Router } from 'express'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pro FundX API',
      version: '1.0.0',
      description: 'Prop-firm trading platform API — accounts, trading, payments, admin',
    },
    servers: [{ url: '/api', description: 'API server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            kycStatus: { type: 'string', enum: ['none', 'pending', 'verified', 'rejected'] },
          },
        },
        Account: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            accountSize: { type: 'number' },
            balance: { type: 'number' },
            equity: { type: 'number' },
            phase: { type: 'string' },
            status: { type: 'string' },
            leverage: { type: 'integer' },
          },
        },
        Position: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            symbol: { type: 'string' },
            side: { type: 'string', enum: ['buy', 'sell'] },
            volume: { type: 'number' },
            openPrice: { type: 'number' },
            currentPrice: { type: 'number' },
            stopLoss: { type: 'number' },
            takeProfit: { type: 'number' },
            profit: { type: 'number' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            symbol: { type: 'string' },
            type: { type: 'string', enum: ['market', 'limit', 'stop'] },
            side: { type: 'string', enum: ['buy', 'sell'] },
            volume: { type: 'number' },
            price: { type: 'number' },
            status: { type: 'string' },
            stopLoss: { type: 'number' },
            takeProfit: { type: 'number' },
          },
        },
        Trade: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            symbol: { type: 'string' },
            side: { type: 'string' },
            volume: { type: 'number' },
            openPrice: { type: 'number' },
            closePrice: { type: 'number' },
            profit: { type: 'number' },
            openTime: { type: 'string', format: 'date-time' },
            closeTime: { type: 'string', format: 'date-time' },
          },
        },
        Payout: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'approved', 'completed', 'rejected'] },
            method: { type: 'string' },
            walletAddress: { type: 'string' },
            txHash: { type: 'string' },
            user: { type: 'object', properties: { email: { type: 'string' } } },
            account: { type: 'object', properties: { accountSize: { type: 'number' } } },
          },
        },
        Error: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  },
  apis: [],
}

const router = Router()
const spec = swaggerJsdoc(options)

router.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }))
router.get('/docs.json', (_req, res) => res.json(spec))

export default router
