import type { MarketStatus } from '../../shared/types'

export function getMarketStatus(_symbol?: string): MarketStatus {
  return { open: true, text: 'Open 24/7', nextOpen: null, nextClose: null }
}

export function isMarketOpen(_symbol?: string): boolean {
  return true
}

export function getNextOpen(_symbol?: string): string | null {
  return null
}

export function getNextClose(_symbol?: string): string | null {
  return null
}
