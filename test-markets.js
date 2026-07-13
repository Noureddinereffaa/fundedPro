/**
 * Pro FundX - Comprehensive Market Data Test Suite
 * 
 * Tests all market types: Forex, Crypto, Indices, Commodities
 * Measures: Response time, data quality, live updates, candle accuracy
 * 
 * Usage: node test-markets.js [--ws ws://localhost:3002]
 */

import WebSocket from 'ws'
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const symbols = JSON.parse(readFileSync(resolve(__dirname, 'shared', 'symbols.json'), 'utf-8'))

// ── Configuration ──────────────────────────────────────────
const WS_URL = process.argv.includes('--ws') 
  ? process.argv[process.argv.indexOf('--ws') + 1] 
  : 'ws://localhost:3002'

const TEST_INTERVALS = ['60', '300', '3600', 'D']
const LIVE_UPDATE_TIMEOUT = 10000 // 10s to wait for live update

// ── Test Results Storage ───────────────────────────────────
const results = {
  connection: { status: 'pending', time: 0 },
  markets: {},
  summary: { total: 0, passed: 0, failed: 0, warnings: 0 }
}

// ── Utility Functions ──────────────────────────────────────
function log(msg, color = '\x1b[0m') {
  console.log(`${color}${msg}\x1b[0m`)
}

function formatMs(ms) {
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`
}

function formatPrice(price, symbol) {
  const info = symbols[symbol]
  if (!info) return price.toFixed(2)
  const digits = info.digits || 2
  return price.toFixed(digits)
}

// ── Test Runner ────────────────────────────────────────────
class MarketTestSuite {
  constructor() {
    this.ws = null
    this.results = new Map()
    this.liveUpdates = new Map()
    this.pendingInitial = new Map()
  }

  connect() {
    return new Promise((resolve, reject) => {
      const start = Date.now()
      this.ws = new WebSocket(WS_URL)
      
      this.ws.on('open', () => {
        results.connection = { status: 'connected', time: Date.now() - start }
        log(`  Connected to ${WS_URL} in ${formatMs(results.connection.time)}`, '\x1b[32m')
        resolve()
      })
      
      this.ws.on('error', (err) => {
        results.connection = { status: 'error', error: err.message }
        reject(err)
      })
      
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString())
          this.handleMessage(msg)
        } catch {}
      })
    })
  }

  handleMessage(msg) {
    if (msg.type === 'initial') {
      const key = `${msg.symbol}_${msg.interval}`
      const pending = this.pendingInitial.get(key)
      if (pending) {
        pending.resolve(msg)
        this.pendingInitial.delete(key)
      }
    }
    
    if (msg.type === 'tick') {
      this.liveUpdates.set(msg.symbol, {
        price: msg.price,
        change: msg.change,
        time: Date.now()
      })
    }
    
    if (msg.type === 'candle' || msg.type === 'candle_update') {
      const key = `${msg.symbol}_${msg.interval}`
      const existing = this.liveUpdates.get(key + '_candle')
      if (!existing || msg.kline.time >= existing.time) {
        this.liveUpdates.set(key + '_candle', msg.kline)
      }
    }
  }

  fetchKlines(symbol, interval) {
    return new Promise((resolve, reject) => {
      const key = `${symbol}_${interval}`
      const timer = setTimeout(() => {
        this.pendingInitial.delete(key)
        reject(new Error('Timeout'))
      }, 15000)

      this.pendingInitial.set(key, {
        resolve: (data) => {
          clearTimeout(timer)
          resolve(data)
        }
      })

      this.ws.send(JSON.stringify({
        type: 'subscribe',
        symbols: [symbol],
        interval,
        needsInitial: true
      }))
    })
  }

  subscribeTicker(symbol) {
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      symbols: [symbol]
    }))
  }

  async testSymbol(symbol, intervals = ['60']) {
    const info = symbols[symbol]
    const marketType = info.type
    const marketGroup = info.group

    if (!results.markets[marketType]) {
      results.markets[marketType] = { groups: {}, stats: { total: 0, passed: 0, failed: 0 } }
    }
    if (!results.markets[marketType].groups[marketGroup]) {
      results.markets[marketType].groups[marketGroup] = { symbols: [], stats: { total: 0, passed: 0, failed: 0 } }
    }

    const testResult = {
      symbol,
      name: info.name,
      type: marketType,
      group: marketGroup,
      klines: {},
      ticker: { received: false, price: 0 },
      errors: []
    }

    results.summary.total++

    // Test 1: Kline data for each interval
    for (const interval of intervals) {
      try {
        const start = Date.now()
        const response = await this.fetchKlines(symbol, interval)
        const elapsed = Date.now() - start
        
        const klines = response.klines || []
        const hasData = klines.length > 0
        const lastKline = hasData ? klines[klines.length - 1] : null
        const firstKline = hasData ? klines[0] : null
        
        // Validate kline structure
        let valid = true
        const issues = []
        
        if (hasData) {
          if (!lastKline.time || !lastKline.open || !lastKline.close) {
            valid = false
            issues.push('Missing required fields (time/open/close)')
          }
          if (lastKline.high < lastKline.low) {
            valid = false
            issues.push('high < low')
          }
          if (klines.length < 10) {
            issues.push(`Low candle count: ${klines.length}`)
          }
          // Check price is reasonable (not 0 or negative)
          if (lastKline.close <= 0) {
            valid = false
            issues.push('Price is zero or negative')
          }
          // Check time is recent (within 24h for 1m candles)
          const nowSec = Math.floor(Date.now() / 1000)
          if (interval === '60' && (nowSec - lastKline.time) > 86400) {
            issues.push('Last candle older than 24h for 1m interval')
          }
        } else {
          valid = false
          issues.push('No kline data returned')
        }

        testResult.klines[interval] = {
          count: klines.length,
          responseTime: elapsed,
          valid,
          issues,
          lastPrice: lastKline ? lastKline.close : 0,
          firstTime: firstKline ? new Date(firstKline.time * 1000).toISOString() : null,
          lastTime: lastKline ? new Date(lastKline.time * 1000).toISOString() : null,
          serverPrice: response.price || 0
        }

        if (valid && elapsed < 5000) {
          testResult.klines[interval].status = 'PASS'
        } else if (valid) {
          testResult.klines[interval].status = 'SLOW'
          testResult.errors.push(`${interval}: Slow response (${formatMs(elapsed)})`)
        } else {
          testResult.klines[interval].status = 'FAIL'
          testResult.errors.push(`${interval}: ${issues.join(', ')}`)
        }
      } catch (err) {
        testResult.klines[interval] = {
          status: 'FAIL',
          count: 0,
          responseTime: 0,
          valid: false,
          issues: [err.message]
        }
        testResult.errors.push(`${interval}: ${err.message}`)
      }
    }

    // Test 2: Ticker subscription
    try {
      this.subscribeTicker(symbol)
      await new Promise(r => setTimeout(r, 3000))
      
      const tick = this.liveUpdates.get(symbol)
      if (tick && tick.price > 0) {
        testResult.ticker = {
          received: true,
          price: tick.price,
          change: tick.change,
          age: Date.now() - tick.time
        }
      } else {
        testResult.ticker = { received: false, price: 0 }
        testResult.errors.push('No ticker update received')
      }
    } catch (err) {
      testResult.ticker = { received: false, price: 0 }
      testResult.errors.push(`Ticker: ${err.message}`)
    }

    // Determine overall status
    const klineStatuses = Object.values(testResult.klines).map(k => k.status)
    if (testResult.errors.length === 0 && !klineStatuses.includes('FAIL')) {
      testResult.overall = 'PASS'
      results.summary.passed++
      results.markets[marketType].stats.passed++
      results.markets[marketType].groups[marketGroup].stats.passed++
    } else if (klineStatuses.includes('FAIL')) {
      testResult.overall = 'FAIL'
      results.summary.failed++
      results.markets[marketType].stats.failed++
      results.markets[marketType].groups[marketGroup].stats.failed++
    } else {
      testResult.overall = 'WARN'
      results.summary.warnings++
    }

    results.markets[marketType].stats.total++
    results.markets[marketType].groups[marketGroup].stats.total++
    results.markets[marketType].groups[marketGroup].symbols.push(testResult)

    return testResult
  }

  async runAllTests() {
    const startTime = Date.now()
    
    log('\n  ═══════════════════════════════════════════════════════', '\x1b[36m')
    log('   Pro FundX - Comprehensive Market Data Test Suite', '\x1b[36m')
    log('  ═══════════════════════════════════════════════════════', '\x1b[36m')
    log(`   WebSocket: ${WS_URL}`)
    log(`   Symbols:   ${Object.keys(symbols).length}`)
    log(`   Intervals: ${TEST_INTERVALS.join(', ')}`)
    log('  ───────────────────────────────────────────────────────\n')

    // Connect
    log('  [1/4] Connecting to WebSocket server...', '\x1b[33m')
    try {
      await this.connect()
    } catch (err) {
      log(`  FAILED: Cannot connect to ${WS_URL}`, '\x1b[31m')
      log(`  ${err.message}`, '\x1b[31m')
      log('\n  Make sure the WS server is running: node server/index.js', '\x1b[33m')
      return results
    }

    // Test each market type
    const marketTypes = ['crypto', 'forex', 'commodity', 'index']
    
    log('\n  [2/4] Testing market data...\n', '\x1b[33m')

    for (const marketType of marketTypes) {
      const marketSymbols = Object.entries(symbols)
        .filter(([_, info]) => info.type === marketType)
        .map(([sym]) => sym)

      if (marketSymbols.length === 0) continue

      log(`  ── ${marketType.toUpperCase()} (${marketSymbols.length} symbols) ──`, '\x1b[36m')

      // Test 2-3 representative symbols per market type (not all to save time)
      const testSymbols = marketSymbols.length > 6 
        ? marketSymbols.slice(0, 6) 
        : marketSymbols

      for (const symbol of testSymbols) {
        const result = await this.testSymbol(symbol, TEST_INTERVALS)
        this.printSymbolResult(result)
      }

      log('')
    }

    // Test live updates
    log('\n  [3/4] Testing live updates (5s window)...\n', '\x1b[33m')
    await this.testLiveUpdates()

    // Print summary
    const elapsed = Date.now() - startTime
    this.printSummary(elapsed)

    return results
  }

  printSymbolResult(result) {
    const icon = result.overall === 'PASS' ? '\x1b[32m✓' 
      : result.overall === 'FAIL' ? '\x1b[31m✗' 
      : '\x1b[33m!'
    
    const price = result.ticker.received 
      ? formatPrice(result.ticker.price, result.symbol)
      : '---'
    
    const klineInfo = Object.entries(result.klines)
      .map(([int, k]) => `${int}:${k.status === 'PASS' ? k.count : k.status}`)
      .join(' ')

    log(`    ${icon} ${result.symbol.padEnd(12)} ${price.padStart(12)}  ${klineInfo}\x1b[0m`)
    
    if (result.errors.length > 0) {
      for (const err of result.errors) {
        log(`      └─ ${err}`, '\x1b[31m')
      }
    }
  }

  async testLiveUpdates() {
    const testSymbols = ['BTCUSDT', 'EURUSD', 'XAUUSD', 'SPX']
    const liveResults = []

    for (const symbol of testSymbols) {
      this.subscribeTicker(symbol)
      
      const before = this.liveUpdates.get(symbol)
      await new Promise(r => setTimeout(r, 5000))
      const after = this.liveUpdates.get(symbol)

      const updated = after && (!before || after.time > before.time)
      liveResults.push({ symbol, updated, price: after?.price || 0 })
      
      const icon = updated ? '\x1b[32m✓' : '\x1b[33m!'
      log(`    ${icon} ${symbol.padEnd(12)} ${updated ? 'Live updates OK' : 'No updates (market may be closed)'}\x1b[0m`)
    }

    return liveResults
  }

  printSummary(elapsed) {
    log('\n  ═══════════════════════════════════════════════════════', '\x1b[36m')
    log('   TEST RESULTS SUMMARY', '\x1b[36m')
    log('  ═══════════════════════════════════════════════════════', '\x1b[36m')
    
    log(`\n   Total Time:    ${formatMs(elapsed)}`)
    log(`   Total Symbols: ${results.summary.total}`)
    log(`   Passed:        ${results.summary.passed}`, '\x1b[32m')
    log(`   Failed:        ${results.summary.failed}`, results.summary.failed > 0 ? '\x1b[31m' : '\x1b[32m')
    log(`   Warnings:      ${results.summary.warnings}`, results.summary.warnings > 0 ? '\x1b[33m' : '\x1b[32m')
    
    log('\n   By Market Type:', '\x1b[36m')
    for (const [type, data] of Object.entries(results.markets)) {
      const { passed, failed, total } = data.stats
      const icon = failed === 0 ? '\x1b[32m✓' : '\x1b[31m✗'
      log(`     ${icon} ${type.padEnd(12)} ${passed}/${total} passed\x1b[0m`)
      
      for (const [group, gData] of Object.entries(data.groups)) {
        const gi = gData.stats.failed === 0 ? '\x1b[32m  ✓' : '\x1b[31m  ✗'
        log(`${gi} ${group.padEnd(14)} ${gData.stats.passed}/${gData.stats.total}\x1b[0m`)
      }
    }

    // Save detailed report
    const reportPath = resolve(__dirname, 'logs', 'test-report.json')
    try {
      mkdirSync(resolve(__dirname, 'logs'), { recursive: true })
      writeFileSync(reportPath, JSON.stringify(results, null, 2))
      log(`\n   Detailed report: ${reportPath}`, '\x1b[90m')
    } catch {}

    log('\n  ═══════════════════════════════════════════════════════\n')

    // Exit code
    if (results.summary.failed > 0) {
      process.exit(1)
    }
  }

  close() {
    if (this.ws) {
      this.ws.close()
    }
  }
}

// ── Run ────────────────────────────────────────────────────
const suite = new MarketTestSuite()

try {
  await suite.runAllTests()
} catch (err) {
  log(`\n  Fatal error: ${err.message}`, '\x1b[31m')
  console.error(err)
} finally {
  suite.close()
  // Give time for WS close
  await new Promise(r => setTimeout(r, 500))
}
