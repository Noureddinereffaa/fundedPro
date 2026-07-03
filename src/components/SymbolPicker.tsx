import { useState, useRef, useEffect, useMemo } from 'react'
import { ALL_SYMBOLS } from '../utils/marketData'

interface SymbolPickerProps {
  value: string
  onChange: (symbol: string) => void
  theme: 'dark' | 'light'
}

interface GroupConfig {
  label: string
  key: string
  symbols: typeof ALL_SYMBOLS
}

const GROUP_ORDER = ['Majors', 'Crosses', 'Exotics', 'Metals', 'Energy', 'Indices', 'Crypto']

const GROUP_LABELS: Record<string, string> = {
  Majors: 'Forex Majors',
  Crosses: 'Forex Crosses',
  Exotics: 'Forex Exotics',
  Metals: 'Metals',
  Energy: 'Energy',
  Indices: 'Indices',
  Crypto: 'Crypto',
}

export function SymbolPicker({ value, onChange, theme }: SymbolPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => {
    const filtered = search.trim()
      ? ALL_SYMBOLS.filter(s =>
          s.symbol.toLowerCase().includes(search.toLowerCase()) ||
          s.name.toLowerCase().includes(search.toLowerCase())
        )
      : ALL_SYMBOLS

    const grouped: GroupConfig[] = []
    for (const key of GROUP_ORDER) {
      const symbols = filtered.filter(s => s.group === key)
      if (symbols.length > 0) {
        grouped.push({ label: GROUP_LABELS[key] || key, key, symbols })
      }
    }
    return grouped
  }, [search])

  const flatList = useMemo(() => {
    const items: { group: string; symbol: string }[] = []
    for (const g of groups) {
      for (const s of g.symbols) {
        items.push({ group: g.key, symbol: s.symbol })
      }
    }
    return items
  }, [groups])

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setFocusedIndex(0)
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  useEffect(() => {
    if (listRef.current && focusedIndex >= 0) {
      const items = listRef.current.querySelectorAll<HTMLDivElement>('.sp-item')
      items[focusedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(i + 1, flatList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flatList[focusedIndex]) {
      onChange(flatList[focusedIndex].symbol)
      setIsOpen(false)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const activeSymbol = ALL_SYMBOLS.find(s => s.symbol === value)

  return (
    <div ref={containerRef} className="symbol-picker">
      <button
        className="sp-trigger"
        onClick={() => setIsOpen(v => !v)}
        title={activeSymbol?.name || value}
      >
        <span className="sp-trigger-symbol">{value}</span>
        <span className="sp-trigger-name">{activeSymbol?.name || ''}</span>
        <span className={`sp-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className={`sp-dropdown ${theme}`}>
          <div className="sp-search">
            <svg className="sp-search-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path d="M8 2a6 6 0 1 0 3.76 10.65l4.3 4.3a1 1 0 0 0 1.42-1.42l-4.3-4.3A6 6 0 0 0 8 2zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              className="sp-search-input"
              placeholder="Search markets..."
              value={search}
              onChange={e => { setSearch(e.target.value); setFocusedIndex(0) }}
              onKeyDown={handleKeyDown}
            />
            {search && (
              <button className="sp-search-clear" onClick={() => setSearch('')}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                  <path d="M10 8.586l4.95-4.95 1.414 1.414L11.414 10l4.95 4.95-1.414 1.414L10 11.414l-4.95 4.95-1.414-1.414L8.586 10 3.636 5.05 5.05 3.636 10 8.586z"/>
                </svg>
              </button>
            )}
          </div>

          <div ref={listRef} className="sp-list" onKeyDown={handleKeyDown}>
            {groups.length === 0 ? (
              <div className="sp-empty">No markets found</div>
            ) : (
              groups.map((group, gi) => {
                let globalIndex = 0
                for (let i = 0; i < gi; i++) globalIndex += groups[i].symbols.length

                return (
                  <div key={group.key} className="sp-group">
                    <div className="sp-group-label">{group.label}</div>
                    {group.symbols.map((sym, si) => {
                      const idx = globalIndex + si
                      const isActive = sym.symbol === value
                      const isFocused = idx === focusedIndex
                      return (
                        <div
                          key={sym.symbol}
                          className={`sp-item ${isActive ? 'active' : ''} ${isFocused ? 'focused' : ''}`}
                          onClick={() => { onChange(sym.symbol); setIsOpen(false) }}
                          onMouseEnter={() => setFocusedIndex(idx)}
                        >
                          <div className="sp-item-left">
                            <span className="sp-item-symbol">{sym.symbol}</span>
                            <span className="sp-item-name">{sym.name}</span>
                          </div>
                          <div className={`sp-item-badge ${sym.type}`}>{sym.type.toUpperCase()}</div>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>

          <div className="sp-footer">
            {flatList.length} markets
          </div>
        </div>
      )}
    </div>
  )
}
