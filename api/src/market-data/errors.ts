import { ProviderName } from './types'

export class MarketDataError extends Error {
  constructor(
    public provider: ProviderName,
    public symbol: string,
    message: string,
    public retryable: boolean = true,
    public code?: string
  ) {
    super(message)
    this.name = 'MarketDataError'
  }
}

export class ProviderNotConnectedError extends MarketDataError {
  constructor(provider: ProviderName, symbol: string) {
    super(provider, symbol, `${provider} is not connected`, true, 'PROVIDER_NOT_CONNECTED')
    this.name = 'ProviderNotConnectedError'
  }
}

export class SymbolNotFoundError extends MarketDataError {
  constructor(symbol: string, provider: ProviderName) {
    super(provider, symbol, `Symbol ${symbol} not found on ${provider}`, false, 'SYMBOL_NOT_FOUND')
    this.name = 'SymbolNotFoundError'
  }
}

export class RateLimitError extends MarketDataError {
  constructor(provider: ProviderName, retryAfterMs: number) {
    super(provider, '', `Rate limit hit on ${provider}`, true, 'RATE_LIMIT')
    this.retryAfterMs = retryAfterMs
    this.name = 'RateLimitError'
  }

  retryAfterMs: number
}

export class AllProvidersFailedError extends Error {
  constructor(
    public symbol: string,
    public errors: MarketDataError[]
  ) {
    super(`All providers failed for ${symbol}: ${errors.map(e => e.message).join('; ')}`)
    this.name = 'AllProvidersFailedError'
  }
}
