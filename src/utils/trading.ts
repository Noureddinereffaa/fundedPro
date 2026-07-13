export function formatPrice(p: number, symbol: string): string {
  if (symbol.startsWith('DOGE') || symbol.startsWith('XRP') || symbol.startsWith('ADA')) return p.toFixed(5)
  if (symbol.startsWith('SOL') || symbol.startsWith('DOT') || symbol.startsWith('LINK')) return p.toFixed(3)
  return p.toFixed(2)
}

export function getContractSize(sym: string): number {
  return 1
}

export function getPipSize(sym: string): number {
  if (sym.startsWith('BTC')) return 1
  if (sym.startsWith('ETH')) return 0.1
  if (sym.startsWith('SOL')) return 0.01
  return 0.0001
}

export function getQuoteToUsdRate(sym: string, getPrice: (symbol: string) => number | undefined): number {
  if (sym.endsWith('USD') || sym.endsWith('USDT')) return 1
  const quote = sym.slice(3)
  if (sym.startsWith('USD')) {
    const inv = getPrice(`USD${quote}`)
    return inv && inv > 0 ? 1 / inv : 1
  }
  const direct = getPrice(`${quote}USD`)
  if (direct && direct > 0) return direct
  const inv = getPrice(`USD${quote}`)
  return inv && inv > 0 ? 1 / inv : 1
}

export function calcPnl(
  side: string,
  open: number,
  close: number,
  vol: number,
  sym: string,
  quoteToUsdRate: number = 1,
): number {
  const diff = side === 'buy' ? close - open : open - close
  const contractSize = getContractSize(sym)
  let pnl = diff * vol * contractSize

  if (sym.startsWith('USD') && !sym.endsWith('USD') && !sym.endsWith('USDT') && close > 0) {
    pnl = pnl / close
  } else if (!sym.endsWith('USD') && !sym.endsWith('USDT') && quoteToUsdRate !== 1) {
    pnl = pnl * quoteToUsdRate
  }

  return pnl
}
