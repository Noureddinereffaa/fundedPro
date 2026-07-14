import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  BTC_WALLET: z.string().default('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'),
  ETH_WALLET: z.string().default('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18'),
  USDT_TRC20_WALLET: z.string().default('TN2YhN7bVvKJwHbSKuYRmFjzQxqFfFfFfF'),
  USDT_ERC20_WALLET: z.string().default('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18'),
  NODE_ENV: z.string().default('development'),
  CLIENT_URL: z.string().default(process.env.CLIENT_URL || 'http://localhost:5173'),
  API_URL: z.string().default(process.env.API_URL || 'http://localhost:3001'),
  API_PORT: z.coerce.number().default(Number(process.env.API_PORT) || 3001),
  WS_SERVER_URL: z.string().optional().default(process.env.WS_SERVER_URL || 'http://localhost:3002'),
  SERVER_TIMEZONE_OFFSET: z.coerce.number().default(3),
  SENTRY_DSN: z.string().optional(),
  NOWPAYMENTS_API_KEY: z.string().optional(),
})

const env = envSchema.safeParse(process.env)

if (!env.success) {
  console.error('Invalid environment variables:', env.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = env.data
