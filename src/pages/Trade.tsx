import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout.tsx'
import { NativeChart } from '../components/NativeChart.tsx'
import { SymbolPicker } from '../components/SymbolPicker.tsx'
import { MarketWatch } from '../components/MarketWatch.tsx'
import { riskApi, tradingApi, accountApi } from '../utils/api.ts'
import { useRealtimePrices } from '../utils/useRealtime.ts'
import { getMultiplier } from '../utils/marketData.ts'
import { useToast } from '../contexts/ToastContext.tsx'

export default function TradePage() {
  const { id } = useParams<{ id: string }>()
  const [symbol, setSymbol] = useState('EURUSD')
  const [chartInterval, setChartInterval] = useState('3600')
  const [account, setAccount] = useState<any>(null)
  const [_risk, setRisk] = useState<any>(null)
  const [positions, setPositions] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const symbolsToTrack = Array.from(new Set([symbol, ...positions.map((p: any) => p.symbol)]))
  const { prices, connectionStatus } = useRealtimePrices(symbolsToTrack)
  const { addToast } = useToast()
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market')
  const [volume, setVolume] = useState('0.01')
  const [price, setPrice] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [orderError, setOrderError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions')

  useEffect(() => {
    if (!id) return
    accountApi.getById(id).then(setAccount).catch(() => {})
    riskApi.getStatus(id).then(setRisk).catch(() => {})
    tradingApi.getPositions(id).then(setPositions).catch(() => {})
    tradingApi.getOrders(id).then(setOrders).catch(() => {})
    tradingApi.getHistory(id).then(res => setHistory(res.data || [])).catch(() => {})

    const timerId = window.setInterval(() => {
      if (!id) return
      accountApi.getById(id).then(setAccount).catch(() => {})
      tradingApi.getPositions(id).then(setPositions).catch(() => {})
      tradingApi.getOrders(id).then(setOrders).catch(() => {})
      riskApi.getStatus(id).then(setRisk).catch(() => {})
    }, 5000)
    return () => window.clearInterval(timerId)
  }, [id])

  // Reset order fields when symbol changes to prevent stale SL/TP values
  useEffect(() => {
    setPrice('')
    setSl('')
    setTp('')
  }, [symbol])

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenPanel, setShowFullscreenPanel] = useState(false)
  const [showMarketWatch, setShowMarketWatch] = useState(true)

  // Modify Position State
  const [modifyingPosition, setModifyingPosition] = useState<any>(null)
  const [modifySl, setModifySl] = useState('')
  const [modifyTp, setModifyTp] = useState('')
  const [modifySubmitting, setModifySubmitting] = useState(false)

  // Partial Close State
  const [closingPosition, setClosingPosition] = useState<any>(null)
  const [closeVolume, setCloseVolume] = useState('')
  const [closeSubmitting, setCloseSubmitting] = useState(false)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement
      setIsFullscreen(isFull)
      if (!isFull) setShowFullscreenPanel(false)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handlePriceSelect = (p: number) => {
    const priceStr = p.toString()
    navigator.clipboard.writeText(priceStr).then(() => {
      addToast(`${priceStr} — copied`, 'success')
    }).catch(() => {
      addToast(`${priceStr} — select to fill`, 'success')
    })
    if (orderType !== 'market' && !price) {
      setPrice(priceStr)
    } else if (!sl) {
      setSl(priceStr)
    } else if (!tp) {
      setTp(priceStr)
    } else if (orderType !== 'market') {
      setPrice(priceStr)
    }
  }

  const handlePlaceOrder = async () => {
    if (!id) return
    if (orderType === 'market' && displayPrice == null) {
      addToast('No live price available. Cannot place market order.', 'error')
      return
    }
    setOrderError('')
    setSubmitting(true)
    try {
      const orderPrice = orderType === 'market' ? displayPrice! : (Number(price) || displayPrice || 0)
      await tradingApi.placeOrder({
        accountId: id,
        symbol,
        type: orderType,
        side,
        volume: Number(volume),
        price: orderPrice,
        stopLoss: sl ? Number(sl) : undefined,
        takeProfit: tp ? Number(tp) : undefined,
      })
      addToast(`${side.toUpperCase()} ${volume} ${symbol} order placed`, 'success')
      tradingApi.getPositions(id).then(setPositions).catch(() => {})
      riskApi.getStatus(id).then(setRisk).catch(() => {})
    } catch (err: any) {
      setOrderError(err.message || 'Failed to place order')
      addToast(err.message || 'Order failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const submitPartialClose = async () => {
    if (!id || !closingPosition) return
    setCloseSubmitting(true)
    try {
      const currentPrice = prices[closingPosition.symbol]?.price
      await tradingApi.closePosition(closingPosition.id, id, Number(closeVolume), currentPrice)
      addToast(Number(closeVolume) < Number(closingPosition.volume) ? 'Partial close successful' : 'Position closed', 'success')
      setClosingPosition(null)
      tradingApi.getPositions(id).then(setPositions).catch(() => {})
      riskApi.getStatus(id).then(setRisk).catch(() => {})
    } catch (err: any) {
      addToast(err.message || 'Failed to close', 'error')
    } finally {
      setCloseSubmitting(false)
    }
  }

  const submitModifyPosition = async () => {
    if (!id || !modifyingPosition) return
    setModifySubmitting(true)
    try {
      await tradingApi.modifyPosition(modifyingPosition.id, {
        accountId: id,
        stopLoss: modifySl ? Number(modifySl) : null,
        takeProfit: modifyTp ? Number(modifyTp) : null
      })
      addToast('Position modified successfully', 'success')
      setModifyingPosition(null)
      tradingApi.getPositions(id).then(setPositions).catch(() => {})
    } catch (err: any) {
      addToast(err.message || 'Failed to modify position', 'error')
    } finally {
      setModifySubmitting(false)
    }
  }

  const livePrice = prices[symbol]
  const displayPrice = livePrice?.price
  const displayChange = livePrice?.change ?? 0
  const isPositive = displayChange >= 0

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const priceAge = livePrice?.time ? now - livePrice.time : Infinity
  const isStale = connectionStatus === 'connected' && priceAge > 5000

  const formatPrice = (p: number) => {
    if (symbol.includes('JPY') || symbol.includes('N225')) return p.toFixed(3)
    if (symbol.includes('BTC') || symbol.includes('SPX') || symbol.includes('NDX') || symbol.includes('DJI') || symbol.includes('XAU')) return p.toFixed(2)
    if (symbol.includes('USDT')) return p.toFixed(2)
    return p.toFixed(5)
  }

  // Must match backend calculatePnL: diff * volume * contractSize
  // For pairs starting with USD (e.g. USDJPY), divide by close price to get USD
  const getContractSize = (sym: string) => {
    const m: Record<string, number> = {
      XAU: 100, XAG: 5000, USOIL: 1000, UKOIL: 1000, NGAS: 10000,
      SPX: 50, NDX: 20, DJI: 5,
      BTC: 1, ETH: 1, SOL: 1, BNB: 1, XRP: 1,
    }
    for (const [key, val] of Object.entries(m)) {
      if (sym.includes(key)) return val
    }
    return 100000
  }

  const calcPnl = (side: string, open: number, close: number, vol: number, sym: string) => {
    const diff = side === 'buy' ? (close - open) : (open - close)
    const contractSize = getContractSize(sym)
    let pnl = diff * vol * contractSize
    if (sym.startsWith('USD') && !sym.endsWith('USD') && close > 0) {
      pnl = pnl / close
    }
    return pnl
  }

  // ── Live PnL Engine ──
  const getLiveProfit = (p: any) => {
    const lp = prices[p.symbol]?.price
    if (!lp) return Number(p.profit)
    return calcPnl(p.side, Number(p.openPrice), lp, Number(p.volume), p.symbol)
  }

  const currentSymbolPositions = positions.filter((p: any) => p.symbol === symbol)

  const totalFloatingPnl = positions.reduce((sum, p) => sum + getLiveProfit(p), 0)
  const liveEquity = account ? Number(account.balance) + totalFloatingPnl : 0
  const liveMarginUsed = positions.reduce((sum, p) => sum + Number(p.margin), 0)
  const liveFreeMargin = liveEquity - liveMarginUsed

  // ── Smart Risk Calculator ──
  const riskAmount = sl && displayPrice && Number(sl) > 0
    ? Math.abs(displayPrice - Number(sl)) * Number(volume) * getMultiplier(symbol)
    : 0;
  const riskPercentage = liveEquity > 0 ? (riskAmount / liveEquity) * 100 : 0;

  return (
    <Layout noPadding>
      <div className={`trade-layout ${isFullscreen ? 'fullscreen-mode' : ''} ${showMarketWatch && !isFullscreen ? 'with-market-watch' : ''}`}>
        
        {/* ── Market Watch Panel ── */}
        {showMarketWatch && !isFullscreen && (
          <div className="trade-market-watch">
            <MarketWatch
              onSelectSymbol={(sym) => {
                setSymbol(sym)
                setPrice('')
                setSl('')
                setTp('')
              }}
              activeSymbol={symbol}
            />
          </div>
        )}
        {/* ── Main Chart Area ── */}
        <div className="trade-chart-area">
          {/* Top bar: symbol + intervals */}
          <div className="trade-topbar">
            {!isFullscreen && (
              <Link to={`/account/${id}`} className="trade-back-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Account
              </Link>
            )}

            <div className="trade-symbol-wrap">
              <SymbolPicker value={symbol} onChange={setSymbol} theme="dark" />
            </div>

            <div className="trade-intervals">
              {[
                { l: '1m', v: '60' }, { l: '5m', v: '300' }, { l: '15m', v: '900' },
                { l: '30m', v: '1800' }, { l: '1H', v: '3600' }, { l: '4H', v: '14400' },
                { l: '1D', v: 'D' }, { l: '1W', v: 'W' },
              ].map(i => (
                <button
                  key={i.v}
                  onClick={() => setChartInterval(i.v)}
                  className={`trade-interval-btn ${chartInterval === i.v ? 'active' : ''}`}
                >
                  {i.l}
                </button>
              ))}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Market Watch Toggle */}
              {!isFullscreen && (
                <button
                  onClick={() => setShowMarketWatch(v => !v)}
                  className={`trade-mw-toggle ${showMarketWatch ? 'active' : ''}`}
                  title={showMarketWatch ? 'Hide Market Watch' : 'Show Market Watch'}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                    <line x1="3" y1="9" x2="9" y2="9"/>
                    <line x1="3" y1="15" x2="9" y2="15"/>
                  </svg>
                  <span>Mkts</span>
                </button>
              )}
              {/* Connection status dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                  background: connectionStatus === 'connected' ? '#26a69a' : connectionStatus === 'connecting' ? '#ffb74d' : '#ef5350',
                }} />
                <span style={{ fontSize: 11, color: '#787b86' }}>
                  {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                </span>
              </div>
              {/* Price staleness warning */}
              {isStale && (
                <span style={{ fontSize: 11, color: '#ffb74d', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffb74d" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Stale
                </span>
              )}
              {displayPrice != null && (
                <div className="trade-topbar-price">
                  <span className="trade-topbar-price-val">{formatPrice(displayPrice)}</span>
                  <span className={`trade-topbar-change ${isPositive ? 'up' : 'down'}`}>
                    {isPositive ? '+' : ''}{displayChange.toFixed(2)}%
                  </span>
                </div>
              )}
              
              <button 
                onClick={toggleFullscreen} 
                className="trade-fullscreen-btn"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Chart"}
              >
                {isFullscreen ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                )}
              </button>

              {isFullscreen && (
                <button 
                  className={`trade-topbar-panel-toggle ${showFullscreenPanel ? 'active' : ''}`}
                  onClick={() => setShowFullscreenPanel(!showFullscreenPanel)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                  <span>Order Panel</span>
                </button>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="trade-chart-container">
            <NativeChart 
              symbol={symbol} 
              interval={chartInterval} 
              theme="dark" 
              positions={currentSymbolPositions}
              onPriceSelect={handlePriceSelect}
            />


          </div>

          {/* Bottom: Positions/Orders/History tabs */}
          <div className="trade-bottom-panel">
            <div className="trade-bottom-tabs">
              {(['positions', 'orders', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  className={`trade-bottom-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'positions' ? `Positions (${positions.length})` : tab === 'orders' ? 'Orders' : 'History'}
                </button>
              ))}
            </div>
            <div className="trade-bottom-content">
              {activeTab === 'positions' && (
                positions.length === 0 ? (
                  <div className="trade-empty">No open positions</div>
                ) : (
                  <div className="trade-positions-table">
                    <div className="trade-pos-header">
                      <span>Symbol</span><span>Side</span><span>Volume</span>
                      <span>Open Price</span><span>Current</span><span>SL</span><span>TP</span><span>P&L</span><span></span>
                    </div>
                    {positions.map((p: any) => {
                      const livePnl = getLiveProfit(p)
                      return (
                        <div key={p.id} className="trade-pos-row">
                          <span className="trade-pos-symbol">{p.symbol}</span>
                          <span className={`trade-pos-side ${p.side}`}>{p.side.toUpperCase()}</span>
                          <span>{p.volume}</span>
                          <span>{p.openPrice}</span>
                          <span>{prices[p.symbol]?.price ? formatPrice(prices[p.symbol].price) : '—'}</span>
                          <span>{p.stopLoss || '—'}</span>
                          <span>{p.takeProfit || '—'}</span>
                          <span className={`trade-pos-pnl ${livePnl >= 0 ? 'up' : 'down'}`}>
                            ${livePnl.toFixed(2)}
                          </span>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="trade-pos-close" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#d1d4dc' }} onClick={() => {
                              setModifyingPosition(p)
                              setModifySl(p.stopLoss || '')
                              setModifyTp(p.takeProfit || '')
                            }}>Modify</button>
                            <button className="trade-pos-close" onClick={() => {
                              setClosingPosition(p)
                              setCloseVolume(p.volume.toString())
                            }}>Close</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
              {activeTab === 'orders' && (
                orders.length === 0 ? (
                  <div className="trade-empty">No pending orders</div>
                ) : (
                  <div className="trade-positions-table">
                    <div className="trade-pos-header">
                      <span>Symbol</span><span>Type</span><span>Side</span><span>Volume</span>
                      <span>Target Price</span><span>SL</span><span>TP</span><span>Time</span><span></span>
                    </div>
                    {orders.map((o: any) => (
                      <div key={o.id} className="trade-pos-row">
                        <span className="trade-pos-symbol">{o.symbol}</span>
                        <span>{o.type.toUpperCase()}</span>
                        <span className={`trade-pos-side ${o.side}`}>{o.side.toUpperCase()}</span>
                        <span>{o.volume}</span>
                        <span>{o.price}</span>
                        <span>{o.stopLoss || '—'}</span>
                        <span>{o.takeProfit || '—'}</span>
                        <span>{new Date(o.createdAt).toLocaleString()}</span>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="trade-pos-close" onClick={async () => {
                            if (!id) return
                            try {
                              await tradingApi.cancelOrder(o.id, id)
                              addToast('Order cancelled', 'success')
                              tradingApi.getOrders(id).then(setOrders).catch(() => {})
                            } catch (err: any) {
                              addToast(err.message || 'Failed to cancel', 'error')
                            }
                          }}>Cancel</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
              {activeTab === 'history' && (
                history.length === 0 ? (
                  <div className="trade-empty">No trade history</div>
                ) : (
                  <div className="trade-positions-table">
                    <div className="trade-pos-header">
                      <span>Symbol</span><span>Side</span><span>Volume</span>
                      <span>Open Price</span><span>Close Price</span><span>Close Reason</span><span>P&L</span>
                    </div>
                    {history.map((h: any) => (
                      <div key={h.id} className="trade-pos-row">
                        <span className="trade-pos-symbol">{h.symbol}</span>
                        <span className={`trade-pos-side ${h.side}`}>{h.side.toUpperCase()}</span>
                        <span>{h.volume}</span>
                        <span>{h.openPrice}</span>
                        <span>{h.closePrice}</span>
                        <span>{h.closeReason || '—'}</span>
                        <span className={`trade-pos-pnl ${Number(h.profit) >= 0 ? 'up' : 'down'}`}>
                          {Number(h.profit) >= 0 ? '+' : ''}${Number(h.profit).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className={`trade-right-panel ${isFullscreen && showFullscreenPanel ? 'fullscreen-overlay' : ''}`}>
          
          {/* Fullscreen Overlay Header with Close Button */}
          {isFullscreen && showFullscreenPanel && (
            <div className="trade-panel-overlay-header">
              <span style={{ fontSize: 13, fontWeight: 600, color: '#d1d4dc' }}>Order Panel</span>
              <button 
                className="trade-panel-close-btn"
                onClick={() => setShowFullscreenPanel(false)}
                title="Close Panel"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}

          {/* Account Summary Card */}
          {account && (
            <div className="trade-account-card">
              <div className="trade-account-row">
                <span className="trade-account-label">Balance</span>
                <span className="trade-account-value">
                  ${Number(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="trade-account-row">
                <span className="trade-account-label">Equity</span>
                <span className={`trade-account-value ${totalFloatingPnl >= 0 ? 'text-up' : 'text-down'}`}>
                  ${liveEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="trade-account-divider" />
              <div className="trade-account-row">
                <span className="trade-account-label">Floating P&L</span>
                <span className={`trade-account-pnl ${totalFloatingPnl >= 0 ? 'up' : 'down'}`}>
                  {totalFloatingPnl >= 0 ? '+$' : '-$'}{Math.abs(totalFloatingPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="trade-account-row">
                <span className="trade-account-label">Margin Used</span>
                <span className="trade-account-value">${liveMarginUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="trade-account-row">
                <span className="trade-account-label">Free Margin</span>
                <span className="trade-account-value">${liveFreeMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {/* Order Panel */}
          <div className="trade-order-panel">
            {/* Symbol + Live Price Header */}
            <div className="trade-order-header">
              <div>
                <div className="trade-order-symbol">{symbol}</div>
                <div className={`trade-order-badge ${isPositive ? 'up' : 'down'}`}>
                  {isPositive ? '▲' : '▼'} LIVE
                </div>
              </div>
              {displayPrice != null ? (
                <div className="trade-order-price-block">
                  <div className="trade-order-live-price">{formatPrice(displayPrice)}</div>
                  <div className={`trade-order-change ${isPositive ? 'up' : 'down'}`}>
                    {isPositive ? '+' : ''}{displayChange.toFixed(2)}%
                  </div>
                </div>
              ) : isStale ? (
                <div className="trade-order-price-block">
                  <div className="trade-order-live-price" style={{ color: '#ffb74d' }}>{displayPrice ? formatPrice(displayPrice) : '—'}</div>
                  <div className="trade-order-change" style={{ color: '#ffb74d', fontSize: 10 }}>⚠ Stale</div>
                </div>
              ) : (
                <div className="trade-order-price-block">
                  <div className="trade-order-live-price" style={{ color: '#787b86' }}>Offline</div>
                </div>
              )}
            </div>

            {/* Buy / Sell Toggle */}
            <div className="trade-side-btns">
              <button
                className={`trade-side-btn buy ${side === 'buy' ? 'active' : ''}`}
                onClick={() => setSide('buy')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                BUY
              </button>
              <button
                className={`trade-side-btn sell ${side === 'sell' ? 'active' : ''}`}
                onClick={() => setSide('sell')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                SELL
              </button>
            </div>

            <div className="trade-order-type-btns">
              {(['market', 'limit', 'stop'] as const).map(t => (
                <button
                  key={t}
                  className={`trade-order-type-btn ${orderType === t ? 'active' : ''}`}
                  onClick={() => setOrderType(t)}
                >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>

            {/* Volume */}
            <div className="trade-field">
              <label className="trade-field-label">Volume (Lots)</label>
              <div className="trade-volume-row">
                <button className="trade-vol-btn" onClick={() => setVolume(v => Math.max(0.01, Number(v) - 0.01).toFixed(2))}>−</button>
                <input className="trade-field-input" value={volume} onChange={e => setVolume(e.target.value)} />
                <button className="trade-vol-btn" onClick={() => setVolume(v => (Number(v) + 0.01).toFixed(2))}>+</button>
              </div>
              <div className="trade-vol-presets">
                {['0.01', '0.05', '0.10', '0.50', '1.00'].map(v => (
                  <button key={v} className={`trade-vol-preset ${volume === v ? 'active' : ''}`} onClick={() => setVolume(v)}>{v}</button>
                ))}
              </div>
            </div>

            {/* Price (for limit/stop) */}
            {orderType !== 'market' && (
              <div className="trade-field">
                <label className="trade-field-label">Price</label>
                <div className="trade-input-with-icon">
                  <input className="trade-field-input" value={price} onChange={e => setPrice(e.target.value)} placeholder="Enter price" />
                  <button 
                    className="trade-copier-btn" 
                    onClick={() => displayPrice && setPrice(displayPrice.toString())}
                    title="Copy Live Price"
                  >🎯</button>
                </div>
              </div>
            )}

            {/* SL / TP */}
            <div className="trade-sl-tp-row">
              <div className="trade-field" style={{ flex: 1 }}>
                <label className="trade-field-label">Stop Loss</label>
                <div className="trade-input-with-icon">
                  <input className="trade-field-input" value={sl} onChange={e => setSl(e.target.value)} placeholder="SL" />
                  <button 
                    className="trade-copier-btn" 
                    onClick={() => displayPrice && setSl(displayPrice.toString())}
                    title="Copy Live Price"
                  >🎯</button>
                </div>
              </div>
              <div className="trade-field" style={{ flex: 1 }}>
                <label className="trade-field-label">Take Profit</label>
                <div className="trade-input-with-icon">
                  <input className="trade-field-input" value={tp} onChange={e => setTp(e.target.value)} placeholder="TP" />
                  <button 
                    className="trade-copier-btn" 
                    onClick={() => displayPrice && setTp(displayPrice.toString())}
                    title="Copy Live Price"
                  >🎯</button>
                </div>
              </div>
            </div>

            {/* Smart Risk Calculator Display */}
            {riskAmount > 0 && (
              <div className="trade-risk-calculator">
                <span>Risk: </span>
                <strong style={{ color: riskPercentage > 2 ? '#ef5350' : '#26a69a' }}>
                  ${riskAmount.toFixed(2)} ({riskPercentage.toFixed(2)}%)
                </strong>
                {riskPercentage > 2 && <div className="trade-risk-warning">⚠️ High Risk</div>}
              </div>
            )}

            {/* Error */}
            {orderError && <div className="trade-error">{orderError}</div>}

            <button
              className={`trade-submit-btn ${side}`}
              onClick={handlePlaceOrder}
              disabled={submitting || (orderType === 'market' && displayPrice == null)}
            >
              {submitting ? (
                <span className="trade-spinner" />
              ) : (
                <>
                  {side === 'buy' ? '▲' : '▼'} {side.toUpperCase()} {volume} {symbol}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modify Position Modal ── */}
      {modifyingPosition && (
        <div className="trade-modal-overlay">
          <div className="trade-modal">
            <div className="trade-modal-header">
              <h3>Modify Position {modifyingPosition.symbol}</h3>
              <button className="trade-modal-close" onClick={() => setModifyingPosition(null)}>×</button>
            </div>
            <div className="trade-modal-content">
              <div className="trade-field">
                <label className="trade-field-label">Stop Loss</label>
                <input className="trade-field-input" value={modifySl} onChange={e => setModifySl(e.target.value)} placeholder="0.0000" />
              </div>
              <div className="trade-field">
                <label className="trade-field-label">Take Profit</label>
                <input className="trade-field-input" value={modifyTp} onChange={e => setModifyTp(e.target.value)} placeholder="0.0000" />
              </div>
            </div>
            <div className="trade-modal-footer">
              <button className="trade-submit-btn buy" onClick={submitModifyPosition} disabled={modifySubmitting}>
                {modifySubmitting ? 'Saving...' : 'Save Modifications'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Close Position Modal ── */}
      {closingPosition && (
        <div className="trade-modal-overlay">
          <div className="trade-modal">
            <div className="trade-modal-header">
              <h3>Close {closingPosition.symbol}</h3>
              <button className="trade-modal-close" onClick={() => setClosingPosition(null)}>×</button>
            </div>
            <div className="trade-modal-content">
              <div className="trade-field">
                <label className="trade-field-label">Volume to Close (Max {closingPosition.volume})</label>
                <div className="trade-volume-row">
                  <button className="trade-vol-btn" onClick={() => setCloseVolume(v => Math.max(0.01, Number(v) - 0.01).toFixed(2))}>−</button>
                  <input className="trade-field-input" value={closeVolume} onChange={e => setCloseVolume(e.target.value)} />
                  <button className="trade-vol-btn" onClick={() => setCloseVolume(v => Math.min(Number(closingPosition.volume), Number(v) + 0.01).toFixed(2))}>+</button>
                </div>
              </div>
            </div>
            <div className="trade-modal-footer">
              <button className="trade-submit-btn sell" onClick={submitPartialClose} disabled={closeSubmitting}>
                {closeSubmitting ? 'Closing...' : `Close ${closeVolume} Lots`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
