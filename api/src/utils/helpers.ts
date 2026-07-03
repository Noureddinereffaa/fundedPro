import { Decimal } from '@prisma/client/runtime/library'
import { SYMBOLS, SymbolInfo } from './constants.js'

export function generateAccountLogin(): string {
  return 'FP' + Math.random().toString(36).substring(2, 10).toUpperCase()
}

export function generateAccountPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let pass = ''
  for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length))
  return pass
}

export function getContractSize(symbol: string): number {
  const info = SYMBOLS[symbol]
  if (!info) return 100000
  return info.contractSize
}

export function getSymbolCategory(symbol: string): SymbolInfo['category'] {
  const info = SYMBOLS[symbol]
  if (!info) return 'forex'
  return info.category
}

export function calculatePnL(side: string, openPrice: number, closePrice: number, volume: number, symbol?: string, quoteToUsdRate: number = 1): number {
  const contractSize = symbol ? getContractSize(symbol) : 100000
  const diff = side === 'buy' ? (closePrice - openPrice) : (openPrice - closePrice)
  let pnl = diff * volume * contractSize

  if (symbol) {
    if (symbol.startsWith('USD') && !symbol.endsWith('USD') && !symbol.endsWith('USDT')) {
      // Base is USD, Quote is something else (e.g. USDJPY) -> PnL is in Quote. Convert to USD by dividing by closePrice
      pnl = pnl / closePrice
    } else if (!symbol.endsWith('USD') && !symbol.endsWith('USDT') && quoteToUsdRate !== 1) {
      // Cross pair (e.g. EURGBP) -> PnL is in Quote. Convert to USD by multiplying by quoteToUsdRate
      pnl = pnl * quoteToUsdRate
    }
  }

  return Number(pnl.toFixed(2))
}

export function calculateMargin(volume: number, price: number, leverage: number, symbol?: string): number {
  const contractSize = symbol ? getContractSize(symbol) : 100000
  return Number(((volume * contractSize * price) / leverage).toFixed(2))
}

export function isMarketOpen(symbol?: string): boolean {
  const category = symbol ? getSymbolCategory(symbol) : 'forex'
  if (category === 'crypto') return true
  
  const now = new Date()
  const day = now.getUTCDay()
  const hour = now.getUTCHours()
  
  if (category === 'forex') {
    if (day === 6) return false                    // Saturday: always closed
    if (day === 5 && hour >= 22) return false      // Friday after 22:00 UTC: closed
    if (day === 0 && hour < 22) return false       // Sunday before 22:00 UTC: closed
    return true
  }
  
  // Indices & Commodities: Mon-Fri, 06:00-22:00 UTC
  if (day === 0 || day === 6) return false
  if (hour < 6 || hour >= 22) return false
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
