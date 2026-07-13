/**
 * Pro FundX - UI Market Data Test
 * 
 * Tests how market data appears in the frontend:
 * - Market Watch panel updates
 * - Chart candle rendering
 * - Price formatting
 * - Live price indicators
 * 
 * Run: node test-ui-markets.js [--url http://localhost:5173]
 */

import WebSocket from 'ws'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const symbols = JSON.parse(readFileSync(resolve(__dirname, 'shared', 'symbols.json'), 'utf-8'))

const WS_URL = process.argv.includes('--ws') 
  ? process.argv[process.argv.indexOf('--ws') + 1] 
  : 'ws://localhost:3002'

// ── Speed Benchmarks ───────────────────────────────────────
const benchmarks = {
  connection: [],
  klineFetch: { '60': [], '300': [], '3600': [], 'D': [] },
  tickerLatency: [],
  candleUpdate: []
}

// ── Data Quality Checks ────────────────────────────────────
const qualityChecks = {
  priceSpikes: [],      // Unreasonable price jumps
  staleData: [],        // Data older than expected
  missingFields: [],    // Klines with missing OHLCV
  zeroPrices: [],       // Zero or negative prices
  duplicateCandles: [], // Duplicate timestamps
}

function log(msg, color = '\x1b[0m') {
  console.log(`${color}${msg}\x1b[0m`)
}

function formatMs(ms) {
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

// ── Test Suite ─────────────────────────────────────────────
class UI_marketTest {
  constructor() {
    this.ws = null
    this.tickerUpdates = new Map()
    this.candleUpdates = []
    this.initialData = new Map()
  }

  connect() {
    return new Promise((resolve, reject) => {
      const start = Date.now()
      this.ws = new WebSocket(WS_URL)
      
      this.ws.on('open', () => {
        benchmarks.connection.push(Date.now() - start)
        resolve()
      })
      
      this.ws.on('error', reject)
      
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString())
          this.handleMessage(msg)
        } catch {}
      })
    })
  }

  handleMessage(msg) {
    const receiveTime = Date.now()
    
    if (msg.type === 'tick') {
      const prev = this.tickerUpdates.get(msg.symbol)
      const latency = prev ? receiveTime - prev.receiveTime : 0
      if (latency > 0 && latency < 60000) {
        benchmarks.tickerLatency.push(latency)
      }
      this.tickerUpdates.set(msg.symbol, {
        price: msg.price,
        change: msg.change,
        time: msg.time,
        receiveTime
      })
    }

    if (msg.type === 'initial') {
      const key = `${msg.symbol}_${msg.interval}`
      this.initialData.set(key, {
        klines: msg.klines || [],
        serverPrice: msg.price,
        receiveTime
      })
    }

    if (msg.type === 'candle' || msg.type === 'candle_update') {
      this.candleUpdates.push({
        symbol: msg.symbol,
        interval: msg.interval,
        kline: msg.kline,
        receiveTime
      })
      benchmarks.candleUpdate.push(receiveTime)
    }
  }

  subscribe(symbol, interval, needsInitial = false) {
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      symbols: [symbol],
      interval,
      needsInitial
    }))
  }

  async testKlineSpeed(symbol, interval) {
    const start = Date.now()
    
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({ success: false, time: 15000, count: 0, error: 'Timeout' })
      }, 15000)

      const handler = (data) => {
        try {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'initial' && msg.symbol === symbol && msg.interval === interval) {
            clearTimeout(timer)
            this.ws.removeListener('message', handler)
            const elapsed = Date.now() - start
            resolve({
              success: true,
              time: elapsed,
              count: (msg.klines || []).length,
              price: msg.price,
              klines: msg.klines
            })
          }
        } catch {}
      }

      this.ws.on('message', handler)
      this.subscribe(symbol, interval, true)
    })
  }

  validateKlines(klines, symbol, interval) {
    const issues = []
    
    if (!klines || klines.length === 0) {
      issues.push('No klines returned')
      return issues
    }

    const nowSec = Math.floor(Date.now() / 1000)
    const seen = new Set()

    for (let i = 0; i < klines.length; i++) {
      const k = klines[i]
      
      // Check required fields
      if (k.time == null || k.open == null || k.high == null || k.low == null || k.close == null) {
        qualityChecks.missingFields.push({ symbol, interval, index: i })
        issues.push(`Kline ${i}: Missing OHLCV fields`)
        continue
      }

      // Check prices are valid
      if (k.open <= 0 || k.high <= 0 || k.low <= 0 || k.close <= 0) {
        qualityChecks.zeroPrices.push({ symbol, interval, index: i, price: k.close })
        issues.push(`Kline ${i}: Zero/negative price`)
      }

      // Check OHLCV consistency
      if (k.high < k.low) {
        issues.push(`Kline ${i}: high (${k.high}) < low (${k.low})`)
      }
      if (k.high < Math.max(k.open, k.close)) {
        issues.push(`Kline ${i}: high < max(open, close)`)
      }
      if (k.low > Math.min(k.open, k.close)) {
        issues.push(`Kline ${i}: low > min(open, close)`)
      }

      // Check for duplicates
      if (seen.has(k.time)) {
        qualityChecks.duplicateCandles.push({ symbol, interval, time: k.time })
        issues.push(`Kline ${i}: Duplicate timestamp`)
      }
      seen.add(k.time)

      // Check for price spikes (>50% jump in one candle)
      if (i > 0) {
        const prev = klines[i - 1]
        const change = Math.abs(k.close - prev.close) / prev.close
        if (change > 0.5) {
          qualityChecks.priceSpikes.push({
            symbol, interval, index: i,
            from: prev.close, to: k.close,
            change: (change * 100).toFixed(1) + '%'
          })
          issues.push(`Kline ${i}: Price spike ${(change * 100).toFixed(1)}%`)
        }
      }
    }

    // Check recency
    const lastKline = klines[klines.length - 1]
    const maxAge = {
      '60': 3600,      // 1 hour for 1m candles
      '300': 14400,     // 4 hours for 5m candles
      '900': 43200,     // 12 hours for 15m candles
      '3600': 172800,   // 48 hours for 1h candles
      'D': 604800       // 7 days for daily candles
    }[interval] || 86400

    if (lastKline && (nowSec - lastKline.time) > maxAge) {
      qualityChecks.staleData.push({
        symbol, interval,
        lastTime: new Date(lastKline.time * 1000).toISOString(),
        ageHours: ((nowSec - lastKline.time) / 3600).toFixed(1)
      })
      issues.push(`Stale data: last candle ${((nowSec - lastKline.time) / 3600).toFixed(1)}h old`)
    }

    return issues
  }

  async runAllTests() {
    log('\n  ═══════════════════════════════════════════════════════', '\x1b[36m')
    log('   Pro FundX - UI & Speed Test Suite', '\x1b[36m')
    log('  ═══════════════════════════════════════════════════════', '\x1b[36m')
    log(`   WebSocket: ${WS_URL}`)
    log('  ───────────────────────────────────────────────────────\n')

    // Connect
    log('  [1/5] Connecting...', '\x1b[33m')
    try {
      await this.connect()
      log('  ✓ Connected\n', '\x1b[32m')
    } catch (err) {
      log(`  ✗ Failed: ${err.message}`, '\x1b[31m')
      return
    }

    // Test 2: Kline fetch speed per market type
    log('  [2/5] Kline fetch speed test...\n', '\x1b[33m')
    const testSymbols = [
      { sym: 'BTCUSDT', type: 'crypto' },
      { sym: 'ETHUSDT', type: 'crypto' },
      { sym: 'EURUSD', type: 'forex' },
      { sym: 'GBPJPY', type: 'forex' },
      { sym: 'XAUUSD', type: 'commodity' },
      { sym: 'USOIL', type: 'commodity' },
      { sym: 'SPX', type: 'index' },
      { sym: 'DAX', type: 'index' },
    ]

    for (const { sym, type } of testSymbols) {
      const result = await this.testKlineSpeed(sym, '60')
      const icon = result.success ? '\x1b[32m✓' : '\x1b[31m✗'
      const speed = result.success 
        ? `${formatMs(result.time)} (${result.count} candles)` 
        : result.error
      log(`    ${icon} ${sym.padEnd(12)} ${type.padEnd(10)} ${speed}\x1b[0m`)
      
      benchmarks.klineFetch['60'].push(result.time)
      
      if (result.success && result.klines) {
        const issues = this.validateKlines(result.klines, sym, '60')
        if (issues.length > 0) {
          for (const issue of issues) {
            log(`      └─ ${issue}`, '\x1b[33m')
          }
        }
      }
    }
    log('')

    // Test 3: Multi-interval speed for BTCUSDT
    log('  [3/5] Multi-interval speed (BTCUSDT)...\n', '\x1b[33m')
    for (const interval of ['60', '300', '3600', 'D']) {
      const result = await this.testKlineSpeed('BTCUSDT', interval)
      const icon = result.success ? '\x1b[32m✓' : '\x1b[31m✗'
      const speed = result.success 
        ? `${formatMs(result.time)} (${result.count} candles)` 
        : result.error
      log(`    ${icon} ${interval.padEnd(6)} ${speed}\x1b[0m`)
      
      if (result.success) {
        benchmarks.klineFetch[interval].push(result.time)
        const issues = this.validateKlines(result.klines, 'BTCUSDT', interval)
        if (issues.length > 0) {
          for (const issue of issues) {
            log(`      └─ ${issue}`, '\x1b[33m')
          }
        }
      }
    }
    log('')

    // Test 4: Live ticker updates
    log('  [4/5] Live ticker test (10s window)...\n', '\x1b[33m')
    const tickerSymbols = ['BTCUSDT', 'ETHUSDT', 'EURUSD', 'XAUUSD', 'SPX']
    
    for (const sym of tickerSymbols) {
      this.subscribe(sym, undefined, false)
    }
    
    await new Promise(r => setTimeout(r, 10000))
    
    for (const sym of tickerSymbols) {
      const tick = this.tickerUpdates.get(sym)
      const icon = tick ? '\x1b[32m✓' : '\x1b[33m!'
      const info = tick 
        ? `Price: ${tick.price.toFixed(2)} | Change: ${tick.change >= 0 ? '+' : ''}${tick.change.toFixed(2)}%`
        : 'No update (market may be closed)'
      log(`    ${icon} ${sym.padEnd(12)} ${info}\x1b[0m`)
    }
    log('')

    // Test 5: Candle update streaming
    log('  [5/5] Candle update streaming...\n', '\x1b[33m')
    const candleCountBefore = this.candleUpdates.length
    await new Promise(r => setTimeout(r, 5000))
    const candleCountAfter = this.candleUpdates.length
    const newCandles = candleCountAfter - candleCountBefore

    if (newCandles > 0) {
      log(`    \x1b[32m✓ Received ${newCandles} candle updates in 5s\x1b[0m`)
      const bySymbol = {}
      for (const u of this.candleUpdates.slice(candleCountBefore)) {
        bySymbol[u.symbol] = (bySymbol[u.symbol] || 0) + 1
      }
      for (const [sym, count] of Object.entries(bySymbol)) {
        log(`      └─ ${sym}: ${count} updates`, '\x1b[90m')
      }
    } else {
      log(`    \x1b[33m! No candle updates (server may need time to generate)\x1b[0m`)
    }
    log('')

    // Print summary
    this.printSummary()
    
    this.ws.close()
  }

  printSummary() {
    log('\n  ═══════════════════════════════════════════════════════', '\x1b[36m')
    log('   SPEED & QUALITY REPORT', '\x1b[36m')
    log('  ═══════════════════════════════════════════════════════', '\x1b[36m')

    // Connection speed
    const connAvg = benchmarks.connection.reduce((a, b) => a + b, 0) / benchmarks.connection.length
    log(`\n   Connection:      ${formatMs(connAvg)} avg`)

    // Kline fetch speeds
    log('\n   Kline Fetch Speed:', '\x1b[36m')
    for (const [interval, times] of Object.entries(benchmarks.klineFetch)) {
      if (times.length === 0) continue
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const min = Math.min(...times)
      const max = Math.max(...times)
      const icon = avg < 2000 ? '\x1b[32m✓' : avg < 5000 ? '\x1b[33m!' : '\x1b[31m✗'
      log(`     ${icon} ${interval.padEnd(6)} Avg: ${formatMs(avg).padEnd(8)} Min: ${formatMs(min).padEnd(8)} Max: ${formatMs(max)}\x1b[0m`)
    }

    // Ticker latency
    if (benchmarks.tickerLatency.length > 0) {
      const avg = benchmarks.tickerLatency.reduce((a, b) => a + b, 0) / benchmarks.tickerLatency.length
      log(`\n   Ticker Latency:  ${formatMs(avg)} avg (${benchmarks.tickerLatency.length} samples)`)
    }

    // Quality issues
    log('\n   Data Quality:', '\x1b[36m')
    const totalIssues = 
      qualityChecks.priceSpikes.length +
      qualityChecks.staleData.length +
      qualityChecks.missingFields.length +
      qualityChecks.zeroPrices.length +
      qualityChecks.duplicateCandles.length

    if (totalIssues === 0) {
      log('     \x1b[32m✓ No data quality issues found\x1b[0m')
    } else {
      if (qualityChecks.priceSpikes.length > 0)
        log(`     \x1b[31m✗ Price spikes: ${qualityChecks.priceSpikes.length}\x1b[0m`)
      if (qualityChecks.staleData.length > 0)
        log(`     \x1b[33m! Stale data: ${qualityChecks.staleData.length}\x1b[0m`)
      if (qualityChecks.missingFields.length > 0)
        log(`     \x1b[31m✗ Missing fields: ${qualityChecks.missingFields.length}\x1b[0m`)
      if (qualityChecks.zeroPrices.length > 0)
        log(`     \x1b[31m✗ Zero prices: ${qualityChecks.zeroPrices.length}\x1b[0m`)
      if (qualityChecks.duplicateCandles.length > 0)
        log(`     \x1b[33m! Duplicates: ${qualityChecks.duplicateCandles.length}\x1b[0m`)
    }

    log('\n  ═══════════════════════════════════════════════════════\n')
  }
}

// ── Run ────────────────────────────────────────────────────
const test = new UI_marketTest()

try {
  await test.runAllTests()
} catch (err) {
  log(`\n  Fatal: ${err.message}`, '\x1b[31m')
  console.error(err)
}
