import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HistoryTable from '../components/trade/HistoryTable.tsx'

const mockHistory = [
  {
    id: 'h1',
    accountId: 'a1',
    symbol: 'EURUSD',
    side: 'buy' as const,
    volume: 0.1,
    openPrice: 1.105,
    closePrice: 1.11,
    closeReason: 'TP',
    profit: 50.0,
    openTime: '2025-01-15T09:00:00Z',
    closeTime: '2025-01-15T10:00:00Z',
  },
  {
    id: 'h2',
    accountId: 'a1',
    symbol: 'GBPUSD',
    side: 'sell' as const,
    volume: 0.2,
    openPrice: 1.265,
    closePrice: 1.26,
    closeReason: 'SL',
    profit: -100.0,
    openTime: '2025-01-15T09:30:00Z',
    closeTime: '2025-01-15T10:30:00Z',
  },
]

const defaultProps = { page: 1, totalPages: 1, onPageChange: vi.fn() }

describe('HistoryTable', () => {
  it('shows empty message when no history', () => {
    render(<HistoryTable history={[]} {...defaultProps} />)
    expect(screen.getByText('No trade history')).toBeInTheDocument()
  })

  it('renders history rows', () => {
    render(<HistoryTable history={mockHistory} {...defaultProps} />)
    expect(screen.getAllByText('EURUSD').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('GBPUSD')).toBeInTheDocument()
    expect(screen.getByText('BUY')).toBeInTheDocument()
    expect(screen.getByText('SELL')).toBeInTheDocument()
  })

  it('renders close reasons', () => {
    render(<HistoryTable history={mockHistory} {...defaultProps} />)
    expect(screen.getByText('TP')).toBeInTheDocument()
    expect(screen.getByText('SL')).toBeInTheDocument()
  })

  it('renders P&L values with sign', () => {
    render(<HistoryTable history={mockHistory} {...defaultProps} />)
    const posElements = screen.getAllByText((c) => c.includes('+') && c.includes('50.00'))
    expect(posElements.length).toBeGreaterThanOrEqual(1)
    const negElements = screen.getAllByText((c) => c.includes('-100.00'))
    expect(negElements.length).toBeGreaterThanOrEqual(1)
  })

  it('renders open and close prices', () => {
    render(<HistoryTable history={[mockHistory[0]]} {...defaultProps} />)
    expect(screen.getByText('1.105')).toBeInTheDocument()
    expect(screen.getByText('1.11')).toBeInTheDocument()
  })

  it('shows dash for missing close reason', () => {
    const { closeReason: _cr, ...h } = mockHistory[0]
    render(<HistoryTable history={[h]} {...defaultProps} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it('renders stats summary', () => {
    render(<HistoryTable history={mockHistory} {...defaultProps} />)
    expect(screen.getByText('Total Trades')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
    expect(screen.getByText('Total P&L')).toBeInTheDocument()
  })

  it('renders pagination when multiple pages', () => {
    render(<HistoryTable history={mockHistory} page={1} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('Next →')).toBeInTheDocument()
  })
})
