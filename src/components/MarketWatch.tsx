import { useState, useMemo, useRef, useEffect } from 'react'
import { useAllMarketPrices } from '../utils/useRealtime'
import { ALL_SYMBOLS } from '../utils/marketData'
import type { MarketType } from '../utils/marketData'

interface MarketWatchProps {
  onSelectSymbol: (symbol: string) => void
  activeSymbol: string
}

const GROUP_ORDER = ['Majors', 'Crosses', 'Exotics', 'Metals', 'Energy', 'Indices', 'Crypto']

const GROUP_ICONS: Record<string, string> = {
  Majors: '💱',
  Crosses: '🔄',
  Exotics: '🌍',
  Metals: '🥇',
  Energy: '⛽',
  Indices: '📈',
  Crypto: '₿',
}

const TYPE_COLORS: Record<MarketType, string> = {
  forex: '#2962ff',
  commodity: '#f59e0b',
  index: '#8b5cf6',
  crypto: '#f97316',
}

function formatPriceLocal(price: number, symbol: string): string {
  if (!price) return '—'
  if (symbol.includes('JPY') || symbol.includes('N225')) return price.toFixed(3)
  if (
    symbol.includes('BTC') || symbol.includes('ETH') ||
    symbol.includes('SPX') || symbol.includes('NDX') ||
    symbol.includes('DJI') || symbol.includes('XAU') ||
    symbol.includes('DAX') || symbol.includes('FTSE') ||
    symbol.endsWith('USDT')
  ) return price.toFixed(2)
  if (
    symbol.includes('XAG') || symbol.includes('SOL') ||
    symbol.includes('DOT') || symbol.includes('LINK')
  ) return price.toFixed(3)
  return price.toFixed(5)
}

export function MarketWatch({ onSelectSymbol, activeSymbol }: MarketWatchProps) {
  const { prices, connectionStatus } = useAllMarketPrices()
  const [search, setSearch] = useState('')
  const [activeGroup, setActiveGroup] = useState<string>('All')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const prevPrices = useRef<Record<string, number>>({})
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down'>>({})

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
    return GROUP_ORDER.map(groupKey => {
      let syms = ALL_SYMBOLS.filter(s => s.group === groupKey)
      if (q) syms = syms.filter(s =>
        s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      )
      if (activeGroup !== 'All' && activeGroup !== groupKey) return null
      if (syms.length === 0) return null
      return { key: groupKey, syms }
    }).filter(Boolean) as { key: string; syms: typeof ALL_SYMBOLS }[]
  }, [search, activeGroup])

  const totalLoaded = Object.keys(prices).length

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="mw-panel">
      {/* Header */}
      <div className="mw-header">
        <div className="mw-header-title">
          <span className="mw-header-icon">📊</span>
          <span>Market Watch</span>
          <div className="mw-status-dot" data-status={connectionStatus} title={connectionStatus} />
        </div>
        <span className="mw-count">{totalLoaded}/{ALL_SYMBOLS.length} live</span>
      </div>

      {/* Search */}
      <div className="mw-search">
        <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" className="mw-search-icon">
          <path d="M8 2a6 6 0 1 0 3.76 10.65l4.3 4.3a1 1 0 0 0 1.42-1.42l-4.3-4.3A6 6 0 0 0 8 2zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/>
        </svg>
        <input
          className="mw-search-input"
          placeholder="Search symbol..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="mw-search-clear" onClick={() => setSearch('')}>×</button>
        )}
      </div>

      {/* Group Filter Tabs */}
      <div className="mw-group-tabs">
        {['All', ...GROUP_ORDER].map(g => (
          <button
            key={g}
            className={`mw-group-tab ${activeGroup === g ? 'active' : ''}`}
            onClick={() => setActiveGroup(g)}
            title={g}
          >
            {g === 'All' ? '⊛' : GROUP_ICONS[g]}
          </button>
        ))}
      </div>

      {/* Table Header */}
      <div className="mw-table-head">
        <span>Symbol</span>
        <span>Price</span>
        <span>Chg%</span>
      </div>

      {/* Symbol List */}
      <div className="mw-list">
        {groups.map(group => {
          const isCollapsed = collapsed.has(group.key)
          return (
            <div key={group.key} className="mw-group">
              <button className="mw-group-header" onClick={() => toggleCollapse(group.key)}>
                <span className="mw-group-icon">{GROUP_ICONS[group.key]}</span>
                <span className="mw-group-name">{group.key}</span>
                <span className="mw-group-count">{group.syms.length}</span>
                <span className={`mw-group-chevron ${isCollapsed ? 'collapsed' : ''}`}>▾</span>
              </button>

              {!isCollapsed && group.syms.map(sym => {
                const tick = prices[sym.symbol]
                const isActive = sym.symbol === activeSymbol
                const flash = flashMap[sym.symbol]
                const isUp = (tick?.change ?? 0) >= 0
                return (
                  <div
                    key={sym.symbol}
                    className={`mw-row ${isActive ? 'active' : ''} ${flash ? `flash-${flash}` : ''}`}
                    onClick={() => onSelectSymbol(sym.symbol)}
                    title={sym.name}
                  >
                    {/* Symbol + type badge */}
                    <div className="mw-row-left">
                      <span
                        className="mw-row-badge"
                        style={{ background: TYPE_COLORS[sym.type] + '22', color: TYPE_COLORS[sym.type] }}
                      >
                        {sym.type === 'crypto' ? '₿' : sym.type === 'forex' ? '⇌' : sym.type === 'commodity' ? '◆' : '▲'}
                      </span>
                      <div className="mw-row-info">
                        <span className="mw-row-symbol">{sym.symbol}</span>
                        <span className="mw-row-name">{sym.name.split(' / ')[0]}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <span className={`mw-row-price ${flash ? `price-${flash}` : ''}`}>
                      {tick ? formatPriceLocal(tick.price, sym.symbol) : <span className="mw-loading">···</span>}
                    </span>

                    {/* Change % */}
                    <span className={`mw-row-change ${isUp ? 'up' : 'down'}`}>
                      {tick
                        ? `${isUp ? '+' : ''}${(tick.change ?? 0).toFixed(2)}%`
                        : <span className="mw-loading">···</span>
                      }
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
