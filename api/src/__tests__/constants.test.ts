import { describe, it, expect } from 'vitest'
import { SYMBOLS, COMMISSION, SPREAD_MARKUP, ACCOUNT_SIZES, ACCOUNT_PRICES, DEFAULT_RULES, PROFIT_SPLIT } from '../utils/constants.js'

describe('ACCOUNT_SIZES', () => {
  it('has standard sizes', () => {
    expect(ACCOUNT_SIZES).toContain(10000)
    expect(ACCOUNT_SIZES).toContain(25000)
    expect(ACCOUNT_SIZES).toContain(50000)
    expect(ACCOUNT_SIZES).toContain(100000)
    expect(ACCOUNT_SIZES).toContain(200000)
  })
})

describe('ACCOUNT_PRICES', () => {
  it('has prices for all account sizes', () => {
    for (const size of ACCOUNT_SIZES) {
      expect(ACCOUNT_PRICES[size]).toBeDefined()
      expect(ACCOUNT_PRICES[size].evaluation).toBeGreaterThan(0)
      expect(ACCOUNT_PRICES[size].instant).toBeGreaterThan(0)
    }
  })

  it('instant is more expensive than evaluation', () => {
    for (const size of ACCOUNT_SIZES) {
      expect(ACCOUNT_PRICES[size].instant).toBeGreaterThan(ACCOUNT_PRICES[size].evaluation)
    }
  })
})

describe('DEFAULT_RULES', () => {
  it('has evaluation phases', () => {
    expect(DEFAULT_RULES.evaluation_1).toBeDefined()
    expect(DEFAULT_RULES.evaluation_2).toBeDefined()
    expect(DEFAULT_RULES.funded).toBeDefined()
  })

  it('funded phase has no profit target', () => {
    expect(DEFAULT_RULES.funded.profitTarget).toBeNull()
  })

  it('evaluation phases have profit targets', () => {
    expect(DEFAULT_RULES.evaluation_1.profitTarget).toBeGreaterThan(0)
    expect(DEFAULT_RULES.evaluation_2.profitTarget).toBeGreaterThan(0)
  })

  it('max daily loss is 6% across all phases', () => {
    for (const phase of Object.values(DEFAULT_RULES)) {
      expect((phase as any).maxDailyLoss).toBe(6)
    }
  })
})

describe('PROFIT_SPLIT', () => {
  it('is 80%', () => {
    expect(PROFIT_SPLIT).toBe(0.80)
  })
})

describe('SYMBOLS', () => {
  it('contains all major forex pairs', () => {
    const majors = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF']
    for (const m of majors) {
      expect(SYMBOLS[m]).toBeDefined()
    }
  })

  it('has required fields for each symbol', () => {
    for (const [sym, info] of Object.entries(SYMBOLS)) {
      expect(info.digits).toBeGreaterThan(0)
      expect(info.pipValue).toBeGreaterThan(0)
      expect(info.contractSize).toBeGreaterThan(0)
      expect(info.margin).toBeGreaterThan(0)
      expect(['forex', 'metals', 'oil', 'indices', 'crypto']).toContain(info.category)
    }
  })

  it('EURUSD has correct values', () => {
    const eur = SYMBOLS['EURUSD']
    expect(eur.digits).toBe(5)
    expect(eur.pipValue).toBe(0.0001)
    expect(eur.contractSize).toBe(100000)
    expect(eur.category).toBe('forex')
  })

  it('XAUUSD has correct metal values', () => {
    const xau = SYMBOLS['XAUUSD']
    expect(xau.digits).toBe(2)
    expect(xau.contractSize).toBe(100)
    expect(xau.category).toBe('metals')
  })

  it('BTCUSDT has correct crypto values', () => {
    const btc = SYMBOLS['BTCUSDT']
    expect(btc.digits).toBe(2)
    expect(btc.contractSize).toBe(1)
    expect(btc.category).toBe('crypto')
  })

  it('SPX has correct index values', () => {
    const spx = SYMBOLS['SPX']
    expect(spx.digits).toBe(2)
    expect(spx.contractSize).toBe(50)
    expect(spx.category).toBe('indices')
  })

  it('USOIL has correct oil values', () => {
    const oil = SYMBOLS['USOIL']
    expect(oil.digits).toBe(2)
    expect(oil.contractSize).toBe(1000)
    expect(oil.category).toBe('oil')
  })
})

describe('COMMISSION', () => {
  it('has rates for all categories', () => {
    const categories = ['forex', 'metals', 'crypto', 'indices', 'oil']
    for (const cat of categories) {
      expect(COMMISSION[cat]).toBeDefined()
      expect(COMMISSION[cat]).toBeGreaterThanOrEqual(0)
    }
  })

  it('crypto has zero commission', () => {
    expect(COMMISSION.crypto).toBe(0)
  })

  it('forex has 3.5 per lot', () => {
    expect(COMMISSION.forex).toBe(3.5)
  })
})

describe('SPREAD_MARKUP', () => {
  it('has markup for all categories', () => {
    const categories = ['forex', 'metals', 'crypto', 'indices', 'oil']
    for (const cat of categories) {
      expect(SPREAD_MARKUP[cat]).toBeDefined()
    }
  })

  it('crypto has zero spread markup', () => {
    expect(SPREAD_MARKUP.crypto).toBe(0)
  })
})
