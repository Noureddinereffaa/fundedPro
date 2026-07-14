import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'
const level = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')

const baseLogger = pino({
  level,
  transport: isDev ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } } : undefined,
  base: { service: 'pro-fundx-api' },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
})

export function createLogger(service: string) {
  return baseLogger.child({ service })
}

export const logger = baseLogger

export default baseLogger
