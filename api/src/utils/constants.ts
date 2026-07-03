export const ACCOUNT_SIZES = [10000, 25000, 50000, 100000, 200000] as const

export const ACCOUNT_PRICES: Record<number, { evaluation: number; instant: number }> = {
  10000: { evaluation: 79, instant: 159 },
  25000: { evaluation: 149, instant: 299 },
  50000: { evaluation: 249, instant: 499 },
  100000: { evaluation: 399, instant: 799 },
  200000: { evaluation: 699, instant: 1399 },
}

export const DEFAULT_RULES: Record<string, Record<string, any>> = {
  evaluation_1: {
    profitTarget: 8,
    maxDailyLoss: 6,
    maxOverallLoss: 10,
    maxPositionSize: 5,
    maxLeverage: 100,
    maxOpenTrades: 10,
    minTradingDays: 5,
    maxTradingDays: 30,
  },
  evaluation_2: {
    profitTarget: 5,
    maxDailyLoss: 6,
    maxOverallLoss: 10,
    maxPositionSize: 5,
    maxLeverage: 100,
    maxOpenTrades: 10,
    minTradingDays: 5,
    maxTradingDays: 60,
  },
  funded: {
    profitTarget: null,
    maxDailyLoss: 6,
    maxOverallLoss: 10,
    maxPositionSize: 5,
    maxLeverage: 100,
    maxOpenTrades: 10,
    minTradingDays: null,
    maxTradingDays: null,
  },
}

export const PROFIT_SPLIT = 0.80

export interface SymbolInfo {
  digits: number
  pipValue: number
  contractSize: number
  margin: number
  category: 'forex' | 'metals' | 'oil' | 'indices' | 'crypto'
}

export const SYMBOLS: Record<string, SymbolInfo> = {
  EURUSD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  GBPUSD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDJPY: { digits: 3, pipValue: 0.01, contractSize: 100000, margin: 1000, category: 'forex' },
  AUDUSD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDCAD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  NZDUSD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDCHF: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  EURGBP: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  EURJPY: { digits: 3, pipValue: 0.01, contractSize: 100000, margin: 1000, category: 'forex' },
  EURAUD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  EURCAD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  EURCHF: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  EURNZD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  GBPJPY: { digits: 3, pipValue: 0.01, contractSize: 100000, margin: 1000, category: 'forex' },
  GBPAUD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  GBPCAD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  GBPCHF: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  GBPNZD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  AUDJPY: { digits: 3, pipValue: 0.01, contractSize: 100000, margin: 1000, category: 'forex' },
  AUDCAD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  AUDCHF: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  AUDNZD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  NZDJPY: { digits: 3, pipValue: 0.01, contractSize: 100000, margin: 1000, category: 'forex' },
  NZDCAD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  NZDCHF: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  CADJPY: { digits: 3, pipValue: 0.01, contractSize: 100000, margin: 1000, category: 'forex' },
  CADCHF: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  CHFJPY: { digits: 3, pipValue: 0.01, contractSize: 100000, margin: 1000, category: 'forex' },
  USDSGD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDHKD: { digits: 5, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDKRW: { digits: 2, pipValue: 0.01, contractSize: 100000, margin: 1000, category: 'forex' },
  USDZAR: { digits: 4, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDINR: { digits: 2, pipValue: 0.01, contractSize: 100000, margin: 1000, category: 'forex' },
  USDBRL: { digits: 4, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDMXN: { digits: 4, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDTRY: { digits: 4, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDSEK: { digits: 4, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDNOK: { digits: 4, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDCNH: { digits: 4, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDDKK: { digits: 4, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  USDPLN: { digits: 4, pipValue: 0.0001, contractSize: 100000, margin: 1000, category: 'forex' },
  XAUUSD: { digits: 2, pipValue: 0.01, contractSize: 100, margin: 1000, category: 'metals' },
  XAGUSD: { digits: 3, pipValue: 0.001, contractSize: 5000, margin: 500, category: 'metals' },
  XPTUSD: { digits: 2, pipValue: 0.01, contractSize: 50, margin: 1000, category: 'metals' },
  XPDUSD: { digits: 2, pipValue: 0.01, contractSize: 50, margin: 1000, category: 'metals' },
  XCUUSD: { digits: 4, pipValue: 0.0001, contractSize: 25000, margin: 2000, category: 'metals' },
  USOIL: { digits: 2, pipValue: 0.01, contractSize: 1000, margin: 2000, category: 'oil' },
  UKOIL: { digits: 2, pipValue: 0.01, contractSize: 1000, margin: 2000, category: 'oil' },
  NGAS: { digits: 3, pipValue: 0.001, contractSize: 10000, margin: 1500, category: 'oil' },
  SPX: { digits: 2, pipValue: 0.01, contractSize: 50, margin: 2000, category: 'indices' },
  NDX: { digits: 2, pipValue: 0.01, contractSize: 20, margin: 2000, category: 'indices' },
  DJI: { digits: 2, pipValue: 0.01, contractSize: 5, margin: 1000, category: 'indices' },
  RUT: { digits: 2, pipValue: 0.01, contractSize: 10, margin: 1000, category: 'indices' },
  VIX: { digits: 2, pipValue: 0.01, contractSize: 1000, margin: 2000, category: 'indices' },
  DAX: { digits: 2, pipValue: 0.01, contractSize: 25, margin: 2000, category: 'indices' },
  FTSE: { digits: 2, pipValue: 0.01, contractSize: 10, margin: 2000, category: 'indices' },
  CAC: { digits: 2, pipValue: 0.01, contractSize: 10, margin: 2000, category: 'indices' },
  SX5E: { digits: 2, pipValue: 0.01, contractSize: 10, margin: 2000, category: 'indices' },
  N225: { digits: 2, pipValue: 0.01, contractSize: 500, margin: 3000, category: 'indices' },
  HSI: { digits: 2, pipValue: 0.01, contractSize: 50, margin: 3000, category: 'indices' },
  AXJO: { digits: 2, pipValue: 0.01, contractSize: 25, margin: 2000, category: 'indices' },
  BTCUSDT: { digits: 2, pipValue: 0.01, contractSize: 1, margin: 5000, category: 'crypto' },
  ETHUSDT: { digits: 2, pipValue: 0.01, contractSize: 1, margin: 2000, category: 'crypto' },
  SOLUSDT: { digits: 2, pipValue: 0.01, contractSize: 1, margin: 2000, category: 'crypto' },
  XRPUSDT: { digits: 4, pipValue: 0.0001, contractSize: 1, margin: 1000, category: 'crypto' },
  BNBUSDT: { digits: 2, pipValue: 0.01, contractSize: 1, margin: 2000, category: 'crypto' },
  ADAUSDT: { digits: 4, pipValue: 0.0001, contractSize: 1, margin: 500, category: 'crypto' },
  DOGEUSDT: { digits: 5, pipValue: 0.00001, contractSize: 1, margin: 500, category: 'crypto' },
  AVAXUSDT: { digits: 2, pipValue: 0.01, contractSize: 1, margin: 1000, category: 'crypto' },
  DOTUSDT: { digits: 3, pipValue: 0.001, contractSize: 1, margin: 500, category: 'crypto' },
  LINKUSDT: { digits: 3, pipValue: 0.001, contractSize: 1, margin: 500, category: 'crypto' },
  MATICUSDT: { digits: 4, pipValue: 0.0001, contractSize: 1, margin: 500, category: 'crypto' },
  UNIUSDT: { digits: 3, pipValue: 0.001, contractSize: 1, margin: 500, category: 'crypto' },
  LTCUSDT: { digits: 2, pipValue: 0.01, contractSize: 1, margin: 500, category: 'crypto' },
  ARBUSDT: { digits: 3, pipValue: 0.001, contractSize: 1, margin: 500, category: 'crypto' },
  OPUSDT: { digits: 3, pipValue: 0.001, contractSize: 1, margin: 500, category: 'crypto' },
  APTUSDT: { digits: 3, pipValue: 0.001, contractSize: 1, margin: 500, category: 'crypto' },
  SUIUSDT: { digits: 3, pipValue: 0.001, contractSize: 1, margin: 500, category: 'crypto' },
}

export const COMMISSION: Record<string, number> = {
  forex: 3.5,
  metals: 3.5,
  crypto: 0,
  indices: 1.5,
  oil: 1.5,
}

export const SPREAD_MARKUP: Record<string, number> = {
  forex: 0.2,
  metals: 0.3,
  crypto: 0,
  indices: 0.5,
  oil: 0.3,
}

export const SWAP_RATES: Record<string, { long: number; short: number }> = {
  forex: { long: -5.0, short: -5.0 },
  metals: { long: -8.0, short: -6.0 },
  crypto: { long: -20.0, short: -20.0 },
  indices: { long: -3.0, short: -3.0 },
  oil: { long: -5.0, short: -5.0 },
}
