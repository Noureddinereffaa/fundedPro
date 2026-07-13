import { Decimal } from '@prisma/client/runtime/library'
import { SYMBOLS, SymbolInfo } from './constants.js'
import { randomBytes } from 'crypto'

export function generateAccountLogin(): string {
  return 'FP' + randomBytes(4).toString('hex').toUpperCase()
}

export function generateAccountPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  const bytes = randomBytes(12)
  let pass = ''
  for (let i = 0; i < 12; i++) pass += chars[bytes[i] % chars.length]
  return pass
}

export function getContractSize(symbol: string): number {
  const info = SYMBOLS[symbol]
  if (!info) return 1
  return info.contractSize
}

export function getSymbolCategory(symbol: string): SymbolInfo['category'] {
  const info = SYMBOLS[symbol]
  if (!info) return 'crypto'
  return info.category
}

export function calculatePnL(
  side: string,
  openPrice: number,
  closePrice: number,
  volume: number,
  symbol?: string,
  quoteToUsdRate: number = 1,
): number {
  const contractSize = symbol ? getContractSize(symbol) : 1
  const diff = side === 'buy' ? closePrice - openPrice : openPrice - closePrice
  return Number((diff * volume * contractSize).toFixed(2))
}

export function calculateMargin(volume: number, price: number, leverage: number, symbol?: string): number {
  const contractSize = symbol ? getContractSize(symbol) : 1
  return Number(((volume * contractSize * price) / leverage).toFixed(2))
}

/** @deprecated Crypto is 24/7 — always returns true */
export function isMarketOpen(_symbol?: string): boolean {
  return true
}

export function formatDecimal(value: number | Decimal, decimals: number = 2): string {
  const num = typeof value === 'number' ? value : Number(value)
  return num.toFixed(decimals)
}

export function paginate(page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit
  return { skip, take: limit }
}

export function getPaginationMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  }
}
