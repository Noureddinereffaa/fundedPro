import { describe, it, expect } from 'vitest'
import {
  SYMBOLS,
  COMMISSION,
  SPREAD_MARKUP,
  ACCOUNT_SIZES,
  ACCOUNT_PRICES,
  DEFAULT_RULES,
  PROFIT_SPLIT,
} from '../utils/constants.js'

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
    expect(PROFIT_SPLIT).toBe(0.8)
  })
})

describe('SYMBOLS', () => {
  it('contains major crypto pairs', () => {
    const majors = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT']
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
      expect(['crypto', 'rwa']).toContain(info.category)
    }
  })

  it('contains RWA symbols', () => {
    const rwaSymbols = ['MKRUSDT', 'ONDOUSDT', 'PENDLEUSDT', 'CFGUSDT', 'POLYXUSDT']
    for (const s of rwaSymbols) {
      expect(SYMBOLS[s]).toBeDefined()
      expect(SYMBOLS[s].category).toBe('rwa')
    }
  })

  it('BTCUSDT has correct crypto values', () => {
    const btc = SYMBOLS['BTCUSDT']
    expect(btc.digits).toBe(2)
    expect(btc.contractSize).toBe(1)
    expect(btc.category).toBe('crypto')
  })

  it('ONDOUSDT has correct rwa values', () => {
    const ondo = SYMBOLS['ONDOUSDT']
    expect(ondo.digits).toBe(4)
    expect(ondo.contractSize).toBe(1)
    expect(ondo.category).toBe('rwa')
  })
})

describe('COMMISSION', () => {
  it('has rates for all categories', () => {
    const categories = ['crypto', 'rwa']
    for (const cat of categories) {
      expect(COMMISSION[cat]).toBeDefined()
      expect(COMMISSION[cat]).toBeGreaterThanOrEqual(0)
    }
  })

  it('crypto has zero commission', () => {
    expect(COMMISSION.crypto).toBe(0)
  })

  it('rwa has zero commission', () => {
    expect(COMMISSION.rwa).toBe(0)
  })
})

describe('SPREAD_MARKUP', () => {
  it('has markup for all categories', () => {
    const categories = ['crypto', 'rwa']
    for (const cat of categories) {
      expect(SPREAD_MARKUP[cat]).toBeDefined()
    }
  })

  it('crypto has zero spread markup', () => {
    expect(SPREAD_MARKUP.crypto).toBe(0)
  })

  it('rwa has zero spread markup', () => {
    expect(SPREAD_MARKUP.rwa).toBe(0)
  })
})
