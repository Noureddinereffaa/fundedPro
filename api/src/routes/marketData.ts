import { Router } from 'express'
import { marketDataService } from '../market-data/index.js'
import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

const candleSchema = z.object({
  symbol: z.string().min(1),
  resolution: z.string().min(1),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(5000).optional(),
})

router.get('/candles', asyncHandler(async (req, res) => {
  const { symbol, resolution, from, to, limit } = candleSchema.parse(req.query)
  const candles = await marketDataService.getOHLCV(symbol, resolution as any, from, to, limit)
  res.json({ symbol, resolution, candles })
}))

router.get('/ticker', asyncHandler(async (req, res) => {
  const { symbol } = z.object({ symbol: z.string().min(1) }).parse(req.query)
  const ticker = await marketDataService.getTicker(symbol)
  res.json(ticker)
}))

router.get('/tickers', asyncHandler(async (req, res) => {
  const { symbols } = z.object({ symbols: z.string() }).parse(req.query)
  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean)
  const tickers = await marketDataService.getTickers(symbolList)
  res.json(tickers)
}))

router.get('/symbols', asyncHandler(async (req, res) => {
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
}))

export default router