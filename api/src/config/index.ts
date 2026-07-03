import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  NODE_ENV: z.string().default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  API_URL: z.string().default('http://localhost:3001'),
  PORT: z.coerce.number().default(3001),
})

const env = envSchema.safeParse(process.env)

if (!env.success) {
  console.error('Invalid environment variables:', env.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = env.data
