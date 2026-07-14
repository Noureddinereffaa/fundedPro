const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const
type LogLevel = keyof typeof LOG_LEVELS

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
const prefix = 'md'

function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (LOG_LEVELS[level] > LOG_LEVELS[currentLevel]) return
  const ts = new Date().toISOString()
  const line = `[${ts}] [${level.toUpperCase()}] [${prefix}] ${message}`
  if (level === 'error') console.error(line, ...args)
  else if (level === 'warn') console.warn(line, ...args)
  else console.log(line, ...args)
}

export const logger = {
  error: (msg: string, ...args: unknown[]) => log('error', msg, ...args),
  warn: (msg: string, ...args: unknown[]) => log('warn', msg, ...args),
  info: (msg: string, ...args: unknown[]) => log('info', msg, ...args),
  debug: (msg: string, ...args: unknown[]) => log('debug', msg, ...args),
}
