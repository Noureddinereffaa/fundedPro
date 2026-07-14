import {
  SymbolDefinition, MarketType, ProviderName, SearchResult,
} from './types'

export class SymbolRegistry {
  private symbols: Map<string, SymbolDefinition>
  private byMarketType: Map<MarketType, SymbolDefinition[]>
  private byProvider: Map<string, Map<string, SymbolDefinition>>

  constructor() {
    this.symbols = new Map()
    this.byMarketType = new Map()
    this.byProvider = new Map()
  }

  register(symbol: SymbolDefinition): void {
    this.symbols.set(symbol.id, symbol)

    const byType = this.byMarketType.get(symbol.marketType) || []
    byType.push(symbol)
    this.byMarketType.set(symbol.marketType, byType)

    for (const [provider, nativeSymbol] of Object.entries(symbol.providerSymbols)) {
      const providerMap = this.byProvider.get(provider) || new Map()
      providerMap.set(nativeSymbol.toUpperCase(), symbol)
      this.byProvider.set(provider, providerMap)
    }
  }

  registerMany(symbols: SymbolDefinition[]): void {
    for (const s of symbols) this.register(s)
  }

  getById(id: string): SymbolDefinition | undefined {
    return this.symbols.get(id)
  }

  getBySymbol(symbol: string): SymbolDefinition | undefined {
    const upper = symbol.toUpperCase()
    return Array.from(this.symbols.values()).find(
      s => s.symbol.toUpperCase() === upper || s.id.toUpperCase() === upper
    )
  }

  getByNativeSymbol(provider: ProviderName, nativeSymbol: string): SymbolDefinition | undefined {
    return this.byProvider.get(provider)?.get(nativeSymbol.toUpperCase())
  }

  getByMarketType(type: MarketType): SymbolDefinition[] {
    return this.byMarketType.get(type) || []
  }

  getAll(): SymbolDefinition[] {
    return Array.from(this.symbols.values())
  }

  search(query: string, marketType?: MarketType, limit: number = 20): SearchResult[] {
    const q = query.toLowerCase()
    const results: SearchResult[] = []

    const candidates = marketType
      ? this.getByMarketType(marketType)
      : this.getAll()

    for (const sym of candidates) {
      let relevance = 0

      if (sym.symbol.toLowerCase() === q) relevance = 100
      else if (sym.symbol.toLowerCase().startsWith(q)) relevance = 80
      else if (sym.symbol.toLowerCase().includes(q)) relevance = 60
      else if (sym.name.toLowerCase().includes(q)) relevance = 40
      else if (sym.description?.toLowerCase().includes(q)) relevance = 20

      if (relevance > 0) {
        results.push({ symbol: sym, relevance, provider: sym.providerSymbols[ProviderName.CCXT] ? ProviderName.CCXT : ProviderName.OPENBB })
      }
    }

    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
  }

  resolveProviderSymbol(symbolId: string, provider: ProviderName): string | null {
    const sym = this.getById(symbolId)
    return sym?.providerSymbols[provider] || null
  }

  getAllMarketTypes(): MarketType[] {
    return Array.from(this.byMarketType.keys())
  }

  count(): number {
    return this.symbols.size
  }
}

export const symbolRegistry = new SymbolRegistry()

function createCryptoSymbol(
  base: string, quote: string, name: string,
  precision: number, minLot: number, lotStep: number,
  ccxtId?: string
): SymbolDefinition {
  const id = `${base}/${quote}`
  return {
    id,
    symbol: id,
    name,
    description: `${base} / ${quote} crypto pair`,
    marketType: MarketType.CRYPTO,
    baseCurrency: base,
    quoteCurrency: quote,
    precision,
    minLot,
    lotStep,
    pipValue: 0.01,
    contractSize: 1,
    providerSymbols: {
      [ProviderName.CCXT]: ccxtId || `${base}/${quote}`,
      [ProviderName.OPENBB]: `${base}-${quote}`,
      [ProviderName.YAHOO]: `${base}-${quote}`,
      [ProviderName.BINANCE]: `${base}${quote}`,
      [ProviderName.STOOQ]: `${base}${quote}.US`,
    },
    isActive: true,
  }
}

function createForexSymbol(
  base: string, quote: string, name: string,
  precision: number, pipValue: number
): SymbolDefinition {
  const id = `${base}/${quote}`
  return {
    id,
    symbol: id,
    name,
    description: `${base} / ${quote} forex pair`,
    marketType: MarketType.FOREX,
    baseCurrency: base,
    quoteCurrency: quote,
    precision,
    minLot: 0.01,
    lotStep: 0.01,
    pipValue,
    contractSize: 100000,
    sessionHours: [
      { open: '22:00', close: '24:00', timezone: 'UTC' },
      { open: '00:00', close: '22:00', timezone: 'UTC' },
    ],
    providerSymbols: {
      [ProviderName.OPENBB]: `${base}${quote}=X`,
      [ProviderName.YAHOO]: `${base}${quote}=X`,
      [ProviderName.STOOQ]: `${base}${quote}.US`,
      [ProviderName.CCXT]: `${base}/${quote}`,
    },
    isActive: true,
  }
}

function createMetalSymbol(
  base: string, name: string, precision: number
): SymbolDefinition {
  const id = `XAU/${base}`
  const symbolName = base === 'USD' ? `Gold / ${base}` : `Silver / ${base}`
  return {
    id: `XAU/${base}`,
    symbol: `XAU/${base}`,
    name: symbolName,
    description: `${name} spot price in ${base}`,
    marketType: MarketType.METALS,
    baseCurrency: 'XAU',
    quoteCurrency: base,
    precision,
    minLot: 0.01,
    lotStep: 0.01,
    pipValue: 0.01,
    contractSize: 100,
    sessionHours: [
      { open: '23:00', close: '24:00', timezone: 'UTC' },
      { open: '00:00', close: '23:00', timezone: 'UTC' },
    ],
    providerSymbols: {
      [ProviderName.OPENBB]: `${name.toUpperCase()}=X`,
      [ProviderName.YAHOO]: `${name.toUpperCase()}=X`,
      [ProviderName.STOOQ]: `${name}.US`,
    },
    isActive: true,
  }
}

function createIndexSymbol(
  id: string, name: string, description: string,
  precision: number, pipValue: number,
  yahooSymbol: string, stooqSymbol: string
): SymbolDefinition {
  return {
    id,
    symbol: id,
    name,
    description,
    marketType: MarketType.INDICES,
    baseCurrency: id,
    quoteCurrency: 'USD',
    precision,
    minLot: 0.1,
    lotStep: 0.1,
    pipValue,
    contractSize: 1,
    sessionHours: [
      { open: '09:30', close: '16:00', timezone: 'America/New_York' },
    ],
    providerSymbols: {
      [ProviderName.OPENBB]: yahooSymbol,
      [ProviderName.YAHOO]: yahooSymbol,
      [ProviderName.STOOQ]: stooqSymbol,
    },
    isActive: true,
  }
}

const CRYPTO_SYMBOLS: SymbolDefinition[] = [
  createCryptoSymbol('BTC', 'USDT', 'Bitcoin', 2, 0.0001, 0.0001),
  createCryptoSymbol('ETH', 'USDT', 'Ethereum', 2, 0.001, 0.001),
  createCryptoSymbol('SOL', 'USDT', 'Solana', 3, 0.01, 0.01),
  createCryptoSymbol('BNB', 'USDT', 'Binance Coin', 2, 0.001, 0.001),
  createCryptoSymbol('XRP', 'USDT', 'Ripple', 4, 0.1, 0.1),
  createCryptoSymbol('ADA', 'USDT', 'Cardano', 4, 0.1, 0.1),
  createCryptoSymbol('DOGE', 'USDT', 'Dogecoin', 5, 1, 1),
  createCryptoSymbol('DOT', 'USDT', 'Polkadot', 3, 0.01, 0.01),
  createCryptoSymbol('MATIC', 'USDT', 'Polygon', 4, 0.1, 0.1),
  createCryptoSymbol('AVAX', 'USDT', 'Avalanche', 2, 0.01, 0.01),
  createCryptoSymbol('LINK', 'USDT', 'Chainlink', 3, 0.01, 0.01),
  createCryptoSymbol('UNI', 'USDT', 'Uniswap', 3, 0.01, 0.01),
  createCryptoSymbol('ATOM', 'USDT', 'Cosmos', 3, 0.01, 0.01),
  createCryptoSymbol('LTC', 'USDT', 'Litecoin', 2, 0.001, 0.001),
  createCryptoSymbol('BCH', 'USDT', 'Bitcoin Cash', 2, 0.001, 0.001),
  createCryptoSymbol('FIL', 'USDT', 'Filecoin', 3, 0.01, 0.01),
  createCryptoSymbol('NEAR', 'USDT', 'NEAR Protocol', 3, 0.01, 0.01),
  createCryptoSymbol('APT', 'USDT', 'Aptos', 3, 0.01, 0.01),
  createCryptoSymbol('ARB', 'USDT', 'Arbitrum', 3, 0.01, 0.01),
  createCryptoSymbol('OP', 'USDT', 'Optimism', 3, 0.01, 0.01),
]

const FOREX_SYMBOLS: SymbolDefinition[] = [
  createForexSymbol('EUR', 'USD', 'Euro / US Dollar', 5, 0.0001),
  createForexSymbol('GBP', 'USD', 'British Pound / US Dollar', 5, 0.0001),
  createForexSymbol('USD', 'JPY', 'US Dollar / Japanese Yen', 3, 0.01),
  createForexSymbol('AUD', 'USD', 'Australian Dollar / US Dollar', 5, 0.0001),
  createForexSymbol('USD', 'CAD', 'US Dollar / Canadian Dollar', 5, 0.0001),
  createForexSymbol('USD', 'CHF', 'US Dollar / Swiss Franc', 5, 0.0001),
  createForexSymbol('NZD', 'USD', 'New Zealand Dollar / US Dollar', 5, 0.0001),
  createForexSymbol('EUR', 'GBP', 'Euro / British Pound', 5, 0.0001),
  createForexSymbol('EUR', 'JPY', 'Euro / Japanese Yen', 3, 0.01),
  createForexSymbol('GBP', 'JPY', 'British Pound / Japanese Yen', 3, 0.01),
  createForexSymbol('EUR', 'CHF', 'Euro / Swiss Franc', 5, 0.0001),
  createForexSymbol('AUD', 'JPY', 'Australian Dollar / Japanese Yen', 3, 0.01),
  createForexSymbol('GBP', 'AUD', 'British Pound / Australian Dollar', 5, 0.0001),
  createForexSymbol('NZD', 'JPY', 'New Zealand Dollar / Japanese Yen', 3, 0.01),
  createForexSymbol('USD', 'MXN', 'US Dollar / Mexican Peso', 4, 0.0001),
  createForexSymbol('USD', 'ZAR', 'US Dollar / South African Rand', 4, 0.0001),
  createForexSymbol('USD', 'TRY', 'US Dollar / Turkish Lira', 4, 0.0001),
  createForexSymbol('EUR', 'AUD', 'Euro / Australian Dollar', 5, 0.0001),
  createForexSymbol('GBP', 'CHF', 'British Pound / Swiss Franc', 5, 0.0001),
  createForexSymbol('EUR', 'NOK', 'Euro / Norwegian Krone', 4, 0.0001),
]

const METAL_SYMBOLS: SymbolDefinition[] = [
  createMetalSymbol('USD', 'Gold', 2),
  {
    ...createMetalSymbol('USD', 'Silver', 3),
    symbol: 'XAG/USD',
    id: 'XAG/USD',
    name: 'Silver / USD',
    description: 'Silver spot price in USD',
    baseCurrency: 'XAG',
    pipValue: 0.001,
  },
  {
    id: 'XPT/USD',
    symbol: 'XPT/USD',
    name: 'Platinum / USD',
    description: 'Platinum spot price in USD',
    marketType: MarketType.METALS,
    baseCurrency: 'XPT',
    quoteCurrency: 'USD',
    precision: 2,
    minLot: 0.01,
    lotStep: 0.01,
    pipValue: 0.01,
    contractSize: 50,
    providerSymbols: {
      [ProviderName.OPENBB]: 'PLATINUM=X',
      [ProviderName.YAHOO]: 'PLATINUM=X',
      [ProviderName.STOOQ]: 'PLATINUM.US',
    },
    isActive: true,
  },
  {
    id: 'XPD/USD',
    symbol: 'XPD/USD',
    name: 'Palladium / USD',
    description: 'Palladium spot price in USD',
    marketType: MarketType.METALS,
    baseCurrency: 'XPD',
    quoteCurrency: 'USD',
    precision: 2,
    minLot: 0.01,
    lotStep: 0.01,
    pipValue: 0.01,
    contractSize: 50,
    providerSymbols: {
      [ProviderName.OPENBB]: 'PALLADIUM=X',
      [ProviderName.YAHOO]: 'PALLADIUM=X',
      [ProviderName.STOOQ]: 'PALLADIUM.US',
    },
    isActive: true,
  },
]

const INDEX_SYMBOLS: SymbolDefinition[] = [
  createIndexSymbol('SPX', 'S&P 500', 'Standard & Poor\'s 500 Index', 2, 0.1, '^GSPC', 'SPX.US'),
  createIndexSymbol('NDX', 'Nasdaq 100', 'Nasdaq 100 Index', 2, 0.1, '^IXIC', 'NDX.US'),
  createIndexSymbol('DJI', 'Dow Jones', 'Dow Jones Industrial Average', 2, 0.1, '^DJI', 'DJI.US'),
  createIndexSymbol('FTSE', 'FTSE 100', 'FTSE 100 Index', 2, 0.1, '^FTSE', 'UKX.UK'),
  createIndexSymbol('DAX', 'DAX 40', 'German DAX 40 Index', 2, 0.1, '^GDAXI', 'DAX.DE'),
  createIndexSymbol('NIKKEI', 'Nikkei 225', 'Nikkei 225 Index', 0, 1, '^N225', 'NI225.JP'),
  createIndexSymbol('HSI', 'Hang Seng', 'Hang Seng Index', 0, 1, '^HSI', 'HSI.HK'),
  createIndexSymbol('ASX200', 'ASX 200', 'Australian S&P/ASX 200 Index', 2, 0.1, '^AXJO', 'XJO.AU'),
  createIndexSymbol('VIX', 'VIX', 'CBOE Volatility Index', 2, 0.01, '^VIX', 'VIX.US'),
  createIndexSymbol('IBOV', 'IBOVESPA', 'Brazilian IBOVESPA Index', 0, 1, '^BVSP', 'IBOV.BR'),
]

export function initializeRegistry(): void {
  symbolRegistry.registerMany(CRYPTO_SYMBOLS)
  symbolRegistry.registerMany(FOREX_SYMBOLS)
  symbolRegistry.registerMany(METAL_SYMBOLS)
  symbolRegistry.registerMany(INDEX_SYMBOLS)
}
