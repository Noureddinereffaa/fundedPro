import { describe, it, expect } from 'vitest'
import { resolveChartReferencePrice } from '../utils/chartPrice'

describe('resolveChartReferencePrice', () => {
  it('prefers the latest live price when it is available', () => {
    const price = resolveChartReferencePrice(1.2345, { close: 1.2, open: 1.1, high: 1.25, low: 1.05, volume: 10, time: Date.now() })
    expect(price).toBe(1.2345)
  })

  it('falls back to the latest candle close when no live price exists', () => {
    const price = resolveChartReferencePrice(undefined, { close: 1.2, open: 1.1, high: 1.25, low: 1.05, volume: 10, time: Date.now() })
    expect(price).toBe(1.2)
  })

  it('returns null when there is no usable price', () => {
    const price = resolveChartReferencePrice(undefined, undefined)
    expect(price).toBeNull()
  })
})
