import client from 'prom-client'
import type { Request, Response, NextFunction } from 'express'

const register = new client.Registry()

client.collectDefaultMetrics({ register, prefix: 'profundx_' })

export const httpRequestDuration = new client.Histogram({
  name: 'profundx_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
})

export const httpRequestsTotal = new client.Counter({
  name: 'profundx_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
})

export const dbQueryDuration = new client.Histogram({
  name: 'profundx_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
})

export const activeUsers = new client.Gauge({
  name: 'profundx_active_users',
  help: 'Number of registered users',
  registers: [register],
})

export const activeAccounts = new client.Gauge({
  name: 'profundx_active_accounts',
  help: 'Number of active trading accounts',
  labelNames: ['status'],
  registers: [register],
})

export const pendingPayments = new client.Gauge({
  name: 'profundx_pending_payments',
  help: 'Number of pending payments',
  registers: [register],
})

let lastRoute = new Map<string, string>()

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.route?.path ?? req.path
  lastRoute.set(req.method + path, path)
  const end = httpRequestDuration.startTimer({ method: req.method, route: path })
  res.on('finish', () => {
    const statusCode = String(res.statusCode)
    end({ status_code: statusCode })
    httpRequestsTotal.inc({ method: req.method, route: path, status_code: statusCode })
  })
  next()
}

export async function collectBusinessMetrics(prisma: any) {
  try {
    const u = await prisma.user.count()
    activeUsers.set(u)
    const statuses = ['active', 'funded', 'evaluating', 'suspended'] as const
    for (const status of statuses) {
      const c = await prisma.account.count({ where: { status } })
      activeAccounts.set({ status }, c)
    }
    const p = await prisma.payment.count({ where: { status: 'pending' } })
    pendingPayments.set(p)
  } catch {}
}

export async function metricsHandler(_req: Request, res: Response) {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
}
