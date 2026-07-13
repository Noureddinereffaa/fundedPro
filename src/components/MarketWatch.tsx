import { useState, useMemo, useRef, useEffect } from 'react'
import { useAllMarketPrices } from '../utils/useRealtime'
import { ALL_SYMBOLS } from '../utils/marketData'
import { formatPrice } from '../utils/trading'
import { useTranslation } from 'react-i18next'
import '../styles/market-watch.css'

interface MarketWatchProps {
  onSelectSymbol: (symbol: string) => void
  activeSymbol: string
}

const GROUP_ORDER = ['Crypto']

const GROUP_ICONS: Record<string, string> = {
  Crypto: '₿',
}

const TYPE_COLORS: Record<string, string> = {
  crypto: '#f97316',
}

export function MarketWatch({ onSelectSymbol, activeSymbol }: MarketWatchProps) {
  const { t } = useTranslation('trading')
  const { prices, connectionStatus } = useAllMarketPrices()
  const [search, setSearch] = useState('')
  const [activeGroup, setActiveGroup] = useState<string>(t('phrases.all'))
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down'>>({})
  const prevPrices = useRef<Record<string, number>>({})

  // Detect price direction changes for flash animation
  useEffect(() => {
    const newFlash: Record<string, 'up' | 'down'> = {}
    let changed = false
    Object.entries(prices).forEach(([sym, tick]) => {
      const prev = prevPrices.current[sym]
      if (prev !== undefined && prev !== tick.price) {
        newFlash[sym] = tick.price > prev ? 'up' : 'down'
        changed = true
      }
      prevPrices.current[sym] = tick.price
    })
    if (changed) {
      setFlashMap(newFlash)
      const t = setTimeout(() => setFlashMap({}), 500)
      return () => clearTimeout(t)
    }
  }, [prices])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return GROUP_ORDER.map((groupKey) => {
      let syms = ALL_SYMBOLS.filter((s) => s.group === groupKey)
      if (q) syms = syms.filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      if (activeGroup !== t('phrases.all') && activeGroup !== groupKey) return null
      if (syms.length === 0) return null
      return { key: groupKey, syms }
    }).filter(Boolean) as { key: string; syms: typeof ALL_SYMBOLS }[]
  }, [search, activeGroup])

  const totalLoaded = Object.keys(prices).length

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="mw-panel">
      {/* Header */}
      <div className="mw-header">
        <div className="mw-header-title">
          <span className="mw-header-icon">📊</span>
          <span>{t('phrases.marketsTitle')}</span>
          <div className="mw-status-dot" data-status={connectionStatus} title={connectionStatus} />
        </div>
        <span className="mw-count">
          {t('phrases.liveCount', { loaded: totalLoaded, total: ALL_SYMBOLS.length })}
        </span>
      </div>

      {/* Search */}
      <div className="mw-search">
        <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" className="mw-search-icon">
          <path d="M8 2a6 6 0 1 0 3.76 10.65l4.3 4.3a1 1 0 0 0 1.42-1.42l-4.3-4.3A6 6 0 0 0 8 2zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
        </svg>
        <input
          className="mw-search-input"
          placeholder={t('phrases.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="mw-search-clear" onClick={() => setSearch('')}>
            ×
          </button>
        )}
      </div>

      {/* Group Filter Tabs */}
      <div className="mw-group-tabs">
        {[t('phrases.all'), ...GROUP_ORDER].map((g) => (
          <button
            key={g}
            className={activeGroup === g ? 'active' : ''}
            onClick={() => setActiveGroup(g)}
          >
            {GROUP_ICONS[g] || ''} {g}
          </button>
        ))}
      </div>

      {/* Symbol List */}
      <div className="mw-list">
        {groups.map((g) => (
          <div key={g.key} className="mw-group">
            <button className="mw-group-header" onClick={() => toggleCollapse(g.key)}>
              <span className="mw-group-icon">{GROUP_ICONS[g.key] || '📁'}</span>
              <span className="mw-group-name">{g.key}</span>
              <span className="mw-group-count">{g.syms.length}</span>
              <span className={`mw-collapse-icon ${collapsed.has(g.key) ? 'collapsed' : ''}`}>▼</span>
            </button>
            {!collapsed.has(g.key) && (
              <div className="mw-group-symbols">
                {g.syms.map((sym) => {
                  const tick = prices[sym.symbol]
                  const isActive = sym.symbol === activeSymbol
                  const flash = flashMap[sym.symbol]
                  return (
                    <button
                      key={sym.symbol}
                      className={`mw-symbol-row ${isActive ? 'active' : ''} ${flash ? `flash-${flash}` : ''}`}
                      onClick={() => onSelectSymbol(sym.symbol)}
                    >
                      <div className="mw-sym-info">
                        <div className="mw-sym-main">
                          <span className="mw-sym-code">{sym.symbol}</span>
                          <span className="mw-sym-type" style={{ background: TYPE_COLORS[sym.type] }}>{sym.type}</span>
                        </div>
                        <div className="mw-sym-name">{sym.name}</div>
                      </div>
                      <div className="mw-sym-price">
                        {tick ? (
                          <>
                            <span className="mw-sym-price-val">{formatPrice(tick.price, sym.symbol)}</span>
                            <span className={`mw-sym-change ${tick.change >= 0 ? 'up' : 'down'}`}>
                              {tick.change >= 0 ? '+' : ''}{tick.change.toFixed(2)}%
                            </span>
                          </>
                        ) : (
                          <span className="mw-sym-loading">{t('phrases.loading')}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}