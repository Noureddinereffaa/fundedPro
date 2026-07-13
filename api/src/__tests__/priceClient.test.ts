import { afterEach, describe, expect, it, vi } from 'vitest'
import { PriceSnapshotClient, resolveWsServerUrl } from '../utils/priceClient.js'

describe('resolveWsServerUrl', () => {
  const original = process.env.WS_SERVER_URL

  afterEach(() => {
    if (original === undefined) delete process.env.WS_SERVER_URL
    else process.env.WS_SERVER_URL = original
  })

  it('uses a configured server URL when present', () => {
    process.env.WS_SERVER_URL = 'https://example.test:4000'
    expect(resolveWsServerUrl()).toBe('https://example.test:4000')
  })

  it('falls back to localhost when no override is provided', () => {
    delete process.env.WS_SERVER_URL
    expect(resolveWsServerUrl()).toBe('http://localhost:3002')
  })
})

describe('PriceSnapshotClient', () => {
  it('reuses cached data inside the TTL window', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ EURUSD: { price: 1.105, change: 0.01 } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = new PriceSnapshotClient({ ttlMs: 5000 })
    const first = await client.getPrices()
    const second = await client.getPrices()

    expect(first).toEqual({ EURUSD: { price: 1.105, change: 0.01 } })
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
