import { Router, Request, Response } from 'express'
import { marketDataService } from '../market-data/index.js'
import { z } from 'zod'
import { Resolution } from '../market-data/types.js'

const router = Router()

const candleSchema = z.object({
  symbol: z.string().min(1),
  resolution: z.string().min(1),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(5000).optional(),
})

// Normalize resolution from frontend format (D, W, M) to backend format (D1, W1, MN1)
function normalizeResolution(resolution: string): string {
  const map: Record<string, Resolution> = {
    'D': Resolution.D1,
    'W': Resolution.W1,
    'M': Resolution.MN1,
  }
  return map[resolution] || resolution
}

router.get('/candles', async (req: Request, res: Response) => {
  try {
    console.log('[MarketData] candles query:', req.query)
    const { symbol, resolution, from, to, limit } = candleSchema.parse(req.query)
    const normalizedResolution = normalizeResolution(resolution)
    console.log('[MarketData] parsed:', { symbol, resolution: normalizedResolution, from, to, limit })
    const candles = await marketDataService.getOHLCV(symbol, normalizedResolution as any, from, to, limit)
    res.json({ symbol, resolution: normalizedResolution, candles })
  } catch (err) {
    console.error('[MarketData] candles error:', err)
    res.status(400).json({ error: 'Invalid parameters', details: err instanceof Error ? err.message : String(err) })
  }
})

router.get('/ticker', async (req: Request, res: Response) => {
  try {
    const { symbol } = z.object({ symbol: z.string().min(1) }).parse(req.query)
    const ticker = await marketDataService.getTicker(symbol)
    res.json(ticker)
  } catch (err) {
    res.status(400).json({ error: 'Invalid symbol' })
  }
})

router.get('/tickers', async (req: Request, res: Response) => {
  try {
    const { symbols } = z.object({ symbols: z.string() }).parse(req.query)
    const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean)
    const tickers = await marketDataService.getTickers(symbolList)
    res.json(tickers)
  } catch (err) {
    res.status(400).json({ error: 'Invalid symbols' })
  }
})

router.get('/symbols', async (req: Request, res: Response) => {
  try {
    const { marketType } = z.object({ marketType: z.string().optional() }).parse(req.query)
    const symbols = marketDataService.getAllSymbols()
    const filtered = marketType
      ? symbols.filter(s => s.marketType === marketType)
      : symbols
    res.json(filtered.map(s => ({
      symbol: s.symbol,
      name: s.name,
      marketType: s.marketType,
      baseCurrency: s.baseCurrency,
      quoteCurrency: s.quoteCurrency,
      precision: s.precision,
    })))
  } catch (err) {
    res.status(400).json({ error: 'Invalid parameters' })
  }
})

export default router